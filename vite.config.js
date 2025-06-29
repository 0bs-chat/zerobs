import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

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
    include: ["path-browserify", "buffer"],
  },
  build: {
    rollupOptions: {
      external: ["ssh2", "cpu-features", /\.node$/],
    },
  },
});
