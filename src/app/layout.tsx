import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CartProvider } from "@/context/cart";
import { SettingsProvider } from "@/context/settings";
import { WishlistProvider } from "@/context/wishlist";
import SiteTheme from "@/components/SiteTheme";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "WRAPY — Premium Phone Skins",
  description: "Wrap your world. Premium phone skins designed for those who demand excellence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark text-white antialiased min-h-screen">
        <ErrorBoundary>
          <SettingsProvider>
            <CartProvider>
              <WishlistProvider>
                <SiteTheme />
                {children}
              </WishlistProvider>
            </CartProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

