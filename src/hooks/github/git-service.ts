// src/lib/git-service.ts
import { isServer } from "@tanstack/react-query";

// Type definitions
export interface GitConfig {
  dir: string;
  url?: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface GitService {
  clone: (config: GitConfig) => Promise<void>;
  commit: (config: GitConfig & { message: string }) => Promise<string>;
  push: (config: GitConfig) => Promise<void>;
  // Add other git operations as needed
}

// Server-side implementation
async function createServerGitService(): Promise<GitService> {
  const git = await import("isomorphic-git");
  const fs = await import("fs");
  const http = await import("isomorphic-git/http/node");

  return {
    async clone(config) {
      await git.clone({
        fs,
        http,
        dir: config.dir,
        url: config.url!,
      });
    },

    async commit(config) {
      return await git.commit({
        fs,
        dir: config.dir,
        message: config.message,
        author: config.author!,
      });
    },

    async push(config) {
      await git.push({
        fs,
        http,
        dir: config.dir,
        remote: "origin",
        ref: "main",
      });
    },
  };
}

// Client-side implementation
async function createClientGitService(): Promise<GitService> {
  const git = await import("isomorphic-git");
  const LightningFS = await import("@isomorphic-git/lightning-fs");
  const http = await import("isomorphic-git/http/web");
  const buffer = await import("buffer");

  // Set up buffer for Node.js compatibility
  (globalThis as any).Buffer = buffer.Buffer;

  // Initialize browser filesystem
  const fs = new LightningFS.default("github-repos");

  return {
    async clone(config) {
      await git.clone({
        fs,
        http,
        dir: config.dir,
        url: config.url!,
        corsProxy: "https://cors.isomorphic-git.org", // You might need this for CORS
      });
    },

    async commit(config) {
      return await git.commit({
        fs,
        dir: config.dir,
        message: config.message,
        author: config.author!,
      });
    },

    async push(config) {
      await git.push({
        fs,
        http,
        dir: config.dir,
        remote: "origin",
        ref: "main",
      });
    },
  };
}

// Factory function that returns the appropriate service
export async function createGitService(): Promise<GitService> {
  if (isServer) {
    return createServerGitService();
  } else {
    return createClientGitService();
  }
}
