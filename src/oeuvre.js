import gsap from "gsap";
import { initNatif, initTailleTexte } from "./commun.js";
import { musee, oeuvres } from "./data/musee.js";

initNatif();
initTailleTexte();

const SVG_NS = "http://www.w3.org/2000/svg";

// ---------------------------------------------------------------------------
// Chargement de l'œuvre depuis l'URL (?id=...). Moteur générique :
// tout le contenu vient de src/data/musee.js.
// ---------------------------------------------------------------------------

const id = new URLSearchParams(location.search).get("id");
const oeuvre = oeuvres.find((o) => o.id === id) ?? oeuvres[0];

document.title = `${oeuvre.titre} — ${musee.nom}`;
document.getElementById("oeuvre-titre").textContent = oeuvre.titre;
document.getElementById("oeuvre-date").textContent =
  `${oeuvre.categorie} · ${oeuvre.date}`;
document.getElementById("oeuvre-description").textContent = oeuvre.description;
document.getElementById("oeuvre-credit").textContent = oeuvre.credit;

const image = document.getElementById("oeuvre-image");
image.src = oeuvre.image;
image.alt = oeuvre.imageAlt;

const visuel = document.getElementById("oeuvre-visuel");
const scan = document.getElementById("scan");
const legende = document.getElementById("oeuvre-legende");
const btnReveal = document.getElementById("btn-reconstitution");
const bascule = document.getElementById("bascule");
const btnAujourdhui = document.getElementById("btn-aujourdhui");
const btnOrigine = document.getElementById("btn-origine");
const comparateur = document.getElementById("comparateur");
const curseur = document.getElementById("curseur-comparaison");

const prefereMoinsDeMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

// Le bouton retour ramène à la page d'où l'on vient (accueil ou Collections).
document.querySelector(".btn-retour").addEventListener("click", (e) => {
  let memeOrigine = false;
  try {
    memeOrigine = new URL(document.referrer).origin === location.origin;
  } catch {
    // pas de referrer exploitable : on suit le lien normal
  }
  if (memeOrigine && history.length > 1) {
    e.preventDefault();
    history.back();
  }
});

// ---------------------------------------------------------------------------
// Pilotage commun des expériences : bouton révéler, bascule
// Aujourd'hui / À l'origine, curseur avant/après — tous synchronisés
// sur une même timeline GSAP.
// ---------------------------------------------------------------------------

function installerPilotage(tl, { legendePour, surAller, surPause, avecCurseur = true }) {
  function synchroniser() {
    const p = tl.progress();
    curseur.value = Math.round(p * 100);
    btnOrigine.setAttribute("aria-pressed", String(p > 0.98));
    btnAujourdhui.setAttribute("aria-pressed", String(p < 0.02));
    legende.textContent = legendePour(p);
  }
  tl.eventCallback("onUpdate", synchroniser);

  function aller() {
    surPause?.();
    if (prefereMoinsDeMotion.matches) {
      tl.progress(1).pause();
      synchroniser();
    } else {
      surAller?.();
      tl.play();
    }
  }

  function revenir() {
    surPause?.();
    if (prefereMoinsDeMotion.matches) {
      tl.progress(0).pause();
      synchroniser();
    } else {
      tl.reverse();
    }
  }

  btnReveal.addEventListener("click", () => {
    btnReveal.hidden = true;
    bascule.hidden = false;
    if (avecCurseur) comparateur.hidden = false;
    if (!prefereMoinsDeMotion.matches) {
      gsap.from(".bascule .btn, .comparateur", {
        autoAlpha: 0,
        y: 12,
        duration: 0.4,
        stagger: 0.08,
      });
    }
    aller();
    btnOrigine.focus();
  });

  btnOrigine.addEventListener("click", aller);
  btnAujourdhui.addEventListener("click", revenir);

  if (avecCurseur) {
    curseur.addEventListener("input", () => {
      surPause?.();
      tl.pause();
      tl.progress(Number(curseur.value) / 100);
    });
  }
}

