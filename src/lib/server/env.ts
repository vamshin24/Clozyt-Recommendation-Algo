type RequiredVar = "QDRANT_URL" | "QDRANT_COLLECTION" | "QDRANT_VECTOR_NAME" | "QDRANT_VECTOR_DIM";

function getEnv(name: RequiredVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  QDRANT_URL: getEnv("QDRANT_URL"),
  QDRANT_COLLECTION: getEnv("QDRANT_COLLECTION"),
  QDRANT_VECTOR_NAME: getEnv("QDRANT_VECTOR_NAME"),
  QDRANT_VECTOR_DIM: Number.parseInt(getEnv("QDRANT_VECTOR_DIM"), 10),
};

if (!Number.isFinite(env.QDRANT_VECTOR_DIM)) {
  throw new Error("QDRANT_VECTOR_DIM must be a valid integer");
}

export const VECTOR_DIM = env.QDRANT_VECTOR_DIM;
export const DEFAULT_TOP_M = 2;
export const MAX_TOP_M = 5;
export const MIN_TOP_M = 0;
export const SEARCH_LIMIT = 200;
export const RANDOM_SAMPLE_POOL = 100;
export const SEEN_CAPACITY = 200;
