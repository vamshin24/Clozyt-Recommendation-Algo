# Clozyt Recommendation Demo

A swipe-to-shop prototype built with Next.js (App Router) that streams curated product packets, captures user feedback, and closes the loop with a Qdrant vector search backend. The app ships as a progressive web app with offline-friendly caching, persistent client state, and tooling to embed catalog data before ingestion.

## Features

- Swipe deck with gesture + keyboard controls, batched prefetching, and inline filters for gender, price, brand, and size.
- Feedback pipeline that buffers interactions (likes, dislikes, add-to-cart) and updates in-memory user centroids to steer future packets.
- Qdrant-powered retrieval with popularity-based fallbacks, seen-item deduping, and adaptive top-M selection per user.
- PWA setup (service worker, manifest, installable icons) with caching strategies for navigation, APIs, and remote product imagery.
- Tooling to embed catalog data with Fashion-CLIP/OpenCLIP and upsert vectors + payloads into Qdrant.

## Prerequisites

- Node.js 20.x (or newer) and npm 10+
- Docker (for the bundled Qdrant instance) or an existing Qdrant deployment
- Python 3.10+ with `pip` and a working `torch` install (CUDA optional) for the embedding script

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Provision environment variables** – create `.env.local` and set:
   ```bash
   QDRANT_URL=http://localhost:6333
   QDRANT_COLLECTION=clozyt-items
   QDRANT_VECTOR_NAME=fashion_clip
   QDRANT_VECTOR_DIM=512
   ```
   Adjust the values if you are targeting a different collection/vector name or dimensionality.

3. **Run Qdrant locally**
   ```bash
   docker-compose up -d
   ```
   Data is persisted to `./qdrant_storage/` so you can stop/restart the container without losing vectors.

4. **Embed and upsert catalog items** (optional, but required for fresh Qdrant instances)
   ```bash
   python scripts/embed_and_upsert.py \
     --input src/mock/items.json \
     --collection "$QDRANT_COLLECTION" \
     --vector-name "$QDRANT_VECTOR_NAME" \
     --dim "$QDRANT_VECTOR_DIM"
   ```
   Add `--dry-run` to skip writes and inspect generated embeddings/payloads under `artifacts/`. The script will prefer Fashion-CLIP; it falls back to OpenCLIP if the fashion-specific weights are unavailable.

5. **Start the Next.js dev server**
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000. The items page automatically pulls the next packet from `/api/recs/next` and streams feedback events back to `/api/feedback`.

## Useful Commands

- `npm run lint` – Run eslint with the project configuration.
- `npm run build` – Create a production build (useful before deploying or verifying the PWA output).
- `docker-compose down` – Stop the local Qdrant container.

## Data & Assets

- Primary mock catalog: `src/mock/items.json`
- Additional staged items: `src/mock/temp.json`
- Spreadsheet source (pre-clean merge): `Combined_Cleaned_Data.xlsx`
- PWA icons + manifest: `public/icons/`, `public/manifest.json`

## Notes

- The recommendation API runs in the Node.js runtime to access the Qdrant REST client.
- Client-side stores use Zustand with localStorage keyed persistence; `ClearPersistedState` ensures legacy keys are cleared on first load after deployments.
- Logs are verbose in non-production mode to aid debugging of packet contents, swipe flushing, and storage resets.
