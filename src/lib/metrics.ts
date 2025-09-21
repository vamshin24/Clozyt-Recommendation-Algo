import { UserEvent } from "./events";

type CounterKey =
  | "impressions"
  | "swipe_like"
  | "swipe_dislike"
  | "add_to_cart"
  | "share"
  | "purchase";

type MetricsState = Record<CounterKey, number>;

const metrics: MetricsState = {
  impressions: 0,
  swipe_like: 0,
  swipe_dislike: 0,
  add_to_cart: 0,
  share: 0,
  purchase: 0,
};

export function incrementMetric(key: CounterKey, amount = 1) {
  metrics[key] += amount;
}

export function recordImpressions(count: number) {
  if (count <= 0) {
    return;
  }
  incrementMetric("impressions", count);
}

export function recordEvents(events: UserEvent[]) {
  for (const event of events) {
    switch (event.type) {
      case "swipe_like":
        incrementMetric("swipe_like");
        break;
      case "swipe_dislike":
        incrementMetric("swipe_dislike");
        break;
      case "add_to_cart":
        incrementMetric("add_to_cart");
        break;
      case "purchase":
        incrementMetric("purchase");
        break;
      case "share":
        incrementMetric("share");
        break;
      default:
        break;
    }
  }
}

export function getMetrics() {
  return metrics;
}
