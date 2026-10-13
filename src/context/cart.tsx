"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("wrapy-cart");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return [];
  });
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem("wrapy-cart", JSON.stringify(items));
  }, [items]);

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
  }, []);

  const removeItem = useCallback((productId: string, phoneModel: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.phoneModel === phoneModel))
    );
  }, []);

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
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}
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
