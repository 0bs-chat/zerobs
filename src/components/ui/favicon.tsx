import React, { useState } from "react";
import { getFaviconUrl, getHighResFaviconUrl } from "@/lib/favicon";

interface FaviconProps {
  url: string;
  className?: string;
  size?: number;
  fallbackIcon?: React.ComponentType<{ className?: string }>;
}

export function Favicon({ 
  url, 
  className = "w-4 h-4", 
  size = 16,
  fallbackIcon: FallbackIcon 
}: FaviconProps) {
  const [hasError, setHasError] = useState(false);
  const faviconUrl = size > 16 ? getHighResFaviconUrl(url) : getFaviconUrl(url);
  
  if (hasError && FallbackIcon) {
    return <FallbackIcon className={className} />;
  }
  
  return (
    <img
      src={faviconUrl}
      alt="Favicon"
      className={className}
      onError={() => setHasError(true)}
      style={{ 
        minWidth: size, 
        minHeight: size,
        maxWidth: size,
        maxHeight: size
      }}
    />
  );
} 