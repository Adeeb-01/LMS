"use client";

import React, { useState, useEffect } from 'react';
import { VideoTextSync } from './video-text-sync';
import { getAlignments } from '@/app/actions/alignment';

export function LessonSyncWrapper({ lessonId, courseId, children }) {
  const [alignments, setAlignments] = useState([]);

  useEffect(() => {
    async function fetchAlignments() {
      const res = await getAlignments(lessonId, courseId);
      if (res.success && res.data?.alignments) {
        setAlignments(res.data.alignments);
      }
    }
    fetchAlignments();
  }, [lessonId, courseId]);

  return (
    <VideoTextSync alignments={alignments} lessonId={lessonId}>
      {children}
    </VideoTextSync>
  );
}
