import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig(({}) => {
  return {
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
        "@": path.resolve(__dirname, "./src"),
        buffer: "buffer",
      },
    },
    define: {
      global: "globalThis",
    },
    optimizeDeps: {
      exclude: ["ssh2", "cpu-features"],
      include: ["buffer", "@isomorphic-git/lightning-fs", "@isomorphic-git"],
    },
    build: {
      rollupOptions: {
        external: ["ssh2", "cpu-features", /\.node$/],
      },
    },
  };
});
