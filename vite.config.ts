import { defineConfig, type Plugin } from "vite";
function startupManifest(): Plugin {
  return {
    name: "club-startup-manifest",
    generateBundle(_, bundle) {
      const assets = Object.values(bundle)
        .filter(
          (file) =>
            (file.type === "chunk" && !file.isEntry) ||
            (file.type === "asset" && file.fileName.endsWith(".css")),
        )
        .map((file) => ({
          path: file.fileName,
          bytes:
            file.type === "chunk"
              ? Buffer.byteLength(file.code)
              : typeof file.source === "string"
                ? Buffer.byteLength(file.source)
                : file.source.byteLength,
        }));
      this.emitFile({
        type: "asset",
        fileName: "startup-manifest.json",
        source: JSON.stringify({ assets }),
      });
    },
  };
}
export default defineConfig({
  plugins: [startupManifest()],
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
