"use client";

import Image from "next/image";
import { useState } from "react";
import { getSafeImageUrl, shouldUseUnoptimized } from "@/lib/image-utils";

/**
 * Safe Image component that handles errors and external images
 * Use this instead of next/image for images that might fail to load
 */
export function SafeImage({ src, alt, fallback = "/assets/images/profile.jpg", ...props }) {
  const [imgSrc, setImgSrc] = useState(getSafeImageUrl(src, fallback));
  const useUnoptimized = shouldUseUnoptimized(src);

  const handleError = () => {
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
  };

  return (
    <Image
      src={imgSrc}
      alt={alt}
      unoptimized={useUnoptimized}
      onError={handleError}
      {...props}
    />
  );
}

