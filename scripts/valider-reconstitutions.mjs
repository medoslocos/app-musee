#!/usr/bin/env node
/*
 * Interface de validation des reconstitutions générées.
 *
 * Lance un petit serveur local (aucune dépendance) qui affiche, pour
 * chaque œuvre présente dans a-valider/, la photo originale et les
 * variantes générées côte à côte. Un clic sur « Approuver » :
 *   1. copie la variante choisie vers public/images/<imageComplete>
 *      (ce qui active automatiquement la transition photo dans l'app) ;
 *   2. archive le dossier de travail dans a-valider/_archive/.
 *
 * Usage : node scripts/valider-reconstitutions.mjs  (puis http://localhost:4600)
 */

import { createServer } from "node:http";
import {
  readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, renameSync, statSync,
} from "node:fs";
import { join, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER = join(RACINE, "a-valider");
const PORT = Number(process.env.PORT ?? 4600);

function listerDossiers() {
  if (!existsSync(DOSSIER)) return [];
  return readdirSync(DOSSIER)
    .filter((d) => !d.startsWith("_") && existsSync(join(DOSSIER, d, "manifest.json")))
    .map((d) => JSON.parse(readFileSync(join(DOSSIER, d, "manifest.json"), "utf8")));
}

function page() {
  const oeuvres = listerDossiers();
  const sections = oeuvres.length
    ? oeuvres
        .map((o) => {
          const variantes = o.variantes
            .map(
              (v) => `
        <figure class="variante">
          <img src="/image/${o.id}/${v.fichier}" alt="Variante ${v.fichier}" loading="lazy" />
          <figcaption>${v.fichier} · graine ${v.graine}</figcaption>
          <button onclick="approuver('${o.id}', '${v.fichier}', this)">✅ Approuver celle-ci</button>
        </figure>`
            )
            .join("");
          return `
    <section>
      <h2>${o.titre}</h2>
      <p class="meta">Cible : <code>public/${o.cible}</code> · fournisseur : ${o.fournisseur} · ${new Date(o.genereLe).toLocaleString("fr-FR")}</p>
      <p class="meta prompt">Prompt : ${o.prompt}</p>
      <div class="comparaison">
        <figure class="variante originale">
          <img src="/image/${o.id}/originale.jpg" alt="Photo originale" loading="lazy" />
          <figcaption>Originale (référence)</figcaption>
        </figure>
        ${variantes}
        <figure class="variante masque">
          <img src="/image/${o.id}/masque.png" alt="Masque d'inpainting" loading="lazy" />
          <figcaption>Masque (zones générées)</figcaption>
        </figure>
      </div>
    </section>`;
        })
        .join("\n")
    : `<p class="vide">Rien à valider — lancez d'abord <code>npm run reconstitutions:generer</code>.</p>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Validation des reconstitutions</title>
<style>
  body { font-family: Georgia, serif; background: #0c0b09; color: #fdfaf3; margin: 0; padding: 2rem; font-size: 18px; }
  h1 { color: #e8b95c; } h2 { margin: 0 0 .3rem; }
  section { border-top: 1px solid #4a4437; padding: 1.5rem 0; }
  .meta { color: #ddd6c7; font-size: .95rem; margin: .2rem 0; }
  .prompt { font-style: italic; max-width: 70rem; }
  .comparaison { display: flex; gap: 1rem; overflow-x: auto; padding: 1rem 0; }
  .variante { margin: 0; flex: 0 0 auto; text-align: center; }
  .variante img { height: 62vh; max-width: 44vw; object-fit: contain; border-radius: 8px;
    border: 2px solid #4a4437; background: #000; }
  .originale img { border-color: #e8b95c; }
  .masque img { opacity: .8; }
  figcaption { color: #ddd6c7; margin: .4rem 0; font-size: .95rem; }
  button { font: inherit; font-weight: bold; padding: .7rem 1.4rem; min-height: 56px;
    border-radius: 999px; border: 3px solid #e8b95c; background: #dfa63d; color: #1b1305; cursor: pointer; }
  button:disabled { opacity: .5; cursor: wait; }
  .vide { color: #ddd6c7; }
  .ok { color: #8fdf8f; }
</style></head><body>
<h1>🏛️ Validation des reconstitutions</h1>
<p class="meta">Comparez chaque variante à l'originale (bord doré). L'approbation copie le fichier
dans <code>public/images/</code> — l'animation photo s'active alors automatiquement dans l'app.</p>
${sections}
<script>
async function approuver(id, fichier, bouton) {
  bouton.disabled = true;
  const rep = await fetch("/approuver", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, fichier }),
  });
  const corps = await rep.json();
  if (corps.ok) {
    bouton.textContent = "✅ Approuvée → " + corps.destination;
    bouton.classList.add("ok");
    setTimeout(() => location.reload(), 1200);
  } else {
    bouton.disabled = false;
    alert("Erreur : " + corps.erreur);
  }
}
</script>
</body></html>`;
}

function approuver(id, fichier) {
  if (!/^[a-z0-9-]+$/.test(id) || !/^variante-\d+\.jpg$/.test(fichier)) {
    throw new Error("identifiants invalides");
  }
  const manifest = JSON.parse(readFileSync(join(DOSSIER, id, "manifest.json"), "utf8"));
  const source = join(DOSSIER, id, fichier);
  if (!existsSync(source)) throw new Error(`fichier introuvable : ${fichier}`);
  const destination = join(RACINE, "public", manifest.cible);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
  const archive = join(DOSSIER, "_archive");
  mkdirSync(archive, { recursive: true });
  renameSync(join(DOSSIER, id), join(archive, `${id}-${Date.now()}`));
  return `public/${manifest.cible}`;
}

const serveur = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(page());
    }
    if (req.method === "GET" && url.pathname.startsWith("/image/")) {
      const rel = normalize(url.pathname.slice("/image/".length));
      if (rel.includes("..")) throw new Error("chemin refusé");
      const chemin = join(DOSSIER, rel);
      if (!existsSync(chemin) || !statSync(chemin).isFile()) {
        res.writeHead(404);
        return res.end("introuvable");
      }
      res.writeHead(200, {
        "Content-Type": chemin.endsWith(".png") ? "image/png" : "image/jpeg",
      });
      return res.end(readFileSync(chemin));
    }
    if (req.method === "POST" && url.pathname === "/approuver") {
      let corps = "";
      for await (const morceau of req) corps += morceau;
      const { id, fichier } = JSON.parse(corps);
      const destination = approuver(id, fichier);
      console.log(`✅ ${id} : ${fichier} approuvée → ${destination}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, destination }));
    }
    res.writeHead(404);
    res.end("introuvable");
  } catch (e) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, erreur: e.message }));
  }
});

serveur.listen(PORT, () => {
  console.log(`Interface de validation : http://localhost:${PORT}`);
  console.log(`Dossier surveillé : ${DOSSIER}`);
});
