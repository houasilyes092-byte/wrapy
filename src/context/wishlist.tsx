"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

export interface WishlistItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
  slug: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  isInWishlist: (productId: string) => boolean;
  addItem: (item: WishlistItem) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItem: (item: WishlistItem) => Promise<void>;
  totalItems: number;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = "wrapy-wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  // Keep the server render and the browser's first render identical. Browser
  // storage is only available after hydration, so load it in an effect below.
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const syncingRef = useRef(false);

  // Load the guest wishlist after hydration.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setItems(parsed as WishlistItem[]);
          }
        }
      } catch {
        // Storage can be unavailable or contain invalid JSON; an empty wishlist
        // remains usable and the next change will replace the invalid value.
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  // Do not persist the server's empty initial state over saved browser data.
  useEffect(() => {
    if (!loading) {
      try {
        window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Wishlist changes still work in memory when storage is unavailable.
      }
    }
  }, [items, loading]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return items.some((item) => item.productId === productId);
  }, [items]);

  const syncWithServer = useCallback(async (action: "add" | "remove", item: WishlistItem) => {
    // Prevent duplicate syncs
    if (syncingRef.current) return;
    syncingRef.current = true;

    try {
      const url = action === "remove"
        ? `/api/wishlist?productId=${encodeURIComponent(item.productId)}`
        : "/api/wishlist";
      const response = await fetch(url, {
        method: action === "add" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: action === "add" ? JSON.stringify({ productId: item.productId }) : undefined,
      });

      if (response.status === 401) {
        // User not authenticated - that's fine, we use localStorage
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Wishlist sync failed");
      }
    } catch (error) {
      // Silently fail - localStorage is the source of truth for guests
      console.warn("Wishlist server sync failed:", error);
    } finally {
      syncingRef.current = false;
    }
  }, []);

  const addItem = useCallback(async (item: WishlistItem) => {
    if (isInWishlist(item.productId)) return;

    setItems((prev) => [...prev, item]);
    await syncWithServer("add", item);
  }, [isInWishlist, syncWithServer]);

  const removeItem = useCallback(async (productId: string) => {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;

    setItems((prev) => prev.filter((i) => i.productId !== productId));
    await syncWithServer("remove", item);
  }, [items, syncWithServer]);

  const toggleItem = useCallback(async (item: WishlistItem) => {
    if (isInWishlist(item.productId)) {
      await removeItem(item.productId);
    } else {
      await addItem(item);
    }
  }, [isInWishlist, addItem, removeItem]);

  const totalItems = items.length;

  return (
    <WishlistContext.Provider
      value={{ items, isInWishlist, addItem, removeItem, toggleItem, totalItems, loading }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within WishlistProvider");
  return context;
}
