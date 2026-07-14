import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        accueil: fileURLToPath(new URL("./index.html", import.meta.url)),
        collections: fileURLToPath(new URL("./collections.html", import.meta.url)),
        oeuvre: fileURLToPath(new URL("./oeuvre.html", import.meta.url)),
      },
    },
  },
});
