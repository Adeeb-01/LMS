"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * QuizTimer Component
 * 
 * A robust, accessible countdown timer for quizzes.
 * Features:
 * - Accurate countdown synced with server expiresAt
 * - ARIA live announcements for critical time thresholds
 * - Visual warnings as time runs low
 * - Auto-submit callback on expiration
 */
export function QuizTimer({ expiresAt, onExpire, className }) {
  const t = useTranslations("Quiz");
  const [timeLeft, setTimeLeft] = useState(null);
  const [isCritical, setIsCritical] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const timerRef = useRef(null);
  
  // Thresholds for announcements (in seconds)
  const THRESHOLDS = [
    { time: 300, msg: "fiveMinutesRemaining" },
    { time: 60, msg: "oneMinuteRemaining" },
    { time: 30, msg: "thirtySecondsRemaining" },
    { time: 10, msg: "tenSecondsRemaining" }
  ];

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt) return null;
    const expiry = new Date(expiresAt).getTime();
    const now = new Date().getTime();
    const diff = Math.max(0, Math.floor((expiry - now) / 1000));
    return diff;
  }, [expiresAt]);

  useEffect(() => {
    const initialTime = calculateTimeLeft();
    if (initialTime === null) return;
    
    setTimeLeft(initialTime);
    
    timerRef.current = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        if (onExpire) onExpire();
      }
      
      // Visual warning at 1 minute
      if (remaining <= 60 && !isCritical) {
        setIsCritical(true);
      }
      
      // ARIA announcements
      const threshold = THRESHOLDS.find(th => th.time === remaining);
      if (threshold) {
        setAnnouncement(t(threshold.msg));
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [calculateTimeLeft, onExpire, isCritical, t]);

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (timeLeft === null) return null;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-lg transition-colors",
        isCritical ? "bg-red-100 text-red-700 animate-pulse" : "bg-slate-100 text-slate-700",
        className
      )}
      role="timer"
      aria-live="off" // We use a separate live region for announcements to avoid constant chatter
    >
      <Clock className={cn("w-5 h-5", isCritical && "text-red-600")} />
      <span>{formatTime(timeLeft)}</span>
      
      {/* Hidden live region for periodic announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>
      
      {isCritical && (
        <AlertCircle className="w-4 h-4 text-red-600 ml-1" aria-hidden="true" />
      )}
    </div>
  );
}
