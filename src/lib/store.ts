import { create } from "zustand";
import { persist, PersistOptions } from "zustand/middleware";
import { Item } from "./events";

interface UserState {
  userId: string;
  setUserId: (id: string) => void;
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
}

interface CartState {
  cart: Item[];
  add: (item: Item) => void;
  remove: (id: string) => void;
  clear: () => void;
}

type PersistedState<T> = T & PersistOptions<T>;

export const useUserStore = create<UserState>((set) => ({
  userId: "",
  setUserId: (id: string) => set({ userId: id }),
}));

export const useDeckStore = create<DeckState>((set) => ({
  items: [],
  load: (items: Item[]) => set({ items }),
  next: () => set((state) => ({ items: state.items.slice(1) })),
}));

export const useLikesStore = create(
  persist<LikesState>(
    (set) => ({
      likes: [],
      add: (item: Item) => set((state) => ({ likes: [...state.likes, item] })),
      remove: (id: string) =>
        set((state) => ({ likes: state.likes.filter((item) => item.item_id !== id) })),
    }),
    { name: "likes-storage" }
  )
);

export const useCartStore = create(
  persist<CartState>(
    (set) => ({
      cart: [],
      add: (item: Item) => set((state) => ({ cart: [...state.cart, item] })),
      remove: (id: string) =>
        set((state) => ({ cart: state.cart.filter((item) => item.item_id !== id) })),
      clear: () => set({ cart: [] }),
    }),
    { name: "cart-storage" }
  )
);