import { WeaknessCard } from "./weakness-card";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * @param {object} props
 * @param {string} props.courseId
 * @param {object[]} props.items
 * @param {{ page: number, limit: number, total: number, totalPages: number }} props.pagination
 */
export async function WeaknessList({ courseId, items, pagination }) {
  const t = await getTranslations("Remediation");
  const tCommon = await getTranslations("Common");

  if (!items.length) {
    return null;
  }

  const { page, totalPages } = pagination;
  const base = `/dashboard/remediation?courseId=${encodeURIComponent(courseId)}`;

  return (
    <section className="space-y-4" aria-labelledby="weakness-list-heading">
      <h2 id="weakness-list-heading" className="text-xl font-semibold">
        {t("weaknessListTitle")}
      </h2>
      <ul className="m-0 list-none space-y-3 p-0">
        {items.map((item) => (
          <li key={item.id}>
            <WeaknessCard item={item} />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 pt-2"
          aria-label={t("paginationNavLabel")}
        >
          <p className="text-sm text-muted-foreground">
            {t("pageOf", { page, totalPages })}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`${base}&page=${page - 1}`}>
                  <ChevronLeft className="h-4 w-4 me-1" aria-hidden />
                  <span>{tCommon("back")}</span>
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4 me-1" aria-hidden />
                <span>{tCommon("back")}</span>
              </Button>
            )}
            {page < totalPages ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`${base}&page=${page + 1}`}>
                  <span>{tCommon("next")}</span>
                  <ChevronRight className="h-4 w-4 ms-1" aria-hidden />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <span>{tCommon("next")}</span>
                <ChevronRight className="h-4 w-4 ms-1" aria-hidden />
              </Button>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
