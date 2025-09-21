import { QdrantClient } from "@qdrant/js-client-rest";
import { env, VECTOR_DIM } from "./env";
import type { CandidatePoint, ItemPayload } from "./types";
import { normalizeMut, toFloat32 } from "./vector";

type RawVector = number[] | { data?: number[] };

type RawPoint = {
  id?: string | number | bigint;
  score?: number;
  payload?: unknown;
  vector?: RawVector;
  vectors?: Record<string, RawVector>;
};

type RawScrollResponse = {
  points?: RawPoint[];
};

const client = new QdrantClient({ url: env.QDRANT_URL });

const payloadCache = new Map<string, ItemPayload>();
const vectorCache = new Map<string, Float32Array>();
const uidToPointId = new Map<string, string>();

let popularityCentroid: Float32Array | null = null;
let popularityPromise: Promise<Float32Array> | null = null;

function asStringId(id: string | number | bigint | undefined): string {
  if (typeof id === "string") {
    return id;
  }
  if (typeof id === "number" || typeof id === "bigint") {
    return String(id);
  }
  throw new Error("Unexpected Qdrant point id");
}

function extractRawVector(raw?: RawVector): number[] | null {
  if (!raw) {
    return null;
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (Array.isArray(raw.data)) {
    return raw.data;
  }
  return null;
}

function extractVector(point: RawPoint | null | undefined): number[] | null {
  if (!point) {
    return null;
  }
  const direct = extractRawVector(point.vector);
  if (direct) {
    return direct;
  }
  const named = point.vectors?.[env.QDRANT_VECTOR_NAME];
  return extractRawVector(named);
}

function cachePayload(pointId: string, payload: unknown): void {
  if (!payload) {
    return;
  }
  const typed = payload as ItemPayload;
  payloadCache.set(pointId, typed);
  if (typeof typed?.uid === "string" && typed.uid.length) {
    uidToPointId.set(typed.uid, pointId);
    const cachedVector = vectorCache.get(pointId);
    if (cachedVector) {
      vectorCache.set(typed.uid, cachedVector);
    }
  }
}

export function getCachedPayload(id: string): ItemPayload | undefined {
  return payloadCache.get(id);
}

export async function searchCandidates(vector: Float32Array, limit: number): Promise<CandidatePoint[]> {
  const query = Array.from(vector);
  const results = (await client.search(env.QDRANT_COLLECTION, {
    vector: {
      name: env.QDRANT_VECTOR_NAME,
      vector: query,
    },
    limit,
    with_payload: true,
    with_vector: false,
    params: {
      hnsw_ef: 96,
    },
  })) as RawPoint[];

  const candidates: CandidatePoint[] = [];
  for (const point of results) {
    const id = asStringId(point.id);
    if (point.payload) {
      cachePayload(id, point.payload);
    }
    const payload = payloadCache.get(id);
    if (!payload) {
      continue;
    }
    const score = typeof point.score === "number" ? point.score : 0;
    candidates.push({ id, score, payload });
  }
  if (process.env.NODE_ENV !== "production") {
    console.log('[Qdrant] search results', candidates.slice(0, 10).map((candidate) => candidate.id));
  }
  return candidates;
}

export async function fetchVectors(ids: string[]): Promise<Map<string, number[]>> {
  const resolutionEntries: { requested: string; pointId: string }[] = [];

  for (const id of ids) {
    if (vectorCache.has(id)) {
      continue;
    }
    const mapped = uidToPointId.get(id);
    if (mapped && vectorCache.has(mapped)) {
      const cached = vectorCache.get(mapped);
      if (cached) {
        vectorCache.set(id, cached);
      }
      continue;
    }
    resolutionEntries.push({ requested: id, pointId: mapped ?? id });
  }

  const uniquePointIds = Array.from(new Set(resolutionEntries.map((entry) => entry.pointId))); 

  if (uniquePointIds.length) {
    const points = (await client.retrieve(env.QDRANT_COLLECTION, {
      ids: uniquePointIds,
      with_payload: true,
      with_vector: true,
    })) as RawPoint[];
    for (const point of points) {
      const id = asStringId(point.id);
      const vectorValues = extractVector(point);
      if (vectorValues) {
        const vector = toFloat32(vectorValues, VECTOR_DIM);
        vectorCache.set(id, vector);
        const payload = point.payload as ItemPayload | undefined;
        if (payload?.uid) {
          vectorCache.set(payload.uid, vector);
        }
      }
      if (point.payload) {
        cachePayload(id, point.payload);
      }
    }
    for (const entry of resolutionEntries) {
      const vector = vectorCache.get(entry.pointId);
      if (vector) {
        vectorCache.set(entry.requested, vector);
      }
    }
  }

  const result = new Map<string, number[]>();
  for (const id of ids) {
    const cached = vectorCache.get(id);
    if (cached) {
      result.set(id, Array.from(cached));
    }
  }
  return result;
}

async function computePopularityCentroid(): Promise<Float32Array> {
  const scroll = (await client.scroll(env.QDRANT_COLLECTION, {
    limit: 200,
    with_payload: false,
    with_vector: true,
  })) as RawScrollResponse;
  const points = Array.isArray(scroll.points) ? scroll.points : [];
  if (!points.length) {
    return new Float32Array(VECTOR_DIM);
  }
  const accumulator = new Float32Array(VECTOR_DIM);
  let count = 0;
  for (const point of points) {
    const vector = extractVector(point);
    if (!vector) {
      continue;
    }
    const vec = toFloat32(vector, VECTOR_DIM);
    for (let i = 0; i < VECTOR_DIM; i += 1) {
      accumulator[i] += vec[i];
    }
    count += 1;
  }
  if (!count) {
    return new Float32Array(VECTOR_DIM);
  }
  for (let i = 0; i < VECTOR_DIM; i += 1) {
    accumulator[i] /= count;
  }
  normalizeMut(accumulator);
  return accumulator;
}

export async function getPopularityCentroid(): Promise<Float32Array> {
  if (popularityCentroid) {
    return popularityCentroid;
  }
  if (!popularityPromise) {
    popularityPromise = computePopularityCentroid().then((vector) => {
      popularityCentroid = vector;
      return vector;
    });
  }
  return popularityPromise;
}

export function getClient(): QdrantClient {
  return client;
}
