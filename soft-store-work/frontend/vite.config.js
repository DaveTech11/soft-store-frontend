import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:3000" } }, // `npm run dev` talks to the local backend
  resolve: { alias: { "@": path.resolve(process.cwd(), "./src") } }
});