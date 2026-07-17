#!/usr/bin/env node
/*
 * Pipeline de génération des reconstitutions photoréalistes.
 *
 * Pour chaque œuvre des données ayant une reconstitution avec
 * `reconstitutionPrompt` et `imageComplete` :
 *   1. lit la photo originale (public/<image>) et vérifie ses dimensions ;
 *   2. génère automatiquement le masque d'inpainting à partir des couloirs
 *      SVG déjà présents dans les données (tracés .trace + extrémités) —
 *      aucune retouche manuelle par œuvre ;
 *   3. appelle le fournisseur d'inpainting (2-3 variantes, graines
 *      différentes) ;
 *   4. vérifie chaque sortie (JPEG, sRGB 3 composantes, dimensions
 *      identiques à l'original) ;
 *   5. dépose le tout dans a-valider/<id>/ pour validation humaine
 *      (voir scripts/valider-reconstitutions.mjs).
 *
 * Fournisseurs (variable RECON_FOURNISSEUR ou --fournisseur) :
 *   - bfl        : FLUX.1 Fill via l'API Black Forest Labs (UE).
 *                  Requiert BFL_API_KEY (env ou fichier .env).
 *   - endpoint   : serveur d'inpainting auto-hébergé (ex. SDXL-Inpainting
 *                  sur Scaleway/OVH). Requiert RECON_ENDPOINT (+
 *                  RECON_API_KEY facultatif). Contrat : POST JSON
 *                  { image, mask, prompt, seed } (base64) → JPEG binaire
 *                  ou { image: "<base64>" }.
 *   - simulation : aucune API — copie l'originale (pixels identiques,
 *                  octets distincts) pour tester toute la mécanique.
 *
 * Usage :
 *   node scripts/generer-reconstitution.mjs [--oeuvre <id>]
 *     [--variantes 3] [--fournisseur bfl|endpoint|simulation] [--forcer]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { oeuvres } from "../src/data/musee.js";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOSSIER_SORTIE = join(RACINE, "a-valider");

// ---------------------------------------------------------------------------
// Options et environnement
// ---------------------------------------------------------------------------

chargerDotEnv();

const args = process.argv.slice(2);
function option(nom, defaut) {
  const i = args.indexOf(`--${nom}`);
  return i >= 0 ? args[i + 1] : defaut;
}
const drapeauForcer = args.includes("--forcer");
const filtreOeuvre = option("oeuvre", null);
const nbVariantes = Math.min(3, Math.max(1, Number(option("variantes", 3))));
const fournisseur =
  option("fournisseur", null) ??
  process.env.RECON_FOURNISSEUR ??
  (process.env.BFL_API_KEY ? "bfl" : process.env.RECON_ENDPOINT ? "endpoint" : "simulation");

function chargerDotEnv() {
  const chemin = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, "utf8").split("\n")) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

// ---------------------------------------------------------------------------
// Lecture des dimensions et vérification JPEG
// ---------------------------------------------------------------------------

function infosJpeg(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marqueur = buf[i + 1];
    if (marqueur === 0xd9 || marqueur === 0xda) break;
    const longueur = buf.readUInt16BE(i + 2);
    const estSOF =
      (marqueur >= 0xc0 && marqueur <= 0xc3) ||
      (marqueur >= 0xc5 && marqueur <= 0xc7) ||
      (marqueur >= 0xc9 && marqueur <= 0xcb) ||
      (marqueur >= 0xcd && marqueur <= 0xcf);
    if (estSOF) {
      return {
        hauteur: buf.readUInt16BE(i + 5),
        largeur: buf.readUInt16BE(i + 7),
        composantes: buf[i + 9],
      };
    }
    i += 2 + longueur;
  }
  return null;
}

function verifierSortie(buf, original, etiquette) {
  const infos = infosJpeg(buf);
  const problemes = [];
  if (!infos) problemes.push("le fichier n'est pas un JPEG valide");
  else {
    if (infos.largeur !== original.largeur || infos.hauteur !== original.hauteur) {
      problemes.push(
        `dimensions ${infos.largeur}×${infos.hauteur} ≠ original ${original.largeur}×${original.hauteur}`
      );
    }
    if (infos.composantes !== 3) {
      problemes.push(`${infos.composantes} composantes (attendu : 3, sRGB/YCbCr)`);
    }
  }
  if (problemes.length) {
    console.error(`   ✗ ${etiquette} rejetée : ${problemes.join(" ; ")}`);
    return false;
  }
  console.log(`   ✓ ${etiquette} conforme (${original.largeur}×${original.hauteur}, JPEG 3 composantes)`);
  return true;
}

// ---------------------------------------------------------------------------
// Masque d'inpainting : rasterisation des couloirs SVG des données
// (zones blanches = à générer, fond noir = à préserver)
// ---------------------------------------------------------------------------

function attributs(balise) {
  const o = {};
  for (const m of balise.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) o[m[1]] = m[2];
  return o;
}

function extraireFormes(svg) {
  const couloirs = [];
  const bouts = [];
  for (const m of svg.matchAll(/<path\b[^>]*>/g)) {
    const a = attributs(m[0]);
    const classes = (a.class ?? "").split(/\s+/);
    if (classes.includes("trace") && !classes.includes("lueur-pulse")) {
      couloirs.push({ d: a.d, largeur: Number(a["stroke-width"] ?? 50) });
    }
  }
  for (const m of svg.matchAll(/<(ellipse|circle)\b[^>]*>/g)) {
    const a = attributs(m[0]);
    if (!(a.class ?? "").split(/\s+/).includes("apparition")) continue;
    bouts.push({
      cx: Number(a.cx),
      cy: Number(a.cy),
      rx: Number(a.rx ?? a.r),
      ry: Number(a.ry ?? a.r),
    });
  }
  const vb = svg.match(/viewBox="([\d.\s-]+)"/);
  const [, , vw, vh] = vb[1].trim().split(/\s+/).map(Number);
  return { couloirs, bouts, largeur: vw, hauteur: vh };
}

// Échantillonne un chemin SVG (M/L/H/V/Q/C/Z absolus) en polyligne.
function echantillonnerChemin(d) {
  const jetons = d.match(/[MLHVQCZ]|-?[\d.]+/gi) ?? [];
  const points = [];
  let i = 0;
  let x = 0, y = 0, x0 = 0, y0 = 0;
  const nombre = () => Number(jetons[i++]);
  while (i < jetons.length) {
    const cmd = jetons[i++];
    switch (cmd) {
      case "M":
        x = nombre(); y = nombre(); x0 = x; y0 = y;
        points.push([x, y]);
        break;
      case "L": {
        const nx = nombre(), ny = nombre();
        segment(points, x, y, nx, ny); x = nx; y = ny;
        break;
      }
      case "H": {
        const nx = nombre();
        segment(points, x, y, nx, y); x = nx;
        break;
      }
      case "V": {
        const ny = nombre();
        segment(points, x, y, x, ny); y = ny;
        break;
      }
      case "Q": {
        const cx = nombre(), cy = nombre(), nx = nombre(), ny = nombre();
        for (let t = 1; t <= 24; t++) {
          const u = t / 24, v = 1 - u;
          points.push([v * v * x + 2 * v * u * cx + u * u * nx, v * v * y + 2 * v * u * cy + u * u * ny]);
        }
        x = nx; y = ny;
        break;
      }
      case "C": {
        const c1x = nombre(), c1y = nombre(), c2x = nombre(), c2y = nombre(), nx = nombre(), ny = nombre();
        for (let t = 1; t <= 32; t++) {
          const u = t / 32, v = 1 - u;
          points.push([
            v ** 3 * x + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u ** 3 * nx,
            v ** 3 * y + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u ** 3 * ny,
          ]);
        }
        x = nx; y = ny;
        break;
      }
      case "Z":
        segment(points, x, y, x0, y0); x = x0; y = y0;
        break;
      default:
        throw new Error(`Commande SVG non gérée dans le masque : ${cmd}`);
    }
  }
  return points;
}

function segment(points, x1, y1, x2, y2) {
  const n = Math.max(2, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4));
  for (let t = 1; t <= n; t++) points.push([x1 + ((x2 - x1) * t) / n, y1 + ((y2 - y1) * t) / n]);
}

function rasteriserMasque(oeuvre, dims) {
  const { couloirs, bouts, largeur: vw, hauteur: vh } = extraireFormes(oeuvre.reconstitution.svg);
  if (vw !== dims.largeur || vh !== dims.hauteur) {
    console.warn(
      `   ⚠ viewBox SVG ${vw}×${vh} ≠ image ${dims.largeur}×${dims.hauteur} — masque mis à l'échelle`
    );
  }
  const ex = dims.largeur / vw, ey = dims.hauteur / vh;
  const { largeur, hauteur } = dims;
  const masque = new Uint8Array(largeur * hauteur);

  function tamponDisque(cx, cy, r) {
    const x1 = Math.max(0, Math.floor(cx - r)), x2 = Math.min(largeur - 1, Math.ceil(cx + r));
    const y1 = Math.max(0, Math.floor(cy - r)), y2 = Math.min(hauteur - 1, Math.ceil(cy + r));
    const r2 = r * r;
    for (let py = y1; py <= y2; py++) {
      const dy = py - cy;
      for (let px = x1; px <= x2; px++) {
        const dx = px - cx;
        if (dx * dx + dy * dy <= r2) masque[py * largeur + px] = 255;
      }
    }
  }

  for (const { d, largeur: lTrait } of couloirs) {
    // Couloir un peu plus large que le membre dessiné, comme le masque de
    // révélation de l'app (les modèles d'inpainting aiment la marge).
    const rayon = (lTrait * 1.9) / 2;
    const pts = echantillonnerChemin(d);
    for (const [px, py] of pts) tamponDisque(px * ex, py * ey, rayon * ex);
  }
  for (const { cx, cy, rx, ry } of bouts) {
    // Extrémités (mains, objets) : ellipse élargie, approchée par disques.
    const r = Math.max(rx, ry) * 1.8;
    tamponDisque(cx * ex, cy * ey, r * ex);
  }
  return masque;
}

// ---------------------------------------------------------------------------
// Encodeur PNG minimal (niveaux de gris, 8 bits) pour le masque
// ---------------------------------------------------------------------------

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const octet of buf) c = TABLE_CRC[(c ^ octet) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function morceauPng(type, donnees) {
  const longueur = Buffer.alloc(4);
  longueur.writeUInt32BE(donnees.length);
  const corps = Buffer.concat([Buffer.from(type, "ascii"), donnees]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(corps));
  return Buffer.concat([longueur, corps, crc]);
}

function encoderPngGris(masque, largeur, hauteur) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largeur, 0);
  ihdr.writeUInt32BE(hauteur, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 0; // niveaux de gris
  const brut = Buffer.alloc((largeur + 1) * hauteur);
  for (let y = 0; y < hauteur; y++) {
    brut[y * (largeur + 1)] = 0; // filtre « aucun »
    Buffer.from(masque.buffer, y * largeur, largeur).copy(brut, y * (largeur + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    morceauPng("IHDR", ihdr),
    morceauPng("IDAT", deflateSync(brut, { level: 9 })),
    morceauPng("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Fournisseurs d'inpainting
// ---------------------------------------------------------------------------

async function genererBfl({ imageB64, masqueB64, prompt, graine }) {
  const cle = process.env.BFL_API_KEY;
  if (!cle) throw new Error("BFL_API_KEY manquante (env ou .env)");
  const lancement = await fetch("https://api.bfl.ai/v1/flux-pro-1.0-fill", {
    method: "POST",
    headers: { "x-key": cle, "Content-Type": "application/json" },
    body: JSON.stringify({
      image: imageB64,
      mask: masqueB64,
      prompt,
      seed: graine,
      output_format: "jpeg",
      safety_tolerance: 2,
    }),
  });
  if (!lancement.ok) throw new Error(`BFL ${lancement.status} : ${await lancement.text()}`);
  const { polling_url } = await lancement.json();
  for (let essai = 0; essai < 90; essai++) {
    await new Promise((r) => setTimeout(r, 2000));
    const etat = await fetch(polling_url, { headers: { "x-key": cle } });
    if (!etat.ok) throw new Error(`BFL sondage ${etat.status}`);
    const corps = await etat.json();
    if (corps.status === "Ready") {
      const image = await fetch(corps.result.sample);
      return Buffer.from(await image.arrayBuffer());
    }
    if (corps.status !== "Pending" && corps.status !== "Queued" && corps.status !== "Processing") {
      throw new Error(`BFL : statut ${corps.status} — ${JSON.stringify(corps.result ?? {})}`);
    }
  }
  throw new Error("BFL : délai de génération dépassé (3 min)");
}

async function genererEndpoint({ imageB64, masqueB64, prompt, graine }) {
  const url = process.env.RECON_ENDPOINT;
  if (!url) throw new Error("RECON_ENDPOINT manquant (serveur d'inpainting auto-hébergé)");
  const entetes = { "Content-Type": "application/json" };
  if (process.env.RECON_API_KEY) entetes.Authorization = `Bearer ${process.env.RECON_API_KEY}`;
  const rep = await fetch(url, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify({ image: imageB64, mask: masqueB64, prompt, seed: graine }),
  });
  if (!rep.ok) throw new Error(`Endpoint ${rep.status} : ${await rep.text()}`);
  if ((rep.headers.get("content-type") ?? "").includes("application/json")) {
    const { image } = await rep.json();
    return Buffer.from(image, "base64");
  }
  return Buffer.from(await rep.arrayBuffer());
}

// Simulation : recopie l'originale avec un commentaire JPEG distinct par
// variante (pixels identiques — sert uniquement à tester la mécanique).
async function genererSimulation({ imageBuf, graine }) {
  const commentaire = Buffer.from(`simulation variante graine=${graine}`, "ascii");
  const com = Buffer.concat([
    Buffer.from([0xff, 0xfe, 0, 0]),
    commentaire,
  ]);
  com.writeUInt16BE(commentaire.length + 2, 2);
  return Buffer.concat([imageBuf.subarray(0, 2), com, imageBuf.subarray(2)]);
}

const FOURNISSEURS = { bfl: genererBfl, endpoint: genererEndpoint, simulation: genererSimulation };

// ---------------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------------

const generer = FOURNISSEURS[fournisseur];
if (!generer) {
  console.error(`Fournisseur inconnu : ${fournisseur} (attendu : bfl | endpoint | simulation)`);
  process.exit(1);
}

const candidates = oeuvres.filter(
  (o) =>
    o.reconstitution?.reconstitutionPrompt &&
    o.reconstitution?.imageComplete &&
    (!filtreOeuvre || o.id === filtreOeuvre)
);

if (!candidates.length) {
  console.error("Aucune œuvre avec reconstitutionPrompt + imageComplete dans les données.");
  process.exit(1);
}

console.log(`Fournisseur : ${fournisseur} — ${candidates.length} œuvre(s), ${nbVariantes} variante(s) chacune\n`);

let erreurs = 0;
for (const oeuvre of candidates) {
  const cible = join(RACINE, "public", oeuvre.reconstitution.imageComplete);
  if (existsSync(cible) && !drapeauForcer) {
    console.log(`— ${oeuvre.titre} : image approuvée déjà en place (${oeuvre.reconstitution.imageComplete}), ignorée (--forcer pour regénérer)`);
    continue;
  }

  console.log(`— ${oeuvre.titre} (${oeuvre.id})`);
  const cheminOriginal = join(RACINE, "public", oeuvre.image);
  const imageBuf = readFileSync(cheminOriginal);
  const dims = infosJpeg(imageBuf);
  if (!dims) {
    console.error(`   ✗ original illisible : ${oeuvre.image}`);
    erreurs++;
    continue;
  }
  console.log(`   original ${dims.largeur}×${dims.hauteur} — génération du masque depuis le SVG…`);

  const masque = rasteriserMasque(oeuvre, dims);
  const masquePng = encoderPngGris(masque, dims.largeur, dims.hauteur);

  const dossier = join(DOSSIER_SORTIE, oeuvre.id);
  mkdirSync(dossier, { recursive: true });
  writeFileSync(join(dossier, "masque.png"), masquePng);
  copyFileSync(cheminOriginal, join(dossier, "originale.jpg"));

  const manifest = {
    id: oeuvre.id,
    titre: oeuvre.titre,
    cible: oeuvre.reconstitution.imageComplete,
    prompt: oeuvre.reconstitution.reconstitutionPrompt,
    fournisseur,
    genereLe: new Date().toISOString(),
    variantes: [],
  };

  for (let n = 1; n <= nbVariantes; n++) {
    const graine = 1000 * n + 7;
    process.stdout.write(`   variante ${n}/${nbVariantes} (graine ${graine})… `);
    try {
      const sortie = await generer({
        imageBuf,
        imageB64: imageBuf.toString("base64"),
        masqueB64: masquePng.toString("base64"),
        prompt: oeuvre.reconstitution.reconstitutionPrompt,
        graine,
      });
      console.log(`reçue (${Math.round(sortie.length / 1024)} Ko)`);
      if (!verifierSortie(sortie, dims, `variante ${n}`)) {
        erreurs++;
        continue;
      }
      const nom = `variante-${n}.jpg`;
      writeFileSync(join(dossier, nom), sortie);
      manifest.variantes.push({ fichier: nom, graine, octets: sortie.length });
    } catch (e) {
      console.error(`échec : ${e.message}`);
      erreurs++;
    }
  }

  writeFileSync(join(dossier, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(
    `   → ${manifest.variantes.length} variante(s) dans a-valider/${oeuvre.id}/ — lancez : npm run reconstitutions:valider\n`
  );
}

process.exit(erreurs ? 1 : 0);
