"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { ShoppingBag, Menu, X, User, Heart } from "lucide-react";
import { useCart } from "@/context/cart";
import { useSettings } from "@/context/settings";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const { settings } = useSettings();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setMenuOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const logo = settings.logo_image || "";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-xl border-b border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <Link href="/" className="flex min-w-0 shrink items-center gap-2 py-2">
            {logo ? (
              <Image
                src={logo}
                alt="Wrapy"
                width={180}
                height={48}
                className="h-auto max-h-10 w-auto max-w-[104px] object-contain min-[375px]:max-w-[128px] sm:max-h-12 sm:max-w-[180px]"
              />
            ) : (
              <>
                <span className="text-xl min-[375px]:text-2xl sm:text-3xl font-black tracking-tighter text-white">
                  WRAPY
                </span>
                <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-brand" />
              </>
            )}
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/skins"
              className="text-sm text-gray-300 hover:text-white transition-colors tracking-wide uppercase"
            >
              Skins
            </Link>

            <Link
              href="/skins?featured=true"
              className="text-sm text-gray-300 hover:text-white transition-colors tracking-wide uppercase"
            >
              Featured
            </Link>

            <Link
              href="/skins?bestseller=true"
              className="text-sm text-gray-300 hover:text-white transition-colors tracking-wide uppercase"
            >
              Best Sellers
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-0 sm:gap-2">
            <Link
              href="/account/wishlist"
              className="text-gray-400 hover:text-white transition-colors p-2.5"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </Link>

            <Link
              href="/account"
              className="text-gray-400 hover:text-white transition-colors p-2.5"
              aria-label="My Account"
            >
              <User className="w-5 h-5" />
            </Link>

            <Link
              href="/cart"
              className="relative text-gray-400 hover:text-white transition-colors p-2.5"
              aria-label={`Cart (${totalItems} items)`}
            >
              <ShoppingBag className="w-5 h-5" />

              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand text-black text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            <button
              className="md:hidden text-gray-400 hover:text-white p-2.5"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          id="mobile-menu"
          className="md:hidden bg-dark border-t border-dark-border animate-fade-in"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <nav className="px-4 py-6 space-y-4">
            <Link
              href="/skins"
              onClick={() => setMenuOpen(false)}
              className="block text-lg text-gray-300 hover:text-white transition-colors"
            >
              All Skins
            </Link>

            <Link
              href="/skins?featured=true"
              onClick={() => setMenuOpen(false)}
              className="block text-lg text-gray-300 hover:text-white transition-colors"
            >
              Featured
            </Link>

            <Link
              href="/skins?bestseller=true"
              onClick={() => setMenuOpen(false)}
              className="block text-lg text-gray-300 hover:text-white transition-colors"
            >
              Best Sellers
            </Link>

            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="block text-lg text-gray-300 hover:text-white transition-colors"
            >
              My Account
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
