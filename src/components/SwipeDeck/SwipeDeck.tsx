"use client";

import { useState, useRef } from "react";
import { useGesture } from "@use-gesture/react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "./ProductCard";
import Overlays from "./Overlays";
import { Item } from "../../lib/events";


const SwipeDeck = ({ items }: { items: Item[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);

  const gestureRef = useRef<HTMLDivElement>(null);

  useGesture(
    {
      onDrag: ({ movement: [mx], velocity: [vx], direction: [dx] }) => {
        if (Math.abs(mx) > 120 || Math.abs(vx) > 0.5) {
          setDirection(dx > 0 ? "right" : "left");
          setCurrentIndex((prev) => prev + 1);
        }
      },
    },
    { target: gestureRef }
  );

  const currentItem = items[currentIndex];

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {currentItem && (
          <motion.div
            key={currentItem.item_id}
            ref={gestureRef} // Attach gesture handling via useRef
            className="absolute inset-0"
            initial={{ x: 0, opacity: 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction === "right" ? 300 : -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <ProductCard item={currentItem} />
            <Overlays direction={direction} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwipeDeck;