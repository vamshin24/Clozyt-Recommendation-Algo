#!/usr/bin/env python3
"""
Embeds catalog items with Fashion-CLIP (or an open_clip fallback) and upserts to Qdrant.

Usage example:
    python scripts/embed_and_upsert.py \
        --input src/mock/items.json \
        --collection clozyt_items \
        --vector-name fashion_clip \
        --dim 512

Add --dry-run to skip the Qdrant upsert and instead emit artifacts locally.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import List, Optional, Sequence, Tuple
from urllib.request import Request, urlopen
from uuid import NAMESPACE_DNS, uuid5

import numpy as np
from PIL import Image
from tqdm import tqdm

try:
    import torch
    import torch.nn.functional as F
except Exception as exc:  # pragma: no cover - runtime import validation
    raise SystemExit("torch is required for this script") from exc


try:
    from fashion_clip.fashion_clip import FashionCLIP

    class FashionClipEncoder:
        def __init__(self, device: torch.device, image_batch: int, text_batch: int):
            self.device = device
            self.image_batch = image_batch
            self.text_batch = text_batch
            self.model = FashionCLIP("fashion-clip")

        def encode_images(self, images: Sequence[Image.Image]) -> np.ndarray:
            embeddings: List[np.ndarray] = []
            for start in range(0, len(images), self.image_batch):
                batch = list(images[start : start + self.image_batch])
                if not batch:
                    continue
                embs = self.model.encode_images(batch, batch_size=len(batch))
                if isinstance(embs, torch.Tensor):
                    embs = embs.detach().cpu().numpy()
                else:
                    embs = np.asarray(embs)
                embeddings.extend(embs)
            if not embeddings:
                return np.zeros((0, 0), dtype=np.float32)
            return np.stack(embeddings).astype(np.float32)

        def encode_texts(self, texts: Sequence[str]) -> np.ndarray:
            embeddings: List[np.ndarray] = []
            for start in range(0, len(texts), self.text_batch):
                batch = list(texts[start : start + self.text_batch])
                if not batch:
                    continue
                embs = self.model.encode_text(batch, batch_size=len(batch))
                if isinstance(embs, torch.Tensor):
                    embs = embs.detach().cpu().numpy()
                else:
                    embs = np.asarray(embs)
                embeddings.extend(embs)
            if not embeddings:
                return np.zeros((0, 0), dtype=np.float32)
            return np.stack(embeddings).astype(np.float32)

    EncoderFactory = FashionClipEncoder
    ENCODER_BACKEND = "fashion_clip"
except Exception:  # pragma: no cover - optional dependency fallback
    import open_clip

    class OpenClipEncoder:
        def __init__(self, device: torch.device, image_batch: int, text_batch: int):
            self.device = device
            self.image_batch = image_batch
            self.text_batch = text_batch
            self.model, _, self.preprocess = open_clip.create_model_and_transforms(
                "ViT-B-32", pretrained="hf-hub:patrickjohncyh/fashion-clip"
            )
            self.model.to(self.device)
            self.model.eval()
            self.tokenizer = open_clip.get_tokenizer("ViT-B-32")

        def encode_images(self, images: Sequence[Image.Image]) -> np.ndarray:
            features: List[np.ndarray] = []
            for start in range(0, len(images), self.image_batch):
                batch_imgs = list(images[start : start + self.image_batch])
                if not batch_imgs:
                    continue
                inputs = torch.stack([self.preprocess(img) for img in batch_imgs]).to(self.device)
                with torch.no_grad():
                    feats = self.model.encode_image(inputs)
                    feats = F.normalize(feats, dim=-1)
                features.extend(feats.cpu().numpy())
            if not features:
                return np.zeros((0, 0), dtype=np.float32)
            return np.stack(features).astype(np.float32)

        def encode_texts(self, texts: Sequence[str]) -> np.ndarray:
            features: List[np.ndarray] = []
            for start in range(0, len(texts), self.text_batch):
                batch = list(texts[start : start + self.text_batch])
                if not batch:
                    continue
                tokens = self.tokenizer(batch).to(self.device)
                with torch.no_grad():
                    feats = self.model.encode_text(tokens)
                    feats = F.normalize(feats, dim=-1)
                features.extend(feats.cpu().numpy())
            if not features:
                return np.zeros((0, 0), dtype=np.float32)
            return np.stack(features).astype(np.float32)

    EncoderFactory = OpenClipEncoder
    ENCODER_BACKEND = "open_clip"


@dataclass
class ItemRecord:
    uid: str
    name: str
    brand: str
    price: float
    discount: float
    available_size: List[str]
    image_url: str

    @classmethod
    def from_dict(cls, data: dict) -> "ItemRecord":
        raw_uid = data.get("uid") or data.get("item_id")
        uid = str(raw_uid).strip() if raw_uid is not None else ""
        if not uid:
            raise ValueError("Item uid is required")
        name = str(data.get("name") or data.get("title") or "").strip()
        brand = str(data.get("brand") or "").strip()
        image_url = str(data.get("image_url") or "").strip()
        discount = float(data.get("discount") or 0.0)
        price_str = str(data.get("price") or data.get("price_usd") or "0").strip()
        price_clean = price_str.replace("$", "").replace(",", "")
        try:
            price = float(price_clean)
        except ValueError:
            price = 0.0
        size_value = data.get("available_size") or data.get("sizes") or ""
        sizes = [part.strip() for part in str(size_value).split(",") if part.strip() and part.strip().upper() != "N/A"]
        return cls(
            uid=uid,
            name=name,
            brand=brand,
            price=price,
            discount=discount,
            available_size=sizes,
            image_url=image_url,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Embed and upsert catalog items into Qdrant")
    parser.add_argument("--input", required=True, help="Path to items JSON file")
    parser.add_argument("--collection", required=True, help="Qdrant collection name")
    parser.add_argument("--vector-name", required=True, help="Qdrant vector name")
    parser.add_argument("--dim", required=True, type=int, help="Embedding dimensionality")
    parser.add_argument("--qdrant-url", default=os.environ.get("QDRANT_URL", "http://localhost:6333"))
    parser.add_argument("--image-batch", type=int, default=64)
    parser.add_argument("--text-batch", type=int, default=128)
    parser.add_argument("--upsert-batch", type=int, default=256)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Skip Qdrant writes and emit fused vectors (.npy) and payloads (.ndjson) locally",
    )
    parser.add_argument(
        "--output-dir",
        default="artifacts",
        help="Directory for dry-run artifacts (relative to project root)",
    )
    return parser.parse_args()


def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )


def load_items(path: str) -> List[ItemRecord]:
    with open(path, "r", encoding="utf-8") as handle:
        raw = json.load(handle)
    if not isinstance(raw, list):
        raise ValueError("Expected items.json to contain a list")
    items: List[ItemRecord] = []
    for entry in raw:
        try:
            items.append(ItemRecord.from_dict(entry))
        except Exception as exc:
            logging.warning("Skipping invalid item: %s", exc)
    if not items:
        raise ValueError("No valid items found in dataset")
    logging.info("Loaded %d catalog items", len(items))
    return items


def fetch_image(url: str, timeout: int = 10, retries: int = 3) -> Optional[Image.Image]:
    if not url:
        return None
    headers = {"User-Agent": "ClozytEmbedder/1.0"}
    for attempt in range(retries):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=timeout) as response:
                data = response.read()
            image = Image.open(BytesIO(data)).convert("RGB")
            return image
        except Exception as exc:
            wait_time = 1.5 * (attempt + 1)
            logging.warning("Image fetch failed (%s). retrying in %.1fs", exc, wait_time)
            time.sleep(wait_time)
    logging.error("Failed to fetch image after %d retries: %s", retries, url)
    return None


def encode_images(encoder: EncoderFactory, items: Sequence[ItemRecord], dim: int) -> np.ndarray:
    logging.info("Encoding images with %s backend", ENCODER_BACKEND)
    collected: List[Tuple[int, Optional[Image.Image]]] = []
    for idx, item in enumerate(tqdm(items, desc="download-images")):
        image = fetch_image(item.image_url)
        collected.append((idx, image))

    valid_entries = [(idx, img) for idx, img in collected if img is not None]
    result = np.zeros((len(items), dim), dtype=np.float32)

    if not valid_entries:
        logging.warning("No images could be downloaded; image embeddings will be zeros")
        return result

    ordered_images = [img for _, img in valid_entries if img is not None]
    embeddings = encoder.encode_images(ordered_images)
    if embeddings.shape[1] != dim:
        raise SystemExit(
            f"Image embedding dimension mismatch: expected {dim}, got {embeddings.shape[1]}"
        )

    for (idx, _), vector in zip(valid_entries, embeddings):
        result[idx] = vector
    return result


def encode_texts(encoder: EncoderFactory, items: Sequence[ItemRecord], dim: int) -> np.ndarray:
    logging.info("Encoding titles (%s backend)", ENCODER_BACKEND)
    texts = [item.name or item.brand or item.uid for item in items]
    embeddings = encoder.encode_texts(texts)
    if embeddings.shape[1] != dim:
        raise SystemExit(
            f"Text embedding dimension mismatch: expected {dim}, got {embeddings.shape[1]}"
        )
    return embeddings


def l2_normalize(vectors: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vectors / norms


def fuse_vectors(image_vecs: np.ndarray, text_vecs: np.ndarray) -> np.ndarray:
    fused = 0.7 * image_vecs + 0.3 * text_vecs
    return l2_normalize(fused)


def ensure_collection(client, collection: str, vector_name: str, dim: int):
    from qdrant_client import QdrantClient
    from qdrant_client.http import models as rest

    if not isinstance(client, QdrantClient):
        raise TypeError("client must be an instance of QdrantClient")

    if not client.collection_exists(collection_name=collection):
        logging.info("Creating Qdrant collection '%s'", collection)
        client.create_collection(
            collection_name=collection,
            vectors_config={
                vector_name: rest.VectorParams(size=dim, distance=rest.Distance.COSINE)
            },
            hnsw_config=rest.HnswConfigDiff(m=16, ef_construct=200),
        )


def upsert_vectors(
    client,
    collection: str,
    vector_name: str,
    items: Sequence[ItemRecord],
    vectors: np.ndarray,
    batch_size: int,
):
    from qdrant_client.http import models as rest

    payloads = []
    for item in items:
        payloads.append(
            {
                "uid": item.uid,
                "name": item.name,
                "brand": item.brand,
                "price_value": item.price,
                "discount": item.discount,
                "available_size": item.available_size,
                "image_url": item.image_url,
            }
        )

    total = len(items)
    for start in range(0, total, batch_size):
        end = min(start + batch_size, total)
        chunk_vectors = vectors[start:end]
        chunk_items = items[start:end]
        chunk_payloads = payloads[start:end]
        points = []
        for i, item in enumerate(chunk_items):
            point_id = str(uuid5(NAMESPACE_DNS, item.uid))
            vector_values = [float(x) for x in chunk_vectors[i]]
            points.append(
                rest.PointStruct(
                    id=point_id,
                    vector={vector_name: vector_values},
                    payload=chunk_payloads[i],
                )
            )
        client.upsert(collection_name=collection, points=points)
        logging.info("Upserted %d/%d items", end, total)


def emit_artifacts(output_dir: Path, vectors: np.ndarray, items: Sequence[ItemRecord]):
    output_dir.mkdir(parents=True, exist_ok=True)
    embeddings_path = output_dir / "embeddings.npy"
    payload_path = output_dir / "payload.ndjson"
    np.save(embeddings_path, vectors)
    with open(payload_path, "w", encoding="utf-8") as handle:
        for item in items:
            payload = {
                "uid": item.uid,
                "name": item.name,
                "brand": item.brand,
                "price_value": item.price,
                "discount": item.discount,
                "available_size": item.available_size,
                "image_url": item.image_url,
            }
            handle.write(json.dumps(payload) + "\n")
    logging.info("Dry-run artifacts written to %s", output_dir)


if __name__ == "__main__":
    args = parse_args()
    setup_logging()

    logging.info("Using %s backend", ENCODER_BACKEND)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    encoder = EncoderFactory(device=device, image_batch=args.image_batch, text_batch=args.text_batch)

    items = load_items(args.input)
    image_vectors = encode_images(encoder, items, args.dim)
    text_vectors = encode_texts(encoder, items, args.dim)

    fused_vectors = fuse_vectors(image_vectors, text_vectors)
    np.nan_to_num(fused_vectors, copy=False)

    if args.dry_run:
        output_dir = Path(args.output_dir)
        emit_artifacts(output_dir, fused_vectors, items)
        sys.exit(0)

    from qdrant_client import QdrantClient

    client = QdrantClient(url=args.qdrant_url)
    ensure_collection(client, args.collection, args.vector_name, args.dim)
    upsert_vectors(client, args.collection, args.vector_name, items, fused_vectors, args.upsert_batch)
    logging.info("Finished upserting %d items into Qdrant", len(items))
