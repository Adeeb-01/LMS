"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from 'next-intl';

/**
 * Component to link to a specific moment in a lesson video.
 * @param {string} courseId
 * @param {string} lessonId
 * @param {number} startSeconds
 * @param {string} lessonSlug
 */
export const WatchExplanationLink = ({ courseId, lessonId, startSeconds, lessonSlug }) => {
  const t = useTranslations("Alignment");
  if (startSeconds === null || startSeconds === undefined) return null;

  // We link to the lesson page with a seek parameter
  // Note: The lesson page needs to handle the 't' parameter to seek on load
  const url = `/courses/${courseId}/lesson?name=${lessonSlug || ''}&t=${Math.floor(startSeconds)}`;

  return (
    <Button variant="link" size="sm" className="p-0 h-auto text-blue-600 flex items-center gap-1" asChild>
      <Link href={url}>
        <PlayCircle className="w-3 h-3" />
        {t("watchExplanation")}
      </Link>
    </Button>
  );
};
