"use client";

import SwipeDeck from "../../components/SwipeDeck/SwipeDeck";
import { useEffect, useState } from "react";
import { Item } from "../../lib/events";

const ItemsPage = () => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // Fetch items (mocked for now)
    setItems([
      {
        item_id: "1",
        title: "Sample Item",
        price_usd: 19.99,
        image_url: "/sample.jpg",
      },
    ]);
  }, []);

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Clozyt</h1>
        <span className="text-sm">❤️ 0</span>
      </header>
      <SwipeDeck items={items} />
    </div>
  );
};

export default ItemsPage;