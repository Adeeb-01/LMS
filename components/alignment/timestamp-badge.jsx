import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";

/**
 * Helper to format seconds as M:SS or H:MM:SS.
 */
function formatTime(seconds) {
  if (seconds === null || seconds === undefined) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const TimestampBadge = ({ seconds, onClick, className = '' }) => {
  if (seconds === null || seconds === undefined) return null;

  return (
    <Badge 
      variant="secondary" 
      className={`cursor-pointer hover:bg-secondary/80 text-[10px] px-1 py-0 h-4 flex items-center gap-1 transition-colors ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(seconds);
      }}
    >
      <Play className="w-2 h-2 fill-current" />
      {formatTime(seconds)}
    </Badge>
  );
};
