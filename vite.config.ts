import { fileURLToPath } from "node:url";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    // tsconfig `paths` alone is not read by the dev server; declare it here too.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    // Builds .output/server/index.mjs — a standalone listening server, which is
    // what the booth PC runs. On Vercel, nitro switches preset automatically.
    nitroV2Plugin({ compatibilityDate: "2026-08-10" }),
    viteReact(),
  ],
  server: {
    port: 3000,
  },
});
