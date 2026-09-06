import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@tauri-apps\/.*/, replacement: path.resolve(__dirname, "./src/lib/tauri-mock.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@ggclubs/schemas", replacement: path.resolve(__dirname, "./packages/schemas/src") },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://api.ggclubs.com.br",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
