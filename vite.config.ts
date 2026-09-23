import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // A waiting worker activates after the installed app is closed. Do not skipWaiting or reload.
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "clickclackchallenge",
        short_name: "clickclackchallenge",
        description: "Offline typing contest for an event booth.",
        start_url: "/",
        display: "standalone",
        orientation: "landscape",
        background_color: "#FBEDEF",
        theme_color: "#FBEDEF",
        lang: "en",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,webmanifest}"],
        globIgnores: ["**/icons.svg"],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
