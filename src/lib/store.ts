import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Item } from "./events";

export type UserProfile = {
  name: string;
  email: string;
  gender: "female" | "male" | "nonbinary" | "prefer_not";
  age?: number;
  budgetMin?: number;
  budgetMax?: number;
  styles: string[];
};

interface UserState {
  userId: string;
  profile: UserProfile;
  setUserId: (id: string) => void;
  setProfile: (profile: UserProfile) => void;
}

interface DeckState {
  items: Item[];
  load: (items: Item[]) => void;
  next: () => void;
}

interface LikesState {
  likes: Item[];
  add: (item: Item) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export type CartEntry = {
  item: Item;
  qty: number;
};

interface CartState {
  cart: CartEntry[];
  add: (item: Item) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const defaultProfile: UserProfile = {
  name: "",
  email: "",
  gender: "prefer_not",
  styles: [],
};

export const useUserStore = create(
  persist<UserState>(
    (set) => ({
      userId: "demo-user",
      profile: defaultProfile,
      setUserId: (id: string) => set({ userId: id }),
      setProfile: (profile: UserProfile) => set({ profile }),
    }),
    { name: "user-storage" }
  )
);

export const useDeckStore = create<DeckState>((set) => ({
  items: [],
  load: (items: Item[]) => set({ items }),
  next: () => set((state) => ({ items: state.items.slice(1) })),
}));

export const useLikesStore = create(
  persist<LikesState>(
    (set) => ({
      likes: [],
      add: (item: Item) =>
        set((state) => {
          if (state.likes.some((like) => like.item_id === item.item_id)) {
            return state;
          }
          return { likes: [...state.likes, item] };
        }),
      remove: (id: string) =>
        set((state) => ({ likes: state.likes.filter((item) => item.item_id !== id) })),
      clear: () => set({ likes: [] }),
    }),
    { name: "likes-storage" }
  )
);

export const useCartStore = create(
  persist<CartState>(
    (set) => ({
      cart: [],
      add: (item: Item) =>
        set((state) => {
          const existing = state.cart.find((entry) => entry.item.item_id === item.item_id);
          if (existing) {
            return {
              cart: state.cart.map((entry) =>
                entry.item.item_id === item.item_id
                  ? { ...entry, qty: entry.qty + 1 }
                  : entry
              ),
            };
          }
          return { cart: [...state.cart, { item, qty: 1 }] };
        }),
      remove: (id: string) =>
        set((state) => ({ cart: state.cart.filter((entry) => entry.item.item_id !== id) })),
      clear: () => set({ cart: [] }),
    }),
    { name: "cart-storage" }
  )
);
