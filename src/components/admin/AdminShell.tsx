"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Smartphone,
  Layers,
  Tag,
  Users,
  Star,
  Settings,
  LogOut,
  Menu, HelpCircle } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/phone-models", label: "Phone Models", icon: Smartphone },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminShell({
  children,
  adminName,
}: {
  children: ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    // Replace, then refresh so no page cached for the old session is reused.
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6 border-b border-dark-border">
        <Link
          href="/admin"
          className="text-xl font-black tracking-tighter text-white"
        >
          WRAPY<span className="text-brand">.</span>
        </Link>
        <p className="text-[10px] text-dark-muted mt-0.5 uppercase tracking-wider">
          Admin Panel
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? "bg-brand/10 text-brand font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-dark-border">
        <div className="flex items-center justify-between px-3">
          <div>
            <p className="text-sm text-white font-medium">{adminName}</p>
            <p className="text-[10px] text-dark-muted">Administrator</p>
          </div>

          <button
            onClick={handleLogout}
            className="text-dark-muted hover:text-red-400 transition-colors p-1.5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-dark">
      <aside className="hidden lg:block w-64 bg-dark-card border-r border-dark-border fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />

          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-dark-card border-r border-dark-border">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-xl border-b border-dark-border px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white p-1.5"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <Link
              href="/"
              className="text-xs text-dark-muted hover:text-white transition-colors"
            >
              View Store ?
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
