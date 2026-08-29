import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "prompt",
      includeAssets: ["favicon.ico", "icons/*.png"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        id: "/",
        name: "JoIA Ops",
        short_name: "JoIA Ops",
        description: "Operações, projetos e indicadores da JoIA.",
        lang: "pt-BR",
        start_url: "/meu-dia?source=pwa",
        scope: "/",
        display: "standalone",
        background_color: "#fafafa",
        theme_color: "#171717",
        categories: ["business", "productivity"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          {
            name: "Meu Dia",
            short_name: "Meu Dia",
            description: "Abrir prioridades e tarefas de hoje",
            url: "/meu-dia?source=shortcut",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Plano de Ação",
            short_name: "Tarefas",
            description: "Abrir o plano de ação",
            url: "/plano-acao?source=shortcut",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Reuniões",
            short_name: "Reuniões",
            description: "Abrir reuniões operacionais",
            url: "/reunioes?source=shortcut",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
