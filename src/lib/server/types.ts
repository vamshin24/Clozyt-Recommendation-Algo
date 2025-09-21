import type { Item } from "@/lib/events";

export type RatingValue = 1 | 2 | 3;

export type ItemPayload = {
  uid: string;
  name?: string;
  brand?: string;
  price_value?: number;
  price_usd?: number;
  discount?: number;
  available_size?: string[] | string;
  image_url?: string;
  category?: string;
  tags?: string[];
  attributes?: Record<string, unknown>;
  title?: string;
};

export type RecItem = {
  item: Item;
  score: number;
  is_top: boolean;
};

export type FeedbackEvent = {
  item_id: string;
  rating: RatingValue;
  ts: number;
};

export type FeedbackRequest = {
  user_id: string;
  events: FeedbackEvent[];
};

export type FeedbackResponse = {
  ok: true;
  top_m: number;
};

export type RecsRequest = {
  user_id: string;
  k?: number;
  context?: unknown;
};

export type RecsResponse = {
  recommendations: RecItem[];
};

export type PacketItem = {
  item_id: string;
  is_top: boolean;
};

export type CandidatePoint = {
  id: string;
  score: number;
  payload: ItemPayload;
};

export type VectorRecord = {
  id: string;
  vector: number[];
  payload?: ItemPayload;
};
