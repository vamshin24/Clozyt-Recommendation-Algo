"use client";

import { instantBuy } from "../../lib/recs";
import { useLikesStore, useUserStore } from "../../lib/store";

const LikedList = () => {
  const likes = useLikesStore((state) => state.likes);
  const remove = useLikesStore((state) => state.remove);
  const clear = useLikesStore((state) => state.clear);
  const userId = useUserStore((state) => state.userId);

  if (!likes.length) {
    return <p className="text-sm text-gray-500">No liked items yet.</p>;
  }

  const handleInstantBuy = async (itemId: string) => {
    await instantBuy(userId, itemId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          {likes.length} liked item{likes.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={clear}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
        >
          Clear All
        </button>
      </div>
      <ul className="space-y-3">
        {likes.map((item) => (
          <li
            key={item.item_id}
            className="flex items-center justify-between rounded-md bg-gray-100 px-4 py-3 text-sm shadow"
          >
            <span className="font-medium text-gray-800">{item.title}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleInstantBuy(item.item_id)}
                className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
              >
                Instant Buy
              </button>
              <button
                type="button"
                onClick={() => remove(item.item_id)}
                className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LikedList;
