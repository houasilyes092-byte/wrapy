"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart";
import { formatPrice, calculateShipping, DEFAULT_SHIPPING_PRICE } from "@/lib/utils";
import {
  ShoppingBag,
  Loader2,
  Tag,
  X,
  ArrowLeft,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);

  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    notes: "",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});

  // Generate or retrieve idempotency key for duplicate submission prevention
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const keyLoadedRef = useRef(false);

  useEffect(() => {
    if (keyLoadedRef.current) return;
    keyLoadedRef.current = true;

    let key = sessionStorage.getItem("wrapy-checkout-key");
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem("wrapy-checkout-key", key);
    }
    setIdempotencyKey(key);
  }, []);

  const shipping = calculateShipping(subtotal, DEFAULT_SHIPPING_PRICE);

  const discount = couponApplied?.discount || 0;

  const total = Math.max(0, subtotal + shipping - discount);

  function validateField(name: string, value: string): string {
    switch (name) {
      case "customerName":
        if (!value.trim()) return "Full name is required";
        if (value.trim().length < 2) return "Name must be at least 2 characters";
        return "";
      case "phone":
        if (!value.trim()) return "Phone number is required";
        if (!/^[\d\s+\-()]{8,}$/.test(value)) return "Enter a valid phone number";
        return "";
      case "email":
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email";
        return "";
      case "address":
        if (!value.trim()) return "Address is required";
        if (value.trim().length < 5) return "Address must be at least 5 characters";
        return "";
      case "city":
        if (!value.trim()) return "City is required";
        return "";
      case "postalCode":
        if (value && value.length < 3) return "Enter a valid postal code";
        return "";
      default:
        return "";
    }
  }

  function handleBlur(name: string, value: string) {
    setTouchedFields((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: error }));
  }

  function handleChange(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change if field was touched
    if (touchedFields[name]) {
      const error = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: error }));
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    let isValid = true;

    Object.keys(form).forEach((key) => {
      const error = validateField(key, form[key as keyof typeof form]);
      if (error) {
        errors[key] = error;
        isValid = false;
      }
    });

    setFieldErrors(errors);
    setTouchedFields(
      Object.keys(form).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );
    return isValid;
  }

  async function validateCoupon() {
    if (!couponCode.trim()) {
      return;
    }

    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon");
        setCouponApplied(null);
        return;
      }

      setCouponApplied({
        code: data.code,
        discount: data.discount,
        description: data.description,
      });
    } catch {
      setCouponError("Failed to validate coupon");
      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (items.length === 0) {
      return;
    }

    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          couponCode: couponApplied?.code || "",
          idempotencyKey,
          items: items.map((item) => ({
            productId: item.productId,
            phoneModel: item.phoneModel,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Clear checkout key on successful order
      sessionStorage.removeItem("wrapy-checkout-key");

      clearCart();

      router.push(`/order-success/${data.orderId}`);
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-dark-border mx-auto mb-6" />

        <h1 className="text-2xl font-bold text-white mb-3">
          Your Cart is Empty
        </h1>

        <p className="text-dark-muted mb-8">
          Add some items before checkout.
        </p>

        <Link
          href="/skins"
          className="inline-flex bg-brand text-black font-bold px-8 py-4 rounded-xl text-sm"
        >
          Shop Skins
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">
        Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* =========================
              DELIVERY INFORMATION
          ========================== */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark-card rounded-2xl p-6 border border-dark-border space-y-4">
              <h2 className="text-lg font-semibold text-white mb-2">
                Delivery Information
              </h2>

              {/* Full Name */}
              <div>
                <label className="text-xs text-dark-muted block mb-1.5">
                  Full Name *
                </label>

                <input
                  type="text"
                  required
                  value={form.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  onBlur={(e) => handleBlur("customerName", e.target.value)}
                  className={`w-full bg-dark rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none min-h-[48px] transition-colors ${
                    touchedFields.customerName && fieldErrors.customerName
                      ? "border-red-500 focus:border-red-500"
                      : "border-dark-border focus:border-brand/50"
                  }`}
                  placeholder="Your full name"
                  aria-invalid={touchedFields.customerName && !!fieldErrors.customerName}
                  aria-describedby={touchedFields.customerName && fieldErrors.customerName ? "customerName-error" : undefined}
                />
                {touchedFields.customerName && fieldErrors.customerName && (
                  <p id="customerName-error" className="text-red-400 text-xs mt-1.5" role="alert">
                    {fieldErrors.customerName}
                  </p>
                )}
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-muted block mb-1.5">
                    Phone *
                  </label>

                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    onBlur={(e) => handleBlur("phone", e.target.value)}
                    className={`w-full bg-dark rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none min-h-[48px] transition-colors ${
                      touchedFields.phone && fieldErrors.phone
                        ? "border-red-500 focus:border-red-500"
                        : "border-dark-border focus:border-brand/50"
                    }`}
                    placeholder="+216 XX XXX XXX"
                    aria-invalid={touchedFields.phone && !!fieldErrors.phone}
                    aria-describedby={touchedFields.phone && fieldErrors.phone ? "phone-error" : undefined}
                  />
                  {touchedFields.phone && fieldErrors.phone && (
                    <p id="phone-error" className="text-red-400 text-xs mt-1.5" role="alert">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-dark-muted block mb-1.5">
                    Email
                  </label>

                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={(e) => handleBlur("email", e.target.value)}
                    className={`w-full bg-dark rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none min-h-[48px] transition-colors ${
                      touchedFields.email && fieldErrors.email
                        ? "border-red-500 focus:border-red-500"
                        : "border-dark-border focus:border-brand/50"
                    }`}
                    placeholder="Optional"
                    aria-invalid={touchedFields.email && !!fieldErrors.email}
                    aria-describedby={touchedFields.email && fieldErrors.email ? "email-error" : undefined}
                  />
                  {touchedFields.email && fieldErrors.email && (
                    <p id="email-error" className="text-red-400 text-xs mt-1.5" role="alert">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="text-xs text-dark-muted block mb-1.5">
                  Address *
                </label>

                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  onBlur={(e) => handleBlur("address", e.target.value)}
                  className={`w-full bg-dark rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none min-h-[48px] transition-colors ${
                    touchedFields.address && fieldErrors.address
                      ? "border-red-500 focus:border-red-500"
                      : "border-dark-border focus:border-brand/50"
                  }`}
                  placeholder="Street address"
                  aria-invalid={touchedFields.address && !!fieldErrors.address}
                  aria-describedby={touchedFields.address && fieldErrors.address ? "address-error" : undefined}
                />
                {touchedFields.address && fieldErrors.address && (
                  <p id="address-error" className="text-red-400 text-xs mt-1.5" role="alert">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              {/* City + Postal Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-muted block mb-1.5">
                    City *
                  </label>

                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    onBlur={(e) => handleBlur("city", e.target.value)}
                    className={`w-full bg-dark rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none min-h-[48px] transition-colors ${
                      touchedFields.city && fieldErrors.city
                        ? "border-red-500 focus:border-red-500"
                        : "border-dark-border focus:border-brand/50"
                    }`}
                    placeholder="City"
                    aria-invalid={touchedFields.city && !!fieldErrors.city}
                    aria-describedby={touchedFields.city && fieldErrors.city ? "city-error" : undefined}
                  />
                  {touchedFields.city && fieldErrors.city && (
                    <p id="city-error" className="text-red-400 text-xs mt-1.5" role="alert">
                      {fieldErrors.city}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-dark-muted block mb-1.5">
                    Postal Code
                  </label>

                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    onBlur={(e) => handleBlur("postalCode", e.target.value)}
                    className={`w-full bg-dark rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none min-h-[48px] transition-colors ${
                      touchedFields.postalCode && fieldErrors.postalCode
                        ? "border-red-500 focus:border-red-500"
                        : "border-dark-border focus:border-brand/50"
                    }`}
                    placeholder="Optional"
                    aria-invalid={touchedFields.postalCode && !!fieldErrors.postalCode}
                    aria-describedby={touchedFields.postalCode && fieldErrors.postalCode ? "postalCode-error" : undefined}
                  />
                  {touchedFields.postalCode && fieldErrors.postalCode && (
                    <p id="postalCode-error" className="text-red-400 text-xs mt-1.5" role="alert">
                      {fieldErrors.postalCode}
                    </p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-dark-muted block mb-1.5">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  rows={3}
                  className="w-full bg-dark border border-dark-border rounded-xl px-4 py-3.5 text-base text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50 resize-none min-h-[48px]"
                  placeholder="Any special instructions..."
                />
              </div>
            </div>

            {/* =========================
                PAYMENT METHOD
            ========================== */}
            <div className="bg-dark-card rounded-2xl p-6 border border-dark-border">
              <h2 className="text-lg font-semibold text-white mb-4">
                Payment Method
              </h2>

              <div className="flex items-center gap-3 bg-brand/10 border border-brand/20 rounded-xl p-4">
                <div className="w-3 h-3 rounded-full bg-brand" />

                <div>
                  <p className="text-sm font-medium text-white">
                    Cash on Delivery
                  </p>

                  <p className="text-xs text-dark-muted">
                    Pay when you receive your order
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =========================
              ORDER SUMMARY
          ========================== */}
          <div className="bg-dark-card rounded-2xl p-6 border border-dark-border h-fit sticky top-24">
            <h2 className="text-lg font-bold text-white mb-4">
              Order Summary
            </h2>

            {/* =========================
                CART ITEMS
            ========================== */}
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}-${item.phoneModel}`}
                  className="flex gap-3"
                >
                  {/* Product image */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-dark shrink-0 relative">
                    <Image
                      src={item.productImage || "/placeholder.jpg"}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">
                      {item.productName}
                    </p>

                    {/* PHONE MODEL */}
                    {item.phoneModel && (
                      <div className="flex items-center gap-1 mt-1">
                        <Smartphone className="w-3.5 h-3.5 text-brand" />

                        <p className="text-xs text-brand font-medium">
                          {item.phoneModel}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-dark-muted mt-1">
                      × {item.quantity}
                    </p>
                  </div>

                  {/* Item price */}
                  <p className="text-xs font-medium text-white whitespace-nowrap">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* =========================
                COUPON
            ========================== */}
            <div className="border-t border-dark-border pt-4 mb-4">
              {couponApplied ? (
                <div className="bg-brand/10 rounded-lg px-3 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-brand" />

                      <span className="text-sm text-brand font-medium">
                        {couponApplied.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-dark-muted hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Remove coupon"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {couponApplied.description && (
                    <p className="text-xs text-dark-muted mt-1">
                      {couponApplied.description}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Coupon code"
                    className="flex-1 bg-dark border border-dark-border rounded-lg px-4 py-3 text-sm text-white placeholder:text-dark-muted focus:outline-none focus:border-brand/50 min-h-[48px]"
                  />

                  <button
                    type="button"
                    onClick={validateCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-lg transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </div>
              )}

              {couponError && (
                <p className="text-red-400 text-[11px] mt-1">
                  {couponError}
                </p>
              )}
            </div>

            {/* =========================
                TOTALS
            ========================== */}
            <div className="space-y-2 text-sm border-t border-dark-border pt-4">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>

                <span className="text-white">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>

                <span className="text-white">
                  {formatPrice(shipping)}
                </span>
              </div>

              {shipping === 0 && (
                <p className="text-xs text-brand text-center">Free shipping on orders over 100 DT!</p>
              )}

              {discount > 0 && (
                <div className="flex justify-between text-brand">
                  <span>Discount</span>

                  <span>-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="border-t border-dark-border pt-3 flex justify-between text-white font-bold text-base">
                <span>Total</span>

                <span>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            {/* =========================
                PLACE ORDER
            ========================== */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-black font-bold py-4.5 rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  Place Order — {formatPrice(total)}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}