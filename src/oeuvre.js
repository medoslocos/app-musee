import gsap from "gsap";
import { initNatif, initTailleTexte } from "./commun.js";
import { musee, oeuvres } from "./data/musee.js";

initNatif();
initTailleTexte();

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
// Reconstitution : calque SVG « hologramme » superposé à la photo.
// Conventions du moteur : .trace = contours dessinés, .apparition = fondus,
// .lueur-pulse = halos qui respirent une fois la reconstitution visible.
// ---------------------------------------------------------------------------

let versOrigine = null; // timeline GSAP construite si l'œuvre a une reconstitution
let pulsation = null;

if (oeuvre.reconstitution) {
  scan.insertAdjacentHTML("beforebegin", oeuvre.reconstitution.svg);
  const calque = visuel.querySelector("svg");
  calque.classList.add("calque-reconstitution");

  const traces = calque.querySelectorAll(".trace");
  const apparitions = calque.querySelectorAll(".apparition");
  const halos = calque.querySelectorAll(".lueur-pulse");

  // États de départ : contours « non dessinés », fondus invisibles.
  gsap.set(traces, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(apparitions, { autoAlpha: 0 });

  versOrigine = gsap.timeline({
    paused: true,
    defaults: { ease: "sine.inOut" },
    onComplete: () => {
      // Les halos « respirent » doucement tant qu'on reste à l'origine.
      pulsation = gsap.to(halos, {
        opacity: 0.55,
        duration: 1.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    },
    onReverseComplete: () => {
      legende.textContent = "";
    },
  });

  versOrigine
    // La photo s'assombrit pour laisser briller l'hologramme.
    .to(image, { filter: "brightness(0.55) saturate(0.6)", duration: 1 }, 0)
    // Balayage lumineux de haut en bas, comme un scanner.
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
    // Les bras se dessinent progressivement…
    .to(
      traces,
      { strokeDashoffset: 0, duration: 1.5, stagger: 0.12, ease: "power2.inOut" },
      0.45
    )
    // …puis les détails (contours pointillés, mains, pomme) apparaissent.
    .to(
      apparitions,
      { autoAlpha: 1, duration: 0.6, stagger: 0.1, ease: "sine.out" },
      1.7
    );
  // Durée totale : environ 2,6 secondes.

  function arreterPulsation() {
    if (pulsation) {
      pulsation.kill();
      pulsation = null;
      gsap.set(halos, { clearProps: "opacity" });
    }
  }

  function montrerEtat(origine) {
    btnOrigine.setAttribute("aria-pressed", String(origine));
    btnAujourdhui.setAttribute("aria-pressed", String(!origine));
    if (origine) {
      legende.textContent = oeuvre.reconstitution.legende;
      if (prefereMoinsDeMotion.matches) {
        versOrigine.progress(1).pause();
      } else {
        versOrigine.play();
      }
    } else {
      arreterPulsation();
      if (prefereMoinsDeMotion.matches) {
        versOrigine.progress(0).pause();
        legende.textContent = "";
      } else {
        versOrigine.reverse();
      }
    }
  }

  btnReveal.addEventListener("click", () => {
    btnReveal.hidden = true;
    bascule.hidden = false;
    if (!prefereMoinsDeMotion.matches) {
      gsap.from(".bascule .btn", { autoAlpha: 0, y: 12, duration: 0.4, stagger: 0.08 });
    }
    montrerEtat(true);
    btnOrigine.focus();
  });

  btnOrigine.addEventListener("click", () => montrerEtat(true));
  btnAujourdhui.addEventListener("click", () => montrerEtat(false));
} else {
  // Œuvre sans reconstitution : le bouton n'a pas lieu d'être.
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
