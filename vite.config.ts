import { defineConfig } from "vite";
export default defineConfig({
  base: process.env.PAGES_BASE_PATH || "/",
  server: {
    proxy: { "/socket.io": { target: "http://localhost:3001", ws: true } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("rapier")) return "physics";
          if (id.includes("three")) return "renderer";
        },
      },
    },
  },
});
