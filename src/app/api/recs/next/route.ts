import { NextResponse } from "next/server";
import { MAX_TOP_M, MIN_TOP_M, RANDOM_SAMPLE_POOL, SEARCH_LIMIT, VECTOR_DIM } from "@/lib/server/env";
import { deriveQueryVector } from "@/lib/server/engine";
import { getPopularityCentroid, searchCandidates } from "@/lib/server/qdrant";
import { getUserState, setLastPacket } from "@/lib/server/state";
import type { CandidatePoint, PacketItem, RecItem, RecsRequest } from "@/lib/server/types";
import type { Item } from "@/lib/events";
import { normalizeMut } from "@/lib/server/vector";

export const runtime = "nodejs";

const PACKET_SIZE = 5;

function clampTopM(value: number, poolSize: number): number {
  const bounded = Math.min(Math.max(value, MIN_TOP_M), MAX_TOP_M);
  return Math.min(bounded, poolSize, PACKET_SIZE);
}

function hasMagnitude(vector: Float32Array): boolean {
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) {
    norm += vector[i] * vector[i];
  }
  return norm > 1e-8;
}

function randomUnitVector(): Float32Array {
  const vector = new Float32Array(VECTOR_DIM);
  for (let i = 0; i < VECTOR_DIM; i += 1) {
    vector[i] = Math.random() - 0.5;
  }
  normalizeMut(vector);
  return vector;
}


function coercePrice(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function normalizeSizes(raw: unknown): string[] | undefined {
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry)).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return undefined;
}

function candidateToItem(candidate: CandidatePoint): Item | null {
  const payload = candidate.payload;
  if (!payload) {
    return null;
  }
  const rawUid = typeof payload.uid === "string" ? payload.uid.trim() : payload.uid;
  const cleanedUid = typeof rawUid === "string" && rawUid.length ? rawUid : undefined;
  const invalidUid =
    typeof cleanedUid === "string" &&
    ["none", "null", "undefined", ""].includes(cleanedUid.toLowerCase());
  const itemId = !invalidUid && cleanedUid ? cleanedUid : candidate.id;
  const rawTitle = payload.title || payload.name;
  const title = typeof rawTitle === "string" && rawTitle.trim().length ? rawTitle.trim() : null;
  const rawImage = payload.image_url;
  const imageUrl = typeof rawImage === "string" && rawImage.trim().length ? rawImage.trim() : null;
  if (!itemId || !title || !imageUrl) {
    return null;
  }
  const price = coercePrice(payload.price_usd ?? payload.price_value);
  const categoryRaw = payload.category;
  const category = typeof categoryRaw === "string" && categoryRaw.trim().length ? categoryRaw : undefined;
  const tags = Array.isArray(payload.tags) ? payload.tags : undefined;
  const baseAttributes =
    payload.attributes && typeof payload.attributes === "object"
      ? { ...payload.attributes }
      : undefined;
  const sizes = normalizeSizes(payload.available_size);
  const attributes = sizes
    ? { ...(baseAttributes ?? {}), available_size: sizes }
    : baseAttributes;

  return {
    item_id: itemId,
    title,
    brand: typeof payload.brand === "string" ? payload.brand : "",
    price_usd: price,
    image_url: imageUrl,
    category,
    tags,
    attributes,
    score: candidate.score,
  };
}

function sampleWithoutReplacement<T>(source: T[], count: number): T[] {
  if (count <= 0) {
    return [];
  }
  const copy = source.slice();
  const limit = Math.min(count, copy.length);
  for (let i = 0; i < limit; i += 1) {
    const swapIndex = i + Math.floor(Math.random() * (copy.length - i));
    const temp = copy[i];
    copy[i] = copy[swapIndex];
    copy[swapIndex] = temp;
  }
  return copy.slice(0, limit);
}

