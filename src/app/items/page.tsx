"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import SwipeDeck from "../../components/SwipeDeck/SwipeDeck";
import { Item, UserEvent } from "../../lib/events";
import { fetchNextItems, emitShare, sendFeedback } from "../../lib/recs";
import { useCartStore, useLikesStore, useUserStore } from "../../lib/store";

const PACKET_SIZE = 5;
const INITIAL_PACKET_COUNT = 2;
const PREFETCH_SEED_COUNT = 3;
const BASE_GENDERS = ["female", "male", "unisex"] as const;
const BASE_SIZES = ["xs", "s", "m", "l", "xl", "xxl"];

const ItemsPage = () => {
  const userId = useUserStore((state) => state.userId);
  const likes = useLikesStore((state) => state.likes);
  const addLike = useLikesStore((state) => state.add);
  const addToCart = useCartStore((state) => state.add);
  const [sourceItems, setSourceItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceBounds, setPriceBounds] = useState<[number, number]>([0, 0]);
  const [filters, setFilters] = useState({
    gender: "all" as "all" | "female" | "male" | "unisex",
    price: [0, 0] as [number, number],
    brand: "all" as "all" | string,
    size: "all" as "all" | string,
  });
  const [activeModal, setActiveModal] = useState<
    null | "gender" | "price" | "brand" | "size"
  >(null);
  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>([0, 0]);
  const servedIdsRef = useRef<Set<string>>(new Set());
  const viewedIdsRef = useRef<Set<string>>(new Set());
  const appendedRef = useRef(false);
  const prefetchLockRef = useRef(false);
  const queuedPacketsRef = useRef(0);
  const sourceItemsRef = useRef<Item[]>([]);
  const [deckCursor, setDeckCursor] = useState(0);
  const deckCursorRef = useRef(0);
  const swipeBufferRef = useRef<UserEvent[]>([]);

  const getPriceBounds = useCallback((items: Item[]): [number, number] => {
    if (!items.length) {
      return [0, 0];
    }

    let min = items[0].price_usd;
    let max = items[0].price_usd;

    for (const item of items) {
      const price = item.price_usd;
      if (price < min) {
        min = price;
      }
      if (price > max) {
        max = price;
      }
    }

    return [min, max];
  }, []);

  const dedupeItems = useCallback(
    (existing: Item[], incoming: Item[], served: Set<string>) => {
      if (!incoming.length) {
        return [] as Item[];
      }

      const startIndex = Math.max(deckCursorRef.current, 0);
      const existingIds = new Set(
        existing.slice(startIndex).map((item) => item.item_id)
      );
      const unique: Item[] = [];

      for (const item of incoming) {
        const id = item.item_id;
        if (!id || existingIds.has(id) || served.has(id)) {
          continue;
        }
        existingIds.add(id);
        served.add(id);
        unique.push(item);
      }

      if (unique.length || served.size === 0) {
        return unique;
      }

      served.clear();
      const recycled: Item[] = [];
      const recycledIds = new Set<string>();
      const futureIds = new Set(
        existing.slice(startIndex).map((item) => item.item_id)
      );
      for (const item of incoming) {
        const id = item.item_id;
        if (!id || recycledIds.has(id) || futureIds.has(id)) {
          continue;
        }
        recycledIds.add(id);
        served.add(id);
        recycled.push(item);
      }

      if (recycled.length) {
        return recycled;
      }

      return incoming.filter(
        (item) => typeof item.item_id === "string" && item.item_id.length > 0
      );
    },
    []
  );

  useEffect(() => {
    deckCursorRef.current = deckCursor;
  }, [deckCursor]);

  useEffect(() => {
    sourceItemsRef.current = sourceItems;
  }, [sourceItems]);

  const appendDeckItems = useCallback(
    (incoming: Item[]) => {
      if (!incoming.length) {
        return;
      }

      setSourceItems((prev) => {
        const unique = dedupeItems(prev, incoming, servedIdsRef.current);
        if (!unique.length) {
          console.log("[ItemsPage] prefetch yielded no new items", {
            incoming: incoming.length,
          });
          return prev;
        }

        const next = [...prev, ...unique];
        const bounds = getPriceBounds(next);
        console.log("[ItemsPage] appended items", {
          incoming: incoming.length,
          appended: unique.length,
          total: next.length,
        });
        setPriceBounds(bounds);
        setFilters((prevFilters) => {
          const usesDefaultBounds =
            prevFilters.price[0] === priceBounds[0] &&
            prevFilters.price[1] === priceBounds[1];
          if (!usesDefaultBounds) {
            return prevFilters;
          }
          return {
            ...prevFilters,
            price: bounds,
          };
        });
        appendedRef.current = true;
        return next;
      });
    },
    [dedupeItems, getPriceBounds, priceBounds]
  );

  const flushPacketQueue = useCallback(async () => {
    if (prefetchLockRef.current || !userId) {
      return;
    }

    prefetchLockRef.current = true;
    let seedSource = [...sourceItemsRef.current];
    console.log("[ItemsPage] processing packet queue", {
      queued: queuedPacketsRef.current,
      seedSource: seedSource.length,
    });

    try {
      while (queuedPacketsRef.current > 0) {
        queuedPacketsRef.current -= 1;
        const seedIds = seedSource
          .slice(-PREFETCH_SEED_COUNT)
          .map((item) => item.item_id)
          .filter(Boolean);
        const context = {
          surface: "items",
          ...(seedIds.length ? { seed_item_ids: seedIds } : {}),
        };
        const nextItems = await fetchNextItems(userId, PACKET_SIZE, context);
        console.log("[ItemsPage] packet fetched", {
          queuedRemaining: queuedPacketsRef.current,
          received: nextItems.length,
        });
        if (!nextItems.length) {
          queuedPacketsRef.current = 0;
          break;
        }
        seedSource = [...seedSource, ...nextItems];
        appendDeckItems(nextItems);
      }
    } catch (error) {
      console.error("[ItemsPage] packet queue failed", error);
    } finally {
      prefetchLockRef.current = false;
      if (queuedPacketsRef.current > 0) {
        void flushPacketQueue();
      }
    }
  }, [appendDeckItems, userId]);

  const requestNextPacket = useCallback(() => {
    if (!userId) {
      return;
    }
    queuedPacketsRef.current += 1;
    if (!prefetchLockRef.current) {
      void flushPacketQueue();
    }
  }, [flushPacketQueue, userId]);

  useEffect(() => {
    let isMounted = true;
    console.log("[ItemsPage] request new deck", { userId });

    async function loadItems() {
      try {
        setLoading(true);
        setDeckCursor(0);
        servedIdsRef.current.clear();
        viewedIdsRef.current.clear();
        queuedPacketsRef.current = 0;
        swipeBufferRef.current = [];
        prefetchLockRef.current = false;
        console.log("[ItemsPage] fetching initial packets", {
          packets: INITIAL_PACKET_COUNT,
          packetSize: PACKET_SIZE,
        });

        const aggregated: Item[] = [];
        for (let index = 0; index < INITIAL_PACKET_COUNT; index += 1) {
          const seedIds = aggregated
            .slice(-PREFETCH_SEED_COUNT)
            .map((item) => item.item_id)
            .filter(Boolean);
          const context = {
            surface: "items",
            ...(seedIds.length ? { seed_item_ids: seedIds } : {}),
          };
          const nextItems = await fetchNextItems(userId, PACKET_SIZE, context);
          console.log("[ItemsPage] initial packet fetched", {
            index,
            received: nextItems.length,
          });
          if (!nextItems.length) {
            break;
          }
          aggregated.push(...nextItems);
        }

        if (isMounted) {
          const uniqueItems = dedupeItems([], aggregated, servedIdsRef.current);
          console.log("[ItemsPage] initial packets processed", {
            requestedPackets: INITIAL_PACKET_COUNT,
            aggregated: aggregated.length,
            accepted: uniqueItems.length,
          });
          setSourceItems(uniqueItems);
          const bounds = getPriceBounds(uniqueItems);
          setPriceBounds(bounds);
          appendedRef.current = false;
          viewedIdsRef.current.clear();
          setFilters((prev) => ({
            ...prev,
            price:
              prev.price[0] === 0 && prev.price[1] === 0 && uniqueItems.length
                ? bounds
                : prev.price,
          }));
        }
      } catch (error) {
        console.error("[ItemsPage] failed to load items", error);
        if (isMounted) {
          setSourceItems([]);
          setPriceBounds([0, 0]);
          servedIdsRef.current.clear();
          viewedIdsRef.current.clear();
          appendedRef.current = false;
          setDeckCursor(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [dedupeItems, getPriceBounds, userId]);

  const likesCount = useMemo(() => likes.length, [likes]);

  const normalizeBrand = (brand?: string) => (brand && brand.trim() ? brand : "NA-KD");

  const itemGender = (item: Item) => {
    const attrs = (item.attributes || {}) as {
      gender?: string;
    };
    const genderValue = attrs.gender?.toLowerCase();
    if (genderValue === "female" || genderValue === "male" || genderValue === "unisex") {
      return genderValue;
    }
    return "unisex";
  };

  const itemSizes = (item: Item) => {
    const attrs = (item.attributes || {}) as {
      sizes?: unknown;
    };
    if (Array.isArray(attrs.sizes)) {
      return attrs.sizes.map((size) => String(size).toLowerCase());
    }
    return [];
  };

  const filteredItems = useMemo(() => {
    const [minSelected, maxSelected] = filters.price;

    return sourceItems.filter((item) => {
      const genderMatch =
        filters.gender === "all" || itemGender(item) === filters.gender;

      const brandMatch =
        filters.brand === "all" || normalizeBrand(item.brand) === filters.brand;

      const sizeMatch =
        filters.size === "all" || itemSizes(item).includes(filters.size);

      const priceMatch =
        item.price_usd >= (minSelected ?? priceBounds[0]) &&
        item.price_usd <= (maxSelected ?? priceBounds[1]);

      return genderMatch && brandMatch && sizeMatch && priceMatch;
    });
  }, [sourceItems, filters, priceBounds]);

  const deckItems = filteredItems;

  useEffect(() => {
    if (appendedRef.current) {
      appendedRef.current = false;
      return;
    }

    setDeckCursor(0);
  }, [deckItems]);

  const advanceDeck = useCallback(() => {
    setDeckCursor((prev) => prev + 1);
  }, []);

  const enqueueSwipeEvent = useCallback(
    (event: UserEvent): boolean => {
      swipeBufferRef.current.push(event);
      if (swipeBufferRef.current.length >= PACKET_SIZE) {
        const batch = swipeBufferRef.current.splice(0, PACKET_SIZE);
        console.log("[ItemsPage] flushing swipe feedback", {
          count: batch.length,
        });
        void sendFeedback(batch);
        return true;
      }
      return false;
    },
    []
  );

  useEffect(() => {
    const currentItem = deckItems[deckCursor];
    if (!currentItem || viewedIdsRef.current.has(currentItem.item_id)) {
      return;
    }

    viewedIdsRef.current.add(currentItem.item_id);
    void sendFeedback([
      {
        type: "detail_view",
        user_id: userId,
        item_id: currentItem.item_id,
        surface: "items",
        ts: Date.now(),
      },
    ]);
  }, [deckCursor, deckItems, userId]);

  const genderOptions = useMemo(() => {
    const set = new Set<string>(BASE_GENDERS);
    sourceItems.forEach((item) => set.add(itemGender(item)));
    return Array.from(set);
  }, [sourceItems]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    sourceItems.forEach((item) => set.add(normalizeBrand(item.brand)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [sourceItems]);

  const sizeOptions = useMemo(() => {
    const set = new Set<string>(BASE_SIZES);
    sourceItems.forEach((item) => {
      itemSizes(item).forEach((size) => set.add(size));
    });
    const order = new Map(BASE_SIZES.map((size, index) => [size, index] as const));
    return Array.from(set).sort((a, b) => {
      const aIndex = order.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = order.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b);
    });
  }, [sourceItems]);

  const handleSwipeRight = (item: Item) => {
    console.log("[ItemsPage] swipe right", item);
    addLike(item);
    const shouldPrefetch = enqueueSwipeEvent({
      type: "swipe_like",
      user_id: userId,
      item_id: item.item_id,
      surface: "items",
      ts: Date.now(),
    });
    advanceDeck();
    if (shouldPrefetch) {
      void requestNextPacket();
    }
  };

  const handleSwipeLeft = (item: Item) => {
    console.log("[ItemsPage] swipe left", item);
    const shouldPrefetch = enqueueSwipeEvent({
      type: "swipe_dislike",
      user_id: userId,
      item_id: item.item_id,
      surface: "items",
      ts: Date.now(),
    });
    advanceDeck();
    if (shouldPrefetch) {
      void requestNextPacket();
    }
  };

  const handleAddToCart = (item: Item) => {
    console.log("[ItemsPage] add to cart", item);
    addToCart(item);
    void sendFeedback([
      {
        type: "add_to_cart",
        user_id: userId,
        item_id: item.item_id,
        quantity: 1,
        surface: "items",
        ts: Date.now(),
      },
    ]);
  };

  const handleShare = (item: Item) => {
    console.log("[ItemsPage] share", item);
    void emitShare(userId, item.item_id, "items");
  };

  console.log("[ItemsPage] render", {
    loading,
    itemsCount: deckItems.length,
    deckCursor,
    prefetchLocked: prefetchLockRef.current,
  });

  const openModal = (modal: typeof activeModal) => {
    if (modal === "price") {
      setTempPriceRange([...filters.price] as [number, number]);
    }
    setActiveModal(modal);
  };

  const closeModal = () => setActiveModal(null);

  const renderModal = () => {
    if (!activeModal) return null;

    const FilterModal = ({
      title,
      children,
    }: {
      title: string;
      children: ReactNode;
    }) => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-6 text-gray-900 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </div>
    );

    if (activeModal === "gender") {
      const allOptions = ["all", ...genderOptions];
      return (
        <FilterModal title="Select Gender">
          <div className="grid gap-2">
            {allOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, gender: option as typeof prev.gender }));
                  closeModal();
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  filters.gender === option
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </FilterModal>
      );
    }

    if (activeModal === "brand") {
      const allOptions = ["all", ...brandOptions];
      return (
        <FilterModal title="Select Brand">
          <div className="grid gap-2">
            {allOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    brand: option as typeof prev.brand,
                  }));
                  closeModal();
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  filters.brand === option
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {option === "all" ? "All Brands" : option}
              </button>
            ))}
          </div>
        </FilterModal>
      );
    }

    if (activeModal === "size") {
      const allOptions = ["all", ...sizeOptions];
      return (
        <FilterModal title="Select Size">
          <div className="grid grid-cols-3 gap-2">
            {allOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    size: option as typeof prev.size,
                  }));
                  closeModal();
                }}
                className={`rounded-xl px-4 py-3 text-center text-sm font-semibold uppercase transition ${
                  filters.size === option
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                }`}
              >
                {option === "all" ? "All" : option}
              </button>
            ))}
          </div>
        </FilterModal>
      );
    }

    if (activeModal === "price") {
      const [minBound, maxBound] = priceBounds;
      const [minValue, maxValue] = tempPriceRange;

      const handleMinChange = (value: number) => {
        setTempPriceRange((prev) => {
          const max = prev[1];
          return [Math.min(value, max), max];
        });
      };

      const handleMaxChange = (value: number) => {
        setTempPriceRange((prev) => {
          const min = prev[0];
          return [min, Math.max(value, min)];
        });
      };

      return (
        <FilterModal title="Select Price Range">
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
              <span>${Math.round(minValue)}</span>
              <span>${Math.round(maxValue)}</span>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min={minBound}
                max={maxBound}
                value={minValue}
                onChange={(event) => handleMinChange(Number(event.target.value))}
                className="w-full"
              />
              <input
                type="range"
                min={minBound}
                max={maxBound}
                value={maxValue}
                onChange={(event) => handleMaxChange(Number(event.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <input
                type="number"
                value={minValue}
                min={minBound}
                max={maxValue}
                onChange={(event) => handleMinChange(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2"
              />
              <span className="px-2 text-gray-500">to</span>
              <input
                type="number"
                value={maxValue}
                min={minValue}
                max={maxBound}
                onChange={(event) => handleMaxChange(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setTempPriceRange([...priceBounds] as [number, number]);
                }}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    price: [...tempPriceRange] as [number, number],
                  }));
                  closeModal();
                }}
                className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Apply
              </button>
            </div>
          </div>
        </FilterModal>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen flex-col p-4 pb-28">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clozyt</h1>
        <span className="text-sm text-gray-500">❤️ {likesCount}</span>
      </header>
      <div className="relative flex-1 overflow-hidden">
        {loading && deckItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Loading recommendations...
          </div>
        ) : (
          <SwipeDeck
            items={deckItems}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onAddToCart={handleAddToCart}
            onShare={handleShare}
          />
        )}
      </div>
      <div className="mt-5 grid grid-cols-4 gap-2 pb-4">
        <button
          type="button"
          onClick={() => openModal("gender")}
          className="rounded-xl bg-white/20 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-white/30"
        >
          Gender
        </button>
        <button
          type="button"
          onClick={() => openModal("price")}
          className="rounded-xl bg-white/20 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-white/30"
        >
          Price
        </button>
        <button
          type="button"
          onClick={() => openModal("brand")}
          className="rounded-xl bg-white/20 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-white/30"
        >
          Brand
        </button>
        <button
          type="button"
          onClick={() => openModal("size")}
          className="rounded-xl bg-white/20 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-white/30"
        >
          Size
        </button>
      </div>
      {renderModal()}
    </div>
  );
};

export default ItemsPage;
