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

export type UserEvent =
  | { type: "swipe_like"; user_id: string; item_id: string; ts: number; surface: "items" }
  | { type: "swipe_dislike"; user_id: string; item_id: string; ts: number; surface: "items" }
  | { type: "detail_view"; user_id: string; item_id: string; ts: number }
  | { type: "add_to_cart"; user_id: string; item_id: string; ts: number }
  | { type: "purchase"; user_id: string; cart_item_ids: string[]; ts: number }
  | {
      type: "share";
      user_id: string;
      item_id: string;
      ts: number;
      surface: "items" | "portfolio";
    }
  | {
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
