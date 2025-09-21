"use client";

import { useCartStore } from "../../lib/store";

const CartList = () => {
  const cart = useCartStore((state) => state.cart);

  if (!cart.length) {
    return <p className="text-sm text-gray-500">Your cart is empty.</p>;
  }

  return (
    <ul className="space-y-3">
      {cart.map((entry) => (
        <li
          key={entry.item.item_id}
          className="flex items-center justify-between rounded-md bg-gray-100 px-4 py-3 text-sm shadow"
        >
          <span className="font-medium text-gray-800">{entry.item.title}</span>
          <span className="text-gray-600">Qty: {entry.qty}</span>
        </li>
      ))}
    </ul>
  );
};

export default CartList;
