export type Item = {
  item_id: string;
  title: string;
  brand: string;
  price_usd: number;
  image_url: string;
  category?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
  embedding?: number[];
  score?: number;
};

export type SwipeLikeEvent = {
  type: "swipe_like";
  user_id: string;
  item_id: string;
  ts: number;
  surface: "items";
};

export type SwipeDislikeEvent = {
  type: "swipe_dislike";
  user_id: string;
  item_id: string;
  ts: number;
  surface: "items";
};

export type DetailEvent = {
  type: "detail_view";
  user_id: string;
  item_id: string;
  ts: number;
  surface?: "items" | "portfolio";
};

export type AddToCartEvent = {
  type: "add_to_cart";
  user_id: string;
  item_id: string;
  quantity: number;
  ts: number;
  surface: "items" | "portfolio";
};

export type PurchaseEvent = {
  type: "purchase";
  user_id: string;
  cart_item_ids: string[];
  ts: number;
};

export type ShareEvent = {
  type: "share";
  user_id: string;
  item_id: string;
  ts: number;
  surface: "items" | "portfolio";
};

export type ProfileUpdateEvent = {
  type: "profile_update";
  user_id: string;
  ts: number;
  profile: {
    name?: string;
    email?: string;
    gender?: "female" | "male" | "nonbinary" | "prefer_not";
    age?: number;
    budgetMin?: number;
    budgetMax?: number;
    styles?: string[];
  };
};

export type UserEvent =
  | SwipeLikeEvent
  | SwipeDislikeEvent
  | DetailEvent
  | AddToCartEvent
  | PurchaseEvent
  | ShareEvent
  | ProfileUpdateEvent;
