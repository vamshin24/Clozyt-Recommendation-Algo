"use client";

import { useCartStore } from "../../lib/store";

const CartList = () => {
  const cart = useCartStore((state) => state.cart);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);

  if (!cart.length) {
    return <p className="text-sm text-gray-500">Your cart is empty.</p>;
  }

  const totalItems = cart.reduce((sum, entry) => sum + entry.qty, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {totalItems} item{totalItems === 1 ? "" : "s"} in cart
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          Clear Cart
        </button>
      </div>
      <ul className="space-y-3">
        {cart.map((entry) => (
          <li
            key={entry.item.item_id}
            className="flex items-center justify-between rounded-md bg-gray-100 px-4 py-3 text-sm shadow"
          >
            <div>
              <p className="font-medium text-gray-800">{entry.item.title}</p>
              <p className="text-xs text-gray-500">Qty: {entry.qty}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(entry.item.item_id)}
              className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CartList;
