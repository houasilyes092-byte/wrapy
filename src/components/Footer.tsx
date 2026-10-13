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

  return (
    <footer className="bg-dark border-t border-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* BRAND */}
          <div>
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
              <div className="flex items-center gap-4 mt-6">

                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="text-dark-muted hover:text-brand transition-colors"
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
                    className="text-dark-muted hover:text-brand transition-colors"
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
                    className="text-dark-muted hover:text-brand transition-colors"
                  >
                    <span className="text-lg font-bold">♪</span>
                  </a>
                )}

              </div>
            )}
          </div>

          {/* SHOP */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Shop
            </h4>

            <ul className="space-y-3">
              <li>
                <Link href="/#faq-title" className="text-sm text-dark-muted hover:text-white transition-colors">Questions fréquentes</Link>
              </li>
              <li>
                <Link
                  href="/skins"
                  className="text-sm text-dark-muted hover:text-white transition-colors"
                >
                  All Skins
                </Link>
              </li>

              <li>
                <Link
                  href="/skins?bestseller=true"
                  className="text-sm text-dark-muted hover:text-white transition-colors"
                >
                  Best Sellers
                </Link>
              </li>

              <li>
                <Link
                  href="/skins?featured=true"
                  className="text-sm text-dark-muted hover:text-white transition-colors"
                >
                  Featured
                </Link>
              </li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h4>

            <ul className="space-y-3">
              <li>
                <Link
                  href="/account/orders"
                  className="text-sm text-dark-muted hover:text-white transition-colors"
                >
                  Track Order
                </Link>
              </li>

              <li>
                <Link
                  href="/account"
                  className="text-sm text-dark-muted hover:text-white transition-colors"
                >
                  My Account
                </Link>
              </li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Contact
            </h4>

            <ul className="space-y-3">

              {phone && (
                <li>
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-2 text-sm text-dark-muted hover:text-white transition-colors"
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
                    className="flex items-center gap-2 text-sm text-dark-muted hover:text-white transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {email}
                  </a>
                </li>
              )}

            </ul>
          </div>

        </div>

        <div className="border-t border-dark-border mt-12 pt-8 text-center">
          <p className="text-xs text-dark-muted">
            © {new Date().getFullYear()} Wrapy. All rights reserved. Premium phone skins.
          </p>
        </div>

      </div>
    </footer>
  );
}
