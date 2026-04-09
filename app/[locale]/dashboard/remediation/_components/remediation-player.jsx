"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { markWeaknessViewed, startRemediationSession } from "@/app/actions/remediation";
import { Loader2 } from "lucide-react";

const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

/**
 * Embedded remediation player (optional). Pass a direct stream or embed URL (e.g. lesson video URL).
 * @param {object} props
 * @param {string} [props.url]
 * @param {number} [props.startSeconds]
 * @param {string} [props.className]
 */
export function RemediationPlayer({ url, startSeconds = 0, className }) {
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const t = useTranslations("Remediation");

  useEffect(() => {
    if (!url || !ready || !playerRef.current || typeof startSeconds !== "number") return;
    const timer = setTimeout(() => {
      const p = playerRef.current;
      if (p?.seekTo) p.seekTo(startSeconds, "seconds");
    }, 400);
    return () => clearTimeout(timer);
  }, [url, ready, startSeconds]);

  if (!url) return null;

  return (
    <div
      className={
        className ??
        "relative aspect-video w-full max-w-3xl overflow-hidden rounded-lg border bg-black"
      }
      role="region"
      aria-label={t("videoPlayerLabel")}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        controls
        width="100%"
        height="100%"
        onReady={() => setReady(true)}
        config={{ file: { attributes: { controlsList: "nodownload" } } }}
      />
    </div>
  );
}

/**
 * @param {object} props
 * @param {object} props.item — weakness item from getWeaknessProfile (includes reviewHref, videoSegment, viewedAt)
 */
export function ReviewConceptButton({ item }) {
  const t = useTranslations("Remediation");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasVideo = !!item.videoSegment?.lessonId;
  const canNavigate = hasVideo && !!item.reviewHref;

  const onReview = useCallback(() => {
    if (!canNavigate || !item.videoSegment || !item.reviewHref) return;
    startTransition(async () => {
      const viewedRes = await markWeaknessViewed({ weaknessItemId: item.id });
      if (!viewedRes.success) return;
      const sessionRes = await startRemediationSession({
        weaknessItemId: item.id,
        lessonId: item.videoSegment.lessonId,
        startTimestamp: item.videoSegment.startTimestamp ?? 0,
      });
      if (!sessionRes.success) {
        console.warn("[ReviewConceptButton] startRemediationSession failed", sessionRes.error);
      }
      router.push(item.reviewHref);
    });
  }, [canNavigate, item, router]);

  const label = t("reviewConcept");
  const disabled = !canNavigate || pending;

  const button = (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={disabled}
      onClick={onReview}
      aria-label={label}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span className="sr-only">{t("openingReview")}</span>
        </>
      ) : null}
      {label}
    </Button>
  );

  if (!hasVideo) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button type="button" size="sm" variant="secondary" disabled aria-disabled="true">
                {label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("reviewUnavailable")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!item.reviewHref) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button type="button" size="sm" variant="secondary" disabled aria-disabled="true">
                {label}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("reviewUnavailable")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