function buildPacket(
  deterministic: CandidatePoint[],
  stochastic: CandidatePoint[],
  desired: number
): { packet: PacketItem[]; recommendations: RecItem[] } {
  const packetItems: PacketItem[] = [];
  const recommendations: RecItem[] = [];
  const combined = deterministic.concat(stochastic);
  const seenIds = new Set<string>();

  for (let index = 0; index < combined.length && recommendations.length < desired; index += 1) {
    const candidate = combined[index];
    const item = candidateToItem(candidate);
    if (!item || seenIds.has(item.item_id)) {
      continue;
    }
    const isTop = index < deterministic.length && packetItems.length < desired;
    packetItems.push({ item_id: item.item_id, is_top: isTop });
    recommendations.push({ item, score: candidate.score, is_top: isTop });
    seenIds.add(item.item_id);
  }

  return { packet: packetItems, recommendations };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RecsRequest;
    const userId = body?.user_id;

    if (!userId) {
      return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
    }

    const userState = getUserState(userId);
    const fallback = await getPopularityCentroid().catch(() => new Float32Array(VECTOR_DIM));

    let queryVector = deriveQueryVector(userState, fallback ?? null);
    if (!hasMagnitude(queryVector)) {
      queryVector = fallback && hasMagnitude(fallback) ? fallback : randomUnitVector();
    }

    const rawCandidates = await searchCandidates(queryVector, SEARCH_LIMIT);
    const lastPacketIds = new Set(userState.lastPacket.map((entry) => entry.item_id));
    const seen = userState.seen;

    const fresh: CandidatePoint[] = [];
    const recycled: CandidatePoint[] = [];
    const unique = new Set<string>();

    for (const candidate of rawCandidates) {
      const payload = candidate.payload;
      if (!payload) {
        continue;
      }
      const itemId = payload.uid || candidate.id;
      const title = payload.title || payload.name;
      const imageUrl = payload.image_url;
      if (!itemId || !title || !imageUrl) {
        continue;
      }
      if (lastPacketIds.has(itemId) || unique.has(itemId)) {
        continue;
      }
      unique.add(itemId);
      if (seen.has(itemId)) {
        recycled.push(candidate);
      } else {
        fresh.push(candidate);
      }
    }

    const available = fresh.concat(recycled);

    if (!available.length) {
      return NextResponse.json({ recommendations: [] });
    }

    const topTarget = clampTopM(userState.topM, available.length);
    const deterministic = available.slice(0, topTarget);

    const randomPoolStart = topTarget;
    const randomPoolEnd = Math.min(available.length, topTarget + RANDOM_SAMPLE_POOL);
    const randomPool = available.slice(randomPoolStart, randomPoolEnd);
    const randomNeeded = Math.max(0, PACKET_SIZE - deterministic.length);
    const sampled = sampleWithoutReplacement(randomPool, randomNeeded);

    if (sampled.length < randomNeeded) {
      const fallbackPool = available.slice(randomPoolEnd);
      for (const candidate of fallbackPool) {
        if (sampled.length >= randomNeeded) {
          break;
        }
        sampled.push(candidate);
      }
    }

    const { packet, recommendations } = buildPacket(deterministic, sampled, PACKET_SIZE);

    if (recommendations.length < PACKET_SIZE) {
      for (const candidate of available) {
        if (recommendations.length >= PACKET_SIZE) {
          break;
        }
        const item = candidateToItem(candidate);
        if (!item || packet.some((entry) => entry.item_id === item.item_id)) {
          continue;
        }
        packet.push({ item_id: item.item_id, is_top: false });
        recommendations.push({ item, score: candidate.score, is_top: false });
      }
    }

    const trimmedPacket = packet.slice(0, PACKET_SIZE);
    const trimmedRecommendations = recommendations.slice(0, PACKET_SIZE);

    setLastPacket(userState, trimmedPacket);

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Recs] next packet', {
        userId,
        packet: trimmedPacket.map((entry) => ({
          item_id: entry.item_id,
          is_top: entry.is_top,
        })),
        itemIds: trimmedRecommendations.map((entry) => entry.item.item_id),
      });
    }

    return NextResponse.json({ recommendations: trimmedRecommendations });
  } catch (error) {
    console.error("/api/recs/next error", error);
    return NextResponse.json({ error: "unable_to_fetch_recommendations" }, { status: 500 });
  }
}
