export function toFloat32(vector: number[] | Float32Array, dim: number): Float32Array {
  if (vector instanceof Float32Array) {
    if (vector.length === dim) {
      return vector;
    }
    const copy = new Float32Array(dim);
    copy.set(vector.subarray(0, Math.min(dim, vector.length)));
    return copy;
  }
  const result = new Float32Array(dim);
  const len = Math.min(dim, vector.length);
  for (let i = 0; i < len; i += 1) {
    result[i] = vector[i];
  }
  return result;
}

export function normalizeMut(vector: Float32Array): void {
  let norm = 0;
  for (let i = 0; i < vector.length; i += 1) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (!norm || !Number.isFinite(norm)) {
    return;
  }
  const inv = 1 / norm;
  for (let i = 0; i < vector.length; i += 1) {
    vector[i] *= inv;
  }
}

export function addScaled(target: Float32Array, source: Float32Array, weight: number): void {
  for (let i = 0; i < target.length; i += 1) {
    target[i] += weight * source[i];
  }
}

export function subtractScaled(target: Float32Array, source: Float32Array, weight: number): void {
  for (let i = 0; i < target.length; i += 1) {
    target[i] -= weight * source[i];
  }
}

export function cloneVector(vector: Float32Array): Float32Array {
  return new Float32Array(vector);
}

export function toNumberArray(vector: Float32Array): number[] {
  return Array.from(vector);
}
