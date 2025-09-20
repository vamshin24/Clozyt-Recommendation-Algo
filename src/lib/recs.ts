import { Item, UserEvent } from "./events";

export async function fetchNextItems(userId: string, k = 10): Promise<Item[]> {
  // Mock implementation: Replace with API call later
  return Array.from({ length: k }, (_, i) => ({
    item_id: `${userId}-${i}`,
    title: `Item ${i + 1}`,
    price_usd: Math.random() * 100,
    image_url: "/placeholder.jpg",
  }));
}

export async function sendFeedback(events: UserEvent[]): Promise<void> {
  // Mock implementation: Replace with API call later
  console.log("Feedback sent:", events);
}