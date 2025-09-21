import { MAX_TOP_M, MIN_TOP_M, VECTOR_DIM } from "./env";
import type { FeedbackEvent } from "./types";
import type { UserState } from "./state";
import { addScaled, cloneVector, normalizeMut, subtractScaled, toFloat32 } from "./vector";

const NEGATIVE_SCALE = 0.15;

export function ratingToWeight(rating: FeedbackEvent["rating"]): number {
  switch (rating) {
    case 3:
      return 2;
    case 2:
      return 1;
    case 1:
      return -0.5;
    default:
      return 0;
  }
}

export function updateCentroids(
  state: UserState,
  events: FeedbackEvent[],
  vectorLookup: Map<string, number[]>
): void {
  let centroidUpdated = false;
  let negativeUpdated = false;

  for (const event of events) {
    const weight = ratingToWeight(event.rating);
    if (weight === 0) {
      continue;
    }
    const vectorValues = vectorLookup.get(event.item_id);
    if (!vectorValues) {
      continue;
    }
    const vector = toFloat32(vectorValues, VECTOR_DIM);
    if (weight > 0) {
      if (!state.centroid) {
        state.centroid = new Float32Array(VECTOR_DIM);
      }
      addScaled(state.centroid, vector, weight);
      centroidUpdated = true;
    } else {
      const magnitude = Math.abs(weight);
      if (!state.negative) {
        state.negative = new Float32Array(VECTOR_DIM);
      }
      addScaled(state.negative, vector, magnitude);
      negativeUpdated = true;
    }
  }

  if (centroidUpdated && state.centroid) {
    normalizeMut(state.centroid);
  }
  if (negativeUpdated && state.negative) {
    normalizeMut(state.negative);
  }
}

export function adjustTopM(state: UserState, events: FeedbackEvent[]): void {
  if (!events.length || !state.packetHistory.length) {
    return;
  }

  for (let historyIndex = state.packetHistory.length - 1; historyIndex >= 0; historyIndex -= 1) {
    const packet = state.packetHistory[historyIndex];
    if (!packet.length) {
      continue;
    }

    const lookup = new Map<string, boolean>();
    for (const item of packet) {
      lookup.set(item.item_id, item.is_top);
    }

    const topEvents: FeedbackEvent[] = [];
    const randomEvents: FeedbackEvent[] = [];

    for (const event of events) {
      const marker = lookup.get(event.item_id);
      if (marker === undefined) {
        continue;
      }
      if (marker) {
        topEvents.push(event);
      } else {
        randomEvents.push(event);
      }
    }

    if (!topEvents.length) {
      continue;
    }

    const anyTopDisliked = topEvents.some((event) => event.rating === 1);
    if (anyTopDisliked) {
      state.topM = Math.max(MIN_TOP_M, state.topM - 1);
      return;
    }

    const allTopLiked = topEvents.every((event) => event.rating >= 2);
    const allRandomDisliked = randomEvents.length > 0 && randomEvents.every((event) => event.rating === 1);

    if (allTopLiked && allRandomDisliked) {
      state.topM = Math.min(MAX_TOP_M, state.topM + 1);
    }

    return;
  }
}

export function deriveQueryVector(state: UserState, fallback: Float32Array | null): Float32Array {
  if (!state.centroid) {
    if (fallback) {
      return cloneVector(fallback);
    }
    return new Float32Array(VECTOR_DIM);
  }

  const query = cloneVector(state.centroid);
  if (state.negative) {
    subtractScaled(query, state.negative, NEGATIVE_SCALE);
  }
  normalizeMut(query);
  return query;
}
