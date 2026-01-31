import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: "static",
  server: {
    port: 3000,
  },
  build: {
    outDir: "public",
    emptyOutDir: true,
  },
});
