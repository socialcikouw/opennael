import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Aplikasi bos memanggil API di `/api/...` (satu asal, tanpa CORS). Saat
 * pengembangan Vite meneruskannya ke `apps/api` (port 3000); di produksi Nginx
 * melakukan hal yang sama (`location /api/ { proxy_pass http://127.0.0.1:3000/; }`).
 */
export default defineConfig({
  // Plugin rute harus sebelum react(): membuat src/routeTree.gen.ts dan memecah kode per rute.
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true, routesDirectory: "./src/rute" }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (jalur) => jalur.replace(/^\/api/, ""),
      },
    },
  },
});
