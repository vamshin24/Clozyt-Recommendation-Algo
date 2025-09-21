"use client";

import { useMemo, useState } from "react";
import CollageGrid from "../../components/grids/CollageGrid";
import itemsData from "@/mock/items.json";
import { Item } from "../../lib/events";

const allItems = itemsData as Item[];

const searchableText = (item: Item) => {
  const attributes = Object.values(item.attributes ?? {})
    .filter((value) => typeof value === "string")
    .join(" ");
  const tags = item.tags?.join(" ") ?? "";
  return `${item.title} ${item.brand} ${item.category ?? ""} ${tags} ${attributes} ${item.price_usd}`.toLowerCase();
};

const SearchPage = () => {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return allItems;
    }

    return allItems.filter((item) => searchableText(item).includes(trimmed));
  }, [query]);

  return (
    <div className="flex min-h-screen flex-col p-4">
      <h1 className="text-2xl font-bold text-white">Search</h1>
      <input
        type="text"
        placeholder="Search items by name, brand, price..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="mt-4 w-full rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/70"
      />
      <div className="mt-6 flex-1">
        <CollageGrid items={filtered} />
      </div>
    </div>
  );
};

export default SearchPage;
