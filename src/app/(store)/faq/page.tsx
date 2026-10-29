import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/StoreExtras";
import { getPublishedFaq, type PublicFaqItem } from "@/lib/faq";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Frequently Asked Questions — WRAPY",
  description: "Find answers to common questions about Wrapy, our products, and your order.",
  alternates: { canonical: "/faq" },
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

  // "Contact us" is offered only when the store has contact details set (admin -> settings).
  let contact: { phone: string; email: string } = { phone: "", email: "" };
  try {
    const rows = await db.select({ key: settings.key, value: settings.value }).from(settings).where(inArray(settings.key, ["phone_number", "email_address"]));
    for (const row of rows) {
      if (row.key === "phone_number") contact.phone = row.value.trim();
      if (row.key === "email_address") contact.email = row.value.trim();
    }
  } catch {
    contact = { phone: "", email: "" };
  }
  const contactHref = contact.email ? `mailto:${contact.email}` : contact.phone ? `tel:${contact.phone.replace(/[^+\d]/g, "")}` : "";

  const groups: { category: string; items: PublicFaqItem[] }[] = [];
  for (const item of items) {
    const group = groups.find((g) => g.category === item.category);
    if (group) group.items.push(item);
    else groups.push({ category: item.category, items: [item] });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-brand">Help</p>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Frequently Asked Questions</h1>
      <p className="mt-3 text-sm text-gray-400 sm:text-base">Find answers to common questions about Wrapy, our products, and your order.</p>

      {failed ? (
        <p role="alert" className="mt-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          We couldn&apos;t load the questions. Please try again in a moment.
        </p>
      ) : groups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dark-border bg-dark-card p-8 text-center">
          <p className="text-sm text-gray-300">Answers to common questions are coming soon.</p>
          <Link href="/skins" className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-brand hover:underline">Browse skins</Link>
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

      {contactHref && !failed && (
        <p className="mt-10 rounded-xl border border-dark-border bg-dark-card px-4 py-4 text-center text-sm text-gray-300">
          Still have questions?{" "}
          <a href={contactHref} className="inline-flex min-h-8 items-center font-medium text-brand hover:underline">Contact us.</a>
        </p>
      )}
    </div>
  );
}
