"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGesture } from "@use-gesture/react";
import { AnimatePresence, motion } from "framer-motion";
import ProductCard from "./ProductCard";
import Overlays from "./Overlays";
import { Item } from "../../lib/events";

type SwipeDeckProps = {
  items: Item[];
  onSwipeLeft?: (item: Item) => void;
  onSwipeRight?: (item: Item) => void;
  onAddToCart?: (item: Item) => void;
  onShare?: (item: Item) => void;
};

const SwipeDeck = ({
  items,
  onSwipeLeft,
  onSwipeRight,
  onAddToCart,
  onShare,
}: SwipeDeckProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [leavingDirection, setLeavingDirection] = useState<"left" | "right" | null>(
    null
  );
  const [leavingItemId, setLeavingItemId] = useState<string | null>(null);
  const currentItem = items[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setLeavingDirection(null);
    setLeavingItemId(null);
    console.log("[SwipeDeck] received new items", { count: items.length });
  }, [items]);

  console.log("[SwipeDeck] render", {
    itemsCount: items.length,
    currentIndex,
    hasCurrentItem: Boolean(currentItem),
  });

  const finalizeSwipe = useCallback(
    (direction: "left" | "right", item: Item) => {
      setLeavingDirection(direction);
      setLeavingItemId(item.item_id);

      if (direction === "left") {
        onSwipeLeft?.(item);
      } else {
        onSwipeRight?.(item);
      }

      setCurrentIndex((prev) => prev + 1);

      setTimeout(() => {
        setLeavingDirection(null);
        setLeavingItemId(null);
      }, 300);
    },
    [onSwipeLeft, onSwipeRight]
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!currentItem) return;

      if ((event.target as HTMLElement).closest("button")) {
        return;
      }

      const { left, width } = event.currentTarget.getBoundingClientRect();
      const relativeX = event.clientX - left;
      const third = width / 3;

      if (relativeX < third) {
        finalizeSwipe("left", currentItem);
      } else if (relativeX > 2 * third) {
        finalizeSwipe("right", currentItem);
      }
    },
    [currentItem, finalizeSwipe]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!currentItem) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        finalizeSwipe("left", currentItem);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        finalizeSwipe("right", currentItem);
      }
    },
    [currentItem, finalizeSwipe]
  );

  const bind = useGesture({
    onDragEnd: ({ movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (!currentItem) return;
      const shouldSwipe = Math.abs(mx) > 80 || Math.abs(vx) > 0.5;
      if (!shouldSwipe) {
        return;
      }
      const direction = dx > 0 ? "right" : "left";
      finalizeSwipe(direction, currentItem);
    },
  });

  const exitX = useMemo(() => {
    if (leavingDirection === "right") return 300;
    if (leavingDirection === "left") return -300;
    return 0;
  }, [leavingDirection]);

  return (
    <div
      className="relative h-full w-full min-h-[70vh]"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="presentation"
    >
      <AnimatePresence mode="wait">
        {currentItem && (
          <motion.div
            key={currentItem.item_id}
            className="absolute inset-0 flex h-full"
            initial={{ x: 0, opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: exitX, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            {...bind()}
          >
            <ProductCard
              item={currentItem}
              onAddToCart={() => onAddToCart?.(currentItem)}
              onShare={() => onShare?.(currentItem)}
            />
            <Overlays
              direction={
                leavingItemId === currentItem.item_id ? leavingDirection : null
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwipeDeck;
