import { Item, UserEvent } from "./events";

type RecommendationResponse = {
  recommendations: { item: Item; score: number }[];
};

type FetchContext = Record<string, unknown>;

async function postJson<T>(url: string, body: unknown, init?: RequestInit) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request to ${url} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchNextItems(
  userId: string,
  k = 10,
  context: FetchContext = {}
): Promise<Item[]> {
  const data = await postJson<RecommendationResponse>("/api/recs/next", {
    user_id: userId,
    k,
    context,
  });

  console.log("[fetchNextItems] response", data);

  return data.recommendations.map((entry) => entry.item);
}

export async function sendFeedback(events: UserEvent[]): Promise<void> {
  if (!events.length) return;

  try {
    console.log("[sendFeedback] sending events", events);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch (error) {
    console.error("Failed to send feedback", error);
  }
}

export async function emitShare(
  userId: string,
  itemId: string,
  surface: "items" | "portfolio" = "items"
) {
  const event: UserEvent = {
    type: "share",
    user_id: userId,
    item_id: itemId,
    surface,
    ts: Date.now(),
  };

  console.log("[emitShare] sharing", { userId, itemId, surface });
  await sendFeedback([event]);
}

export async function instantBuy(userId: string, itemId: string) {
  const event: UserEvent = {
    type: "purchase",
    user_id: userId,
    cart_item_ids: [itemId],
    ts: Date.now(),
  };

  console.log("[instantBuy] purchasing", { userId, itemId });
  await sendFeedback([event]);
}
