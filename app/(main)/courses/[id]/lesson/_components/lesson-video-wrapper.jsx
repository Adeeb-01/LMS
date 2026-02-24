"use client";

import dynamic from "next/dynamic";

/**
 * Client wrapper so we can use ssr: false with next/dynamic.
 * LessonVideo uses ReactPlayer and window — ssr: false avoids hydration errors.
 */
const LessonVideo = dynamic(
  () => import("./lesson-video").then((m) => m.LessonVideo),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-video bg-muted rounded-lg flex items-center justify-center animate-pulse">
        <span className="text-muted-foreground">Loading video...</span>
      </div>
    ),
  }
);

export function LessonVideoWrapper(props) {
  return <LessonVideo {...props} />;
}
