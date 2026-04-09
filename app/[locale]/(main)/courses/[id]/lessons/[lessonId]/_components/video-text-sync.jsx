"use client";

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { toast } from "sonner";
import { useTranslations } from 'next-intl';

// Context to share sync state
const VideoSyncContext = createContext({
  activeBlockIndex: -1,
  seekTo: () => {},
  handleTimeUpdate: () => {},
  videoRef: null,
  alignments: []
});

export const useVideoSync = () => useContext(VideoSyncContext);

export const VideoTextSync = ({ 
  children, 
  alignments
}) => {
  const t = useTranslations("Alignment");
  const [activeBlockIndex, setActiveBlockIndex] = useState(-1);
  const videoRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);

  // Seek video to timestamp
  const seekTo = useCallback((seconds) => {
    if (seconds === null || seconds === undefined) {
      toast.info(t("notCoveredInVideo"));
      return;
    }

    if (videoRef.current) {
      // Check if it's an HTML5 video or ReactPlayer
      if (typeof videoRef.current.seekTo === 'function') {
        videoRef.current.seekTo(seconds);
      } else if (videoRef.current.currentTime !== undefined) {
        videoRef.current.currentTime = seconds;
      }
    }
  }, [t]);

  // Update active block based on video time
  const handleTimeUpdate = useCallback((currentTime) => {
    // Throttle updates to every 250ms
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 250) return;
    lastUpdateTimeRef.current = now;

    if (!alignments || alignments.length === 0) return;

    const index = alignments.findIndex(a => 
      a.status === 'aligned' && 
      currentTime >= a.startSeconds && 
      currentTime <= a.endSeconds
    );

    if (index !== activeBlockIndex) {
      setActiveBlockIndex(index);
    }
  }, [alignments, activeBlockIndex]);

  return (
    <VideoSyncContext.Provider value={{ activeBlockIndex, seekTo, handleTimeUpdate, videoRef, alignments }}>
      {children}
    </VideoSyncContext.Provider>
  );
};
