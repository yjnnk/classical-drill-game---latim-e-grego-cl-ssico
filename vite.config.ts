import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS
    ? "/classical-drill-game---latim-e-grego-cl-ssico/"
    : "/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Classical Drill Game: Grego e Latim",
        short_name: "Classical Drill",
        description:
          "Prática offline de formas do grego clássico e do latim, em áreas independentes",
        theme_color: "#21352b",
        background_color: "#f6f1e7",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
      },
    }),
  ],
});
