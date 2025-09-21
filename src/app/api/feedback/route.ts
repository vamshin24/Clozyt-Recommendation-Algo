import { NextResponse } from "next/server";
import { adjustTopM, updateCentroids } from "@/lib/server/engine";
import { fetchVectors } from "@/lib/server/qdrant";
import { appendEvents, getUserState } from "@/lib/server/state";
import type { FeedbackEvent, FeedbackRequest, FeedbackResponse, RatingValue } from "@/lib/server/types";

export const runtime = "nodejs";

type LegacyEvent = {
  type: string;
  user_id?: string;
  item_id?: string;
  ts?: number;
};

type NormalizedPayload = {
  userId: string;
  events: FeedbackEvent[];
};

const RATING_BY_TYPE: Record<string, RatingValue | undefined> = {
  swipe_dislike: 1,
  swipe_like: 2,
  add_to_cart: 3,
};

function normalizeNewPayload(payload: FeedbackRequest): NormalizedPayload | null {
  if (!payload.user_id || !Array.isArray(payload.events)) {
    return null;
  }
  const events: FeedbackEvent[] = [];
  for (const event of payload.events) {
    const rating = event?.rating;
    if (!event?.item_id || (rating !== 1 && rating !== 2 && rating !== 3)) {
      continue;
    }
    const ts = typeof event.ts === "number" ? event.ts : Date.now();
    events.push({ item_id: event.item_id, rating, ts });
  }
  return { userId: payload.user_id, events };
}

function normalizeLegacyPayload(raw: { events?: LegacyEvent[] }): NormalizedPayload | null {
  const events = Array.isArray(raw?.events) ? raw.events : [];
  if (!events.length) {
    return null;
  }
  const normalized: FeedbackEvent[] = [];
  let userId = "";
  for (const event of events) {
    if (event.user_id) {
      userId = event.user_id;
    }
    const rating = RATING_BY_TYPE[event.type];
    if (!rating) {
      continue;
    }
    if (!event.item_id) {
      continue;
    }
    const ts = typeof event.ts === "number" ? event.ts : Date.now();
    normalized.push({ item_id: event.item_id, rating, ts });
  }
  if (!userId) {
    return null;
  }
  return { userId, events: normalized };
}

async function normalizeRequestBody(body: unknown): Promise<NormalizedPayload | null> {
  const asObject = body as Record<string, unknown> | null;
  if (!asObject) {
    return null;
  }
  const newPayload = normalizeNewPayload(asObject as FeedbackRequest);
  if (newPayload) {
    return newPayload;
  }
  return normalizeLegacyPayload(asObject as { events?: LegacyEvent[] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const normalized = await normalizeRequestBody(body);

    if (!normalized) {
      return NextResponse.json({ error: "invalid_events" }, { status: 400 });
    }

    const userState = getUserState(normalized.userId);

    if (!normalized.events.length) {
      return NextResponse.json({ ok: true, top_m: userState.topM } satisfies FeedbackResponse);
    }

    const batch = appendEvents(userState, normalized.events);

    if (!batch) {
      return NextResponse.json({ ok: true, top_m: userState.topM } satisfies FeedbackResponse);
    }

    const uniqueIds = Array.from(new Set(batch.map((event) => event.item_id)));
    const vectorMap = await fetchVectors(uniqueIds);

    updateCentroids(userState, batch, vectorMap);
    adjustTopM(userState, batch);

    return NextResponse.json({ ok: true, top_m: userState.topM } satisfies FeedbackResponse);
  } catch (error) {
    console.error("/api/feedback error", error);
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
