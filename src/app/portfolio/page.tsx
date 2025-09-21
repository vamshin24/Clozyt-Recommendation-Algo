"use client";

import LikedList from "../../components/lists/LikedList";
import CartList from "../../components/lists/CartList";
import { useCartStore, useUserStore } from "../../lib/store";
import { sendFeedback } from "../../lib/recs";

const PortfolioPage = () => {
  const cart = useCartStore((state) => state.cart);
  const userId = useUserStore((state) => state.userId);

  const handleBuyCart = () => {
    if (!cart.length) return;

    const cartItemIds = cart.flatMap((entry) =>
      Array.from({ length: entry.qty }, () => entry.item.item_id)
    );

    void sendFeedback([
      {
        type: "purchase",
        user_id: userId,
        cart_item_ids: cartItemIds,
        ts: Date.now(),
      },
    ]);
  };

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Portfolio</h1>
      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Liked Items</h2>
        <LikedList />
      </section>
      <section>
        <h2 className="mb-2 text-xl font-semibold">Cart</h2>
        <CartList />
        <button
          type="button"
          onClick={handleBuyCart}
          disabled={!cart.length}
          className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          Buy Cart
        </button>
      </section>
    </div>
  );
};

export default PortfolioPage;
