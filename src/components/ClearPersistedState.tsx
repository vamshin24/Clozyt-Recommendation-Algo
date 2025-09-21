"use client";

import { useEffect } from "react";

const PERSIST_KEYS = ["user-storage", "likes-storage", "cart-storage"] as const;
const FLAG = "__CLOZYT_STORAGE_CLEARED__" as const;

type WindowWithFlag = Window & { [FLAG]?: boolean };

const ClearPersistedState = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const scopedWindow = window as WindowWithFlag;
    if (scopedWindow[FLAG]) {
      return;
    }

    try {
      sessionStorage.clear();
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Bootstrap] failed to clear sessionStorage", error);
      }
    }

    try {
      const storage = window.localStorage;
      for (const key of PERSIST_KEYS) {
        storage.removeItem(key);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Bootstrap] failed to clear localStorage", error);
      }
    }

    scopedWindow[FLAG] = true;

    if (process.env.NODE_ENV !== "production") {
      console.log("[Bootstrap] cleared persisted state on startup");
    }
  }, []);

  return null;
};

export default ClearPersistedState;