// ---------------------------------------------------------------------------
// Pluie de particules dorées convergeant vers des chemins cibles.
// `subtile: true` → moins de particules, plus petites (accompagnement discret).
// ---------------------------------------------------------------------------

function creerPluieDoree(calque, chemins) {
  let enCours = false;
  return function pluieDoree({ subtile = false } = {}) {
    if (enCours || prefereMoinsDeMotion.matches) return;
    enCours = true;
    const groupe = document.createElementNS(SVG_NS, "g");
    groupe.setAttribute("pointer-events", "none");
    calque.appendChild(groupe);

    const cibles = [];
    for (const chemin of chemins) {
      const longueur = chemin.getTotalLength();
      for (let i = 0; i <= 10; i++) {
        cibles.push(chemin.getPointAtLength((i / 10) * longueur));
      }
    }

    const parPoint = subtile ? 1 : 3;
    const tlp = gsap.timeline({
      onComplete: () => {
        groupe.remove();
        enCours = false;
      },
    });
    cibles.forEach((cible) => {
      for (let k = 0; k < parPoint; k++) {
        const p = document.createElementNS(SVG_NS, "circle");
        const angle = Math.random() * Math.PI * 2;
        const distance = 140 + Math.random() * 320;
        p.setAttribute("r", ((subtile ? 1.8 : 2.5) + Math.random() * (subtile ? 3 : 4.5)).toFixed(1));
        p.setAttribute("fill", "#ffdf9e");
        p.setAttribute("cx", (cible.x + Math.cos(angle) * distance).toFixed(1));
        p.setAttribute("cy", (cible.y + Math.sin(angle) * distance).toFixed(1));
        p.setAttribute("opacity", "0");
        groupe.appendChild(p);
        const depart = Math.random() * 1.6;
        const duree = 1 + Math.random() * 1;
        tlp
          .to(p, { opacity: subtile ? 0.6 : 0.85, duration: 0.3, ease: "sine.out" }, depart)
          .to(
            p,
            { attr: { cx: cible.x, cy: cible.y }, duration: duree, ease: "power2.in" },
            depart
          )
          .to(p, { opacity: 0, scale: 0.4, duration: 0.35, ease: "sine.in" }, depart + duree - 0.2);
      }
    });
  };
}

// ---------------------------------------------------------------------------
// Expérience « photo » : transition entre la photo actuelle et une photo
// de l'œuvre reconstituée (reconstitution.imageComplete). Les zones
// reconstituées sont révélées par un masque animé qui suit les membres,
// des épaules vers les mains, avec des particules dorées discrètes.
// ---------------------------------------------------------------------------

