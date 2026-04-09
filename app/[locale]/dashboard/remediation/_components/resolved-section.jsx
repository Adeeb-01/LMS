import { WeaknessCard } from "./weakness-card";
import { getTranslations } from "next-intl/server";

/**
 * @param {object} props
 * @param {object[]} props.items
 */
export async function ResolvedSection({ items }) {
  const t = await getTranslations("Remediation");

  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-4 pt-8 border-t border-slate-200" aria-labelledby="resolved-heading">
      <h2 id="resolved-heading" className="text-xl font-semibold text-muted-foreground">
        {t("resolvedSectionTitle")}
      </h2>
      <ul className="space-y-3 list-none p-0 m-0 opacity-90">
        {items.map((item) => (
          <li key={item.id}>
            <WeaknessCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
