import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

import { resolve } from "node:path";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
// import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
  },
  prerender: {
    routes: ["/", "/auth"],
    crawlLinks: true,
  },
  ssr: {
    noExternal: [
      "react-syntax-highlighter",
      "isomorphic-git",
      "@isomorphic-git/lightning-fs",
    ],
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths({
      project: "./tsconfig.json",
    }),
    tanstackStart(),
    // visualizer({ open: true }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      buffer: "buffer",
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ["ssh2", "cpu-features"],
    include: ["buffer"],
  },
  build: {
    rollupOptions: {
      external: ["ssh2", "cpu-features", /\.node$/],
    },
  },
});
