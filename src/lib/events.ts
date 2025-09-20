export type Item = {
  item_id: string;
  title: string;
  brand?: string;
  price_usd: number;
  image_url: string;
  attributes?: Record<string, string>;
};

export type UserEvent =
  | { type: "swipe_like"; user_id: string; item_id: string; ts: number; surface: "items" }
  | { type: "swipe_dislike"; user_id: string; item_id: string; ts: number; surface: "items" }
  | { type: "detail_view"; user_id: string; item_id: string; ts: number }
  | { type: "add_to_cart"; user_id: string; item_id: string; ts: number }
  | { type: "purchase"; user_id: string; cart_item_ids: string[]; ts: number };