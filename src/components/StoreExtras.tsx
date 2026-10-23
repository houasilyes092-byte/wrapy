"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = { question: string; answer: string };

export function TutorialSection({ videoUrl }: { videoUrl: string }) {
  if (!videoUrl.trim()) return null;
  return <section className="bg-dark-card px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="tutorial-title"><div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-2"><div><p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand">Tutoriel</p><h2 id="tutorial-title" className="text-3xl font-bold text-white sm:text-4xl">Comment appliquer votre skin</h2><p className="mt-4 max-w-xl text-gray-400">Suivez les étapes de la vidéo pour poser votre skin avec soin.</p></div><div className="aspect-video overflow-hidden rounded-2xl border border-dark-border bg-dark"><video src={videoUrl} controls playsInline preload="metadata" className="h-full w-full" aria-label="Tutoriel : comment appliquer votre skin" /></div></div></section>;
}

/** Keyboard-accessible accordion (native buttons, aria-expanded/controls). */
export function FaqAccordion({ items, idPrefix }: { items: FaqItem[]; idPrefix: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-dark-border rounded-xl border border-dark-border bg-dark-card px-4 sm:px-5">
      {items.map((item, index) => {
        const expanded = open === index;
        const panelId = `${idPrefix}-panel-${index}`;
        const buttonId = `${idPrefix}-button-${index}`;
        return (
          <div key={`${item.question}-${index}`}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : index)}
                className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                {item.question}
                <ChevronDown className={`h-4 w-4 shrink-0 text-brand transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`} />
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!expanded} className="whitespace-pre-line pb-4 text-sm leading-relaxed text-gray-300">
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Homepage section: a few published questions and a link to /faq. Hidden when empty. */
export function FAQSection({ items, total }: { items: FaqItem[]; total: number }) {
  if (items.length === 0) return null;
  return (
    <section lang="fr" className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="faq-title">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-brand">Aide</p>
        <h2 id="faq-title" className="mb-8 text-center text-2xl sm:text-3xl font-bold text-white">Questions fréquentes</h2>
        <FaqAccordion items={items} idPrefix="home-faq" />
        {total > items.length && (
          <p className="mt-6 text-center">
            <a href="/faq" className="text-sm font-medium text-brand hover:underline">Voir toutes les questions ({total})</a>
          </p>
        )}
      </div>
    </section>
  );
}
