"use client";

import { instantBuy } from "../../lib/recs";
import { useLikesStore, useUserStore } from "../../lib/store";

const LikedList = () => {
  const likes = useLikesStore((state) => state.likes);
  const userId = useUserStore((state) => state.userId);

  if (!likes.length) {
    return <p className="text-sm text-gray-500">No liked items yet.</p>;
  }

  const handleInstantBuy = async (itemId: string) => {
    await instantBuy(userId, itemId);
  };

  return (
    <ul className="space-y-3">
      {likes.map((item) => (
        <li
          key={item.item_id}
          className="flex items-center justify-between rounded-md bg-gray-100 px-4 py-3 text-sm shadow"
        >
          <span className="font-medium text-gray-800">{item.title}</span>
          <button
            type="button"
            onClick={() => handleInstantBuy(item.item_id)}
            className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            Instant Buy
          </button>
        </li>
      ))}
    </ul>
  );
};

export default LikedList;
