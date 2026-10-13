"use client";

import { useSettings } from "@/context/settings";

export default function SiteTheme() {
  const { loading } = useSettings();

  // Theme is applied in SettingsProvider, this component just prevents flash
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-dark flex items-center justify-center" aria-hidden="true">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return null;
}
