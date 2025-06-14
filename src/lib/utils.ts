import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

import { createContext, useContextSelector } from 'use-context-selector';
