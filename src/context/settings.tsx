"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface Settings {
  primary_color?: string;
  background_color?: string;
  text_color?: string;
  logo_image?: string;
  hero_media?: string;
  hero_media_type?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_button_text?: string;
  hero_button_link?: string;
  hero_poster?: string;
  shipping_price?: string;
  points_per_dinar?: string;
  store_name?: string;
  store_currency?: string;
  announcement_text?: string;
  featured_title?: string;
  tutorial_video_url?: string;
  faq_items?: string;
  instagram_url?: string;
  facebook_url?: string;
  phone_number?: string;
  email_address?: string;
  tiktok_url?: string;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/settings")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load settings");
        return response.json();
      })
      .then((data) => {
        if (mounted) {
          setSettings(data);
          // Apply CSS variables to document root
          const root = document.documentElement;
          if (data.primary_color) root.style.setProperty("--site-brand", data.primary_color);
          if (data.background_color) root.style.setProperty("--site-background", data.background_color);
          if (data.text_color) root.style.setProperty("--site-text", data.text_color);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}
