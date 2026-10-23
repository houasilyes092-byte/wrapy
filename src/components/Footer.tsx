"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, Mail, Phone } from "lucide-react";
import { useSettings } from "@/context/settings";

export default function Footer() {
  const { settings } = useSettings();

  const logo = settings.logo_image || "";
  const instagram = settings.instagram_url || "";
  const facebook = settings.facebook_url || "";
  const tiktok = settings.tiktok_url || "";
  const phone = settings.phone_number || "";
  const email = settings.email_address || "";
  // Link to /faq only when it has published questions (computed by /api/settings).
  const hasFaq = settings.has_faq === "true";

  return (
    <footer className="bg-dark border-t border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">

          {/* BRAND */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center mb-3">
              {logo ? (
                <Image
                  src={logo}
                  alt="Wrapy"
                  width={180}
                  height={64}
                  className="max-w-[180px] max-h-16 object-contain"
                />
              ) : (
                <h3 className="text-2xl font-black tracking-tighter text-white">
                  WRAPY<span className="text-brand">.</span>
                </h3>
              )}
            </Link>

            <p className="text-sm text-dark-muted leading-relaxed">
              Wrap your world. Premium phone skins designed for those who demand excellence.
            </p>

            {/* SOCIAL LINKS */}
            {(instagram || facebook || tiktok) && (
              <div className="flex items-center gap-2 mt-5 -ml-2.5">

                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="inline-flex h-11 w-11 items-center justify-center text-dark-muted hover:text-brand transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                  </a>
                )}

                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="inline-flex h-11 w-11 items-center justify-center text-dark-muted hover:text-brand transition-colors"
                  >
                    <span className="text-lg font-bold">f</span>
                  </a>
                )}

                {tiktok && (
                  <a
                    href={tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="inline-flex h-11 w-11 items-center justify-center text-dark-muted hover:text-brand transition-colors"
                  >
                    <span className="text-lg font-bold">♪</span>
                  </a>
                )}

              </div>
            )}
          </div>

          {/* SHOP */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Shop
            </h4>

            <ul className="space-y-1">
              {hasFaq && (
                <li>
                  <Link href="/faq" className="inline-flex min-h-9 items-center text-sm text-dark-muted hover:text-white transition-colors">FAQ</Link>
                </li>
              )}
              <li>
                <Link
                  href="/skins"
                  className="inline-flex min-h-9 items-center text-sm text-dark-muted hover:text-white transition-colors"
                >
                  All Skins
                </Link>
              </li>

              <li>
                <Link
                  href="/skins?bestseller=true"
                  className="inline-flex min-h-9 items-center text-sm text-dark-muted hover:text-white transition-colors"
                >
                  Best Sellers
                </Link>
              </li>

              <li>
                <Link
                  href="/skins?featured=true"
                  className="inline-flex min-h-9 items-center text-sm text-dark-muted hover:text-white transition-colors"
                >
                  Featured
                </Link>
              </li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Support
            </h4>

            <ul className="space-y-1">
              <li>
                <Link
                  href="/account/orders"
                  className="inline-flex min-h-9 items-center text-sm text-dark-muted hover:text-white transition-colors"
                >
                  Track Order
                </Link>
              </li>

              <li>
                <Link
                  href="/account"
                  className="inline-flex min-h-9 items-center text-sm text-dark-muted hover:text-white transition-colors"
                >
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* CONTACT (only when the store has contact details) */}
          {(phone || email) && (
          <div className="col-span-2 sm:col-span-1">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              Contact
            </h4>

            <ul className="space-y-1">

              {phone && (
                <li>
                  <a
                    href={`tel:${phone}`}
                    className="flex min-h-9 items-center gap-2 break-all text-sm text-dark-muted hover:text-white transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {phone}
                  </a>
                </li>
              )}

              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="flex min-h-9 items-center gap-2 break-all text-sm text-dark-muted hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {email}
                  </a>
                </li>
              )}

            </ul>
          </div>
          )}

        </div>

        <div className="border-t border-dark-border mt-10 pt-6 text-center sm:mt-12 sm:pt-8">
          <p className="text-xs text-dark-muted">
            © {new Date().getFullYear()} Wrapy. All rights reserved. Premium phone skins.
          </p>
        </div>

      </div>
    </footer>
  );
}
