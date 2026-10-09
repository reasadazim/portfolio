import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { seoPlugin } from "./build/seo-plugin.js";
import { assistantPlugin } from "./build/assistant-plugin.js";

const proxy = {
  "/api": "http://127.0.0.1:8093",
};

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), seoPlugin(), assistantPlugin()],
  server: { proxy },
  preview: { proxy },
});
