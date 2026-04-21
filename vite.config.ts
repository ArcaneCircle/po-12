import { defineConfig } from "vite";
import { buildXDC, eruda, mockWebxdc } from "@webxdc/vite-plugins";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "node:path";

function xdcFilter(fileName, filePath, isDirectory) {
  return !(
    fileName.endsWith("~")
    || fileName === "favicon.ico"
    || fileName === "favicons"
  );
}

export default defineConfig({
  plugins: [
    buildXDC({filter: xdcFilter}),
    eruda(),
    mockWebxdc(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false, // use existing site.webmanifest in public/
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,wav,woff2}"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
});
