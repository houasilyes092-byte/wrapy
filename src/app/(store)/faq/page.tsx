import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/StoreExtras";
import { getPublishedFaq, type PublicFaqItem } from "@/lib/faq";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Questions fréquentes — WRAPY",
  description: "Produits, commandes, livraison, paiement et Wrapy Rewards.",
};

export default async function FaqPage() {
  let items: PublicFaqItem[] = [];
  let failed = false;
  try {
    items = await getPublishedFaq();
  } catch (error) {
    failed = true;
    console.error("[FAQ_PAGE_FAILED]", { name: error instanceof Error ? error.name : "UnknownError" });
  }

  const groups: { category: string; items: PublicFaqItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.category === item.category);
    if (group) group.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }

  return (
    <div lang="fr" className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand">Aide</p>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Questions fréquentes</h1>

      {failed ? (
        <p role="alert" className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          Les questions n&apos;ont pas pu être chargées. Veuillez réessayer dans un instant.
        </p>
      ) : groups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dark-border bg-dark-card p-8 text-center">
          <p className="text-sm text-gray-300">Les questions fréquentes arrivent bientôt.</p>
          <Link href="/skins" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Découvrir les skins</Link>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {groups.map((group, index) => (
            <section key={group.category} aria-labelledby={`faq-group-${index}`}>
              <h2 id={`faq-group-${index}`} className="mb-4 text-lg font-semibold text-white">{group.category}</h2>
              <FaqAccordion items={group.items} idPrefix={`faq-${index}`} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
