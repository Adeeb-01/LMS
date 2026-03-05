import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Reusable badge component for displaying publish status.
 * Supports published, draft, and deleted states.
 * 
 * @param {Object} props
 * @param {boolean} [props.published] - Legacy prop for published state
 * @param {boolean} [props.deleted] - Legacy prop for deleted state
 * @param {string} [props.status] - Explicit status ('published', 'draft', 'deleted')
 * @param {string} [props.className] - Additional CSS classes
 */
export const PublishBadge = ({ published, deleted, status, className }) => {
  const t = useTranslations("CourseEdit");

  const variants = {
    published: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20",
    draft: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20",
    deleted: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
  };

  const labels = {
    published: t("published"),
    draft: t("draft"),
    deleted: t("deleted"),
  };

  const resolvedStatus = status || (deleted ? "deleted" : published ? "published" : "draft");
  const currentVariant = variants[resolvedStatus] || variants.draft;
  const currentLabel = labels[resolvedStatus] || labels.draft;

  return (
    <Badge className={cn("capitalize", currentVariant, className)}>
      {currentLabel}
    </Badge>
  );
};

export default PublishBadge;
