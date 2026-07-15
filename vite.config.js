import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Chemins relatifs : l'app fonctionne aussi bien servie à la racine
  // (Capacitor) que sous un sous-chemin (GitHub Pages /app-musee/).
  base: "./",
  build: {
    rollupOptions: {
      input: {
        accueil: fileURLToPath(new URL("./index.html", import.meta.url)),
        collections: fileURLToPath(new URL("./collections.html", import.meta.url)),
        oeuvre: fileURLToPath(new URL("./oeuvre.html", import.meta.url)),
        visite: fileURLToPath(new URL("./visite.html", import.meta.url)),
      },
    },
  },
});
