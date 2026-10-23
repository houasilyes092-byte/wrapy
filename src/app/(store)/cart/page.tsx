"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/cart";
import { formatPrice, calculateShipping, parseShippingPrice } from "@/lib/utils";
import { useSettings } from "@/context/settings";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, totalItems, ready } = useCart();
  const { settings } = useSettings();
  const shipping = calculateShipping(subtotal, parseShippingPrice(settings.shipping_price));
  const total = subtotal + shipping;

  // Until the saved cart is read, render a quiet placeholder rather than
  // flashing "Your Cart is Empty".
  if (!ready) {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-dark-border mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-white mb-3">Your Cart is Empty</h1>
        <p className="text-dark-muted mb-8">Browse our collection and find something you love.</p>
        <Link
          href="/skins"
          className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold px-8 py-4 rounded-xl text-sm uppercase tracking-wider transition-all min-h-[52px]"
        >
          Shop Skins
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">
        Cart <span className="text-dark-muted text-lg font-normal">({totalItems} items)</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={`${item.productId}-${item.phoneModel}`}
              className="flex gap-4 bg-dark-card rounded-2xl p-4 border border-dark-border"
            >
              <Link href={`/skins/${item.slug}`} className="shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-dark relative">
                  <Image
                    src={item.productImage || "/placeholder.svg"}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80px, 96px"
                  />
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/skins/${item.slug}`}>
                  <h3 className="text-sm font-semibold text-white truncate hover:text-brand transition-colors">
                    {item.productName}
                  </h3>
                </Link>
                {item.phoneModel && (
                  <p className="text-xs text-dark-muted mt-0.5">{item.phoneModel}</p>
                )}
                <p className="text-sm font-bold text-white mt-2">{formatPrice(item.price)}</p>

                <div className="flex items-center justify-between mt-3">
                  <div className="inline-flex items-center bg-dark border border-dark-border rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.productId, item.phoneModel, item.quantity - 1)}
                      className="px-3.5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2.5 text-sm text-white font-medium min-w-[40px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.phoneModel, item.quantity + 1)}
                      className="px-3.5 py-2.5 text-gray-400 hover:text-white hover:bg-white/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId, item.phoneModel)}
                    className="text-dark-muted hover:text-red-400 transition-colors p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-dark-card rounded-2xl p-6 border border-dark-border h-fit sticky top-24 lg:sticky">
          <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span className="text-white">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Shipping</span>
              <span className="text-white">{formatPrice(shipping)}</span>
            </div>
            {shipping === 0 && (
              <p className="text-xs text-brand text-center">Free shipping on orders over 100 DT!</p>
            )}
            <div className="border-t border-dark-border pt-3 flex justify-between text-white font-bold text-base">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
          <Link
            href="/checkout"
            className="mt-6 w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold py-4 rounded-xl text-sm uppercase tracking-wider transition-all min-h-[52px]"
          >
            Checkout
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/skins" className="block text-center text-xs text-dark-muted hover:text-white mt-4 transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
