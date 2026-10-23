"use client";

import { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from "react";

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  phoneModel: string;
  price: number;
  quantity: number;
  slug: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, phoneModel: string) => void;
  updateQuantity: (productId: string, phoneModel: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  /** False during server render and hydration, before the saved cart is read. */
  ready: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// The cart lives in localStorage, which the server cannot see. Reading it
// through useSyncExternalStore lets the server and the hydration pass both
// render an empty cart, then switch to the saved cart right after hydration,
// instead of rendering different HTML on the client (React error #418).
const STORAGE_KEY = "wrapy-cart";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function readCart(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedItems;
  }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? (parsed as CartItem[]) : EMPTY;
  } catch {
    cachedItems = EMPTY;
  }
  return cachedItems;
}

function writeCart(items: CartItem[]) {
  cachedItems = items;
  try {
    cachedRaw = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, cachedRaw);
  } catch {
    // Storage unavailable (private mode, quota): keep the cart in memory.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerCart = () => EMPTY;
const noopSubscribe = () => () => {};

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, readCart, getServerCart);
  const ready = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const setItems = useCallback((update: (prev: CartItem[]) => CartItem[]) => {
    writeCart(update(readCart()));
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === item.productId && i.phoneModel === item.phoneModel
      );
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId && i.phoneModel === item.phoneModel
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });
  }, [setItems]);

  const removeItem = useCallback((productId: string, phoneModel: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.phoneModel === phoneModel))
    );
  }, [setItems]);

  const updateQuantity = useCallback(
    (productId: string, phoneModel: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, phoneModel);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.phoneModel === phoneModel
            ? { ...i, quantity }
            : i
        )
      );
    },
    [removeItem, setItems]
  );

  const clearCart = useCallback(() => {
    setItems(() => []);
  }, [setItems]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal, ready }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
