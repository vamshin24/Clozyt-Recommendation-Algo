import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Item } from "@/lib/events";
import { incrementMetric } from "@/lib/metrics";

let itemsCache: Item[] | null = null;

async function loadItems(): Promise<Item[]> {
  if (itemsCache) {
    return itemsCache;
  }

  const filePath = path.join(process.cwd(), "src/mock/items.json");
  const fileContents = await fs.readFile(filePath, "utf-8");
  const parsed: Item[] = JSON.parse(fileContents);
  itemsCache = parsed;
  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { user_id: userId, k } = body as { user_id?: string; k?: number };

    const items = await loadItems();
    const desired = Number.isInteger(k) && (k as number) > 0 ? (k as number) : 10;

    const recommendations = Array.from({ length: desired }, (_, index) => {
      const item = items[index % items.length];
      const score = Math.max(0, 1 - index * 0.05);
      const itemWithScore: Item = { ...item, score };
      return {
        item: itemWithScore,
        score,
      };
    });

    incrementMetric("impressions", recommendations.length);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("/api/recs/next error", error);
    return NextResponse.json({ error: "unable_to_fetch_recommendations" }, { status: 500 });
  }
}
