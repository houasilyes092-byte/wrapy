"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface ResponsiveTableProps<T> {
  items: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  cardKeyFields?: string[];
}

export function ResponsiveTable<T>({
  items,
  columns,
  keyExtractor,
  emptyMessage = "No items found",
  loading = false,
  cardKeyFields,
}: ResponsiveTableProps<T>) {
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleCard = (key: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-8 text-center text-dark-muted">Loading...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden">
        <div className="p-8 text-center text-dark-muted text-sm">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-2xl border border-dark-border overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left text-xs text-dark-muted font-medium px-4 py-3 uppercase tracking-wider ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""} ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={keyExtractor(item)} className="border-b border-dark-border/50 hover:bg-white/[0.02]">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""} ${col.className || ""}`}
                  >
                    {col.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-dark-border">
        {items.map((item) => {
          const key = keyExtractor(item);
          const isExpanded = expandedCards.has(key);
          const showToggle = cardKeyFields && cardKeyFields.length > 0;

          return (
            <div key={key} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {columns.map((col) => (
                    <div key={col.key} className="mb-2">
                      <span className="text-[11px] text-dark-muted uppercase tracking-wider font-medium mr-2">
                        {col.header}
                      </span>
                      <span className="text-sm text-white break-words">{col.render(item, 0)}</span>
                    </div>
                  ))}
                </div>
                {showToggle && (
                  <button
                    onClick={() => toggleCard(key)}
                    className="flex-shrink-0 ml-4 p-1 text-dark-muted hover:text-white transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`card-${key}`}
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                )}
              </div>

              {showToggle && (
                <div
                  id={`card-${key}`}
                  className={`mt-3 overflow-hidden transition-all duration-200 ${
                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pt-2 border-t border-dark-border/50">
                    {cardKeyFields!.map((fieldKey) => {
                      const col = columns.find((c) => c.key === fieldKey);
                      if (!col) return null;
                      return (
                        <div key={col.key} className="mb-2">
                          <span className="text-[11px] text-dark-muted uppercase tracking-wider font-medium mr-2">
                            {col.header}
                          </span>
                          <span className="text-sm text-white break-words">{col.render(item, 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}