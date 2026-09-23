import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Typing test",
        short_name: "Typing test",
        description: "Offline typing contest for an event booth.",
        start_url: "/",
        display: "standalone",
        orientation: "landscape",
        background_color: "#FBEDEF",
        theme_color: "#FBEDEF",
        lang: "en",
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