function initExperiencePhoto(calque, urlImageComplete) {
  const coeurs = [...calque.querySelectorAll(".trace")].filter(
    (t) => !t.classList.contains("lueur-pulse")
  );
  const vb = calque.viewBox.baseVal;

  // Les calques hologramme ne servent ici que de géométrie pour le masque.
  gsap.set(calque.querySelectorAll(".trace, .apparition"), { autoAlpha: 0 });

  // Masque : couloirs blancs le long des membres (dessinés progressivement)
  // + zones rondes aux extrémités (mains, objets), bords adoucis au flou.
  const defs = document.createElementNS(SVG_NS, "defs");
  defs.innerHTML = `
    <filter id="flou-masque" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
    <mask id="masque-reveal" maskUnits="userSpaceOnUse"
      x="0" y="0" width="${vb.width}" height="${vb.height}">
      <g filter="url(#flou-masque)" class="masque-contenu"></g>
    </mask>`;
  calque.insertBefore(defs, calque.firstChild);
  const contenuMasque = defs.querySelector(".masque-contenu");

  const couloirs = [];
  for (const src of coeurs) {
    const c = src.cloneNode();
    c.removeAttribute("class");
    c.removeAttribute("filter");
    c.removeAttribute("style"); // purge l'autoAlpha hérité de l'original masqué
    c.setAttribute("stroke", "#ffffff");
    c.setAttribute(
      "stroke-width",
      String(Math.round(Number(src.getAttribute("stroke-width") || 50) * 1.9))
    );
    c.setAttribute("opacity", "1");
    contenuMasque.appendChild(c);
    couloirs.push(c);
  }
  const bouts = [];
  for (const src of calque.querySelectorAll(".apparition")) {
    if (src.tagName === "ellipse" || src.tagName === "circle") {
      const b = src.cloneNode();
      b.removeAttribute("class");
      b.removeAttribute("style"); // purge l'autoAlpha hérité de l'original masqué
      b.setAttribute("fill", "#ffffff");
      b.setAttribute("opacity", "1");
      // On élargit un peu la zone pour couvrir la main/l'objet et ses abords.
      if (b.tagName === "ellipse") {
        b.setAttribute("rx", String(Number(b.getAttribute("rx")) * 1.8));
        b.setAttribute("ry", String(Number(b.getAttribute("ry")) * 1.8));
      } else {
        b.setAttribute("r", String(Number(b.getAttribute("r")) * 1.6));
      }
      contenuMasque.appendChild(b);
      bouts.push(b);
    }
  }

  // La photo complète, masquée, par-dessus la photo actuelle.
  const photo = document.createElementNS(SVG_NS, "image");
  photo.setAttribute("href", urlImageComplete);
  photo.setAttribute("x", "0");
  photo.setAttribute("y", "0");
  photo.setAttribute("width", String(vb.width));
  photo.setAttribute("height", String(vb.height));
  photo.setAttribute("preserveAspectRatio", "xMidYMid slice");
  photo.setAttribute("mask", "url(#masque-reveal)");
  calque.appendChild(photo);

  // États de départ : couloirs non dessinés, extrémités masquées.
  gsap.set(couloirs, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(bouts, { opacity: 0 });

  const tl = gsap.timeline({ paused: true });
  tl
    .to(image, { filter: "brightness(0.82)", duration: 0.8, ease: "sine.inOut" }, 0)
    .to(
      couloirs,
      { strokeDashoffset: 0, duration: 2.2, stagger: 0.25, ease: "power2.inOut" },
      0.2
    )
    .to(bouts, { opacity: 1, duration: 0.7, stagger: 0.12, ease: "sine.out" }, 1.7)
    .to(image, { filter: "brightness(1)", duration: 0.9, ease: "sine.inOut" }, 1.7);
  // Durée totale : ~2,6 secondes.

  const pluieDoree = creerPluieDoree(calque, coeurs);

  installerPilotage(tl, {
    legendePour: (p) =>
      p < 0.02
        ? ""
        : p < 0.92
          ? "La reconstitution apparaît…"
          : oeuvre.reconstitution.legende,
    surAller: () => pluieDoree({ subtile: true }),
  });
}

// ---------------------------------------------------------------------------
// Expérience « matière » : assemblage hologramme puis solidification
// en marbre dessiné (pour les œuvres sans photo reconstituée).
// ---------------------------------------------------------------------------

// Texture de marbre générée en SVG : veines de bruit fractal découpées dans
// la forme, plus un flou (« #flou-solidification ») animé de 14 → 0 pour
// donner l'impression que la pierre se condense.
const DEFS_MATIERE = `
<defs>
  <filter id="filtre-matiere" x="-30%" y="-30%" width="160%" height="160%">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="4" seed="7" result="bruit"/>
    <feColorMatrix in="bruit" type="luminanceToAlpha" result="bruitAlpha"/>
    <feComponentTransfer in="bruitAlpha" result="veines">
      <feFuncA type="gamma" amplitude="1" exponent="1.3" offset="0"/>
    </feComponentTransfer>
    <feFlood flood-color="#4d463d" result="teinte"/>
    <feComposite in="teinte" in2="veines" operator="in" result="veinesTeintees"/>
    <feMerge result="pierre">
      <feMergeNode in="SourceGraphic"/>
      <feMergeNode in="veinesTeintees"/>
    </feMerge>
    <feComposite in="pierre" in2="SourceAlpha" operator="in" result="pierreDecoupee"/>
    <feGaussianBlur id="flou-solidification" in="pierreDecoupee" stdDeviation="14"/>
  </filter>
</defs>`;

function initExperienceMatiere(calque) {
  const traces = calque.querySelectorAll(".trace");
  const coeurs = [...traces].filter((t) => !t.classList.contains("lueur-pulse"));
  const halos = calque.querySelectorAll(".lueur-pulse");
  const apparitions = [...calque.querySelectorAll(".apparition")];
  const contoursPointilles = apparitions.filter((a) => a.tagName === "path");
  let pulsation = null;

  calque.insertAdjacentHTML("afterbegin", DEFS_MATIERE);
  const flou = calque.querySelector("#flou-solidification");

  // Calque « pierre » : clones des membres et des mains en marbre clair.
  const pierre = document.createElementNS(SVG_NS, "g");
  pierre.setAttribute("class", "calque-matiere");
  pierre.setAttribute("filter", "url(#filtre-matiere)");
  for (const src of coeurs) {
    const clone = src.cloneNode();
    clone.removeAttribute("class");
    clone.setAttribute("stroke", "#d9cfba");
    clone.setAttribute("opacity", "1");
    clone.removeAttribute("filter");
    pierre.appendChild(clone);
  }
  for (const src of apparitions) {
    // Les mains (ellipses) deviennent de la pierre ; la pomme (circle) reste dorée.
    if (src.tagName === "ellipse") {
      const clone = src.cloneNode();
      clone.removeAttribute("class");
      clone.setAttribute("fill", "#d9cfba");
      clone.setAttribute("opacity", "1");
      pierre.appendChild(clone);
    }
  }
  calque.appendChild(pierre);

  // États de départ.
  gsap.set(traces, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(apparitions, { autoAlpha: 0 });
  gsap.set(pierre, { opacity: 0 });

  // ----- Timeline maîtresse : actuel → assemblage → œuvre complète -----
  const tl = gsap.timeline({
    paused: true,
    onComplete: demarrerPulsation,
  });

  tl
    // Phase 1 — assemblage des fragments (~2,3 s)
    .to(image, { filter: "brightness(0.55) saturate(0.6)", duration: 1.2, ease: "sine.inOut" }, 0)
    .fromTo(
      scan,
      { autoAlpha: 0, y: () => -0.2 * visuel.offsetHeight },
      { autoAlpha: 0.8, y: () => 1.1 * visuel.offsetHeight, duration: 1.6, ease: "power1.inOut" },
      0.1
    )
    .to(scan, { autoAlpha: 0, duration: 0.3 }, 1.6)
    .to(
      traces,
      { strokeDashoffset: 0, duration: 1.8, stagger: 0.12, ease: "power2.inOut" },
      0.3
    )
    .to(apparitions, { autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "sine.out" }, 1.5)
    .addLabel("assemblage", 2.3)
    // Phase 2 — la matière se solidifie (~2,2 s)
    .to(pierre, { opacity: 0.94, duration: 2, ease: "sine.inOut" }, "assemblage")
    .to(flou, { attr: { stdDeviation: 0 }, duration: 2.2, ease: "power1.inOut" }, "assemblage")
    .fromTo(
      pierre,
      { scale: 1.04, transformOrigin: "50% 50%" },
      { scale: 1, duration: 2.2, ease: "sine.out" },
      "assemblage"
    )
    // L'hologramme s'efface en douceur derrière la pierre…
    .to(coeurs, { opacity: 0.06, duration: 1.8, ease: "sine.inOut" }, "assemblage+=0.3")
    .to(halos, { opacity: 0.1, duration: 1.8, ease: "sine.inOut" }, "assemblage+=0.3")
    .to(contoursPointilles, { autoAlpha: 0.12, duration: 1.6, ease: "sine.inOut" }, "assemblage+=0.4")
    // …et la lumière revient sur l'œuvre complète.
    .to(
      image,
      { filter: "brightness(0.92) saturate(0.9)", duration: 1.6, ease: "sine.inOut" },
      "assemblage+=0.8"
    )
    .addLabel("complet");

  function demarrerPulsation() {
    if (prefereMoinsDeMotion.matches) return;
    pulsation = gsap.to(halos, {
      opacity: 0.3,
      duration: 1.8,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  function arreterPulsation() {
    if (pulsation) {
      pulsation.kill();
      pulsation = null;
      gsap.set(halos, { opacity: 0.1 });
    }
  }

  const pluieDoree = creerPluieDoree(calque, coeurs);

  installerPilotage(tl, {
    legendePour: (p) =>
      p < 0.02
        ? ""
        : p < 0.52
          ? "Assemblage des fragments…"
          : p < 0.98
            ? "La matière se solidifie…"
            : oeuvre.reconstitution.legende,
    surAller: () => pluieDoree(),
    surPause: arreterPulsation,
  });
}

// ---------------------------------------------------------------------------
// Expérience « hologramme » (comportement par défaut)
// ---------------------------------------------------------------------------

function initExperienceHologramme(calque) {
  const traces = calque.querySelectorAll(".trace");
  const apparitions = calque.querySelectorAll(".apparition");
  const halos = calque.querySelectorAll(".lueur-pulse");
  let pulsation = null;

  gsap.set(traces, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(apparitions, { autoAlpha: 0 });

  const tl = gsap.timeline({
    paused: true,
    defaults: { ease: "sine.inOut" },
    onComplete: () => {
      if (prefereMoinsDeMotion.matches) return;
      pulsation = gsap.to(halos, {
        opacity: 0.55,
        duration: 1.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    },
  });

  tl
    .to(image, { filter: "brightness(0.55) saturate(0.6)", duration: 1 }, 0)
    .fromTo(
      scan,
      { autoAlpha: 0, y: () => -0.2 * visuel.offsetHeight },
      {
        autoAlpha: 0.85,
        y: () => 1.1 * visuel.offsetHeight,
        duration: 1.5,
        ease: "power1.inOut",
      },
      0.1
    )
    .to(scan, { autoAlpha: 0, duration: 0.3 }, 1.45)
    .to(
      traces,
      { strokeDashoffset: 0, duration: 1.5, stagger: 0.12, ease: "power2.inOut" },
      0.45
    )
    .to(
      apparitions,
      { autoAlpha: 1, duration: 0.6, stagger: 0.1, ease: "sine.out" },
      1.7
    );

  function arreterPulsation() {
    if (pulsation) {
      pulsation.kill();
      pulsation = null;
      gsap.set(halos, { clearProps: "opacity" });
    }
  }

  installerPilotage(tl, {
    legendePour: (p) => (p < 0.05 ? "" : p < 0.95 ? "Reconstitution…" : oeuvre.reconstitution.legende),
    surPause: arreterPulsation,
  });
}

// ---------------------------------------------------------------------------
// Démarrage : photo reconstituée si disponible, sinon matière, sinon
// hologramme. Si l'image annoncée est introuvable (pas encore fournie),
// on retombe automatiquement sur l'expérience dessinée.
// ---------------------------------------------------------------------------

if (oeuvre.reconstitution) {
  scan.insertAdjacentHTML("beforebegin", oeuvre.reconstitution.svg);
  const calque = visuel.querySelector("svg");
  calque.classList.add("calque-reconstitution");

  const demarrerSansPhoto = () =>
    oeuvre.reconstitution.effetMatiere
      ? initExperienceMatiere(calque)
      : initExperienceHologramme(calque);

  if (oeuvre.reconstitution.imageComplete) {
    const test = new Image();
    test.onload = () =>
      initExperiencePhoto(calque, oeuvre.reconstitution.imageComplete);
    test.onerror = demarrerSansPhoto;
    test.src = oeuvre.reconstitution.imageComplete;
  } else {
    demarrerSansPhoto();
  }
} else {
  btnReveal.hidden = true;
}

// ---------------------------------------------------------------------------
// Entrée en douceur de la page.
// ---------------------------------------------------------------------------

if (!prefereMoinsDeMotion.matches) {
  gsap.from(
    [".oeuvre-titre", ".oeuvre-date", ".oeuvre-figure", ".oeuvre-description", ".oeuvre-actions"],
    {
      autoAlpha: 0,
      y: 30,
      duration: 0.7,
      stagger: 0.12,
      ease: "power3.out",
    }
  );
}
