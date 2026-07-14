import gsap from "gsap";
import { initNatif, initTailleTexte } from "./commun.js";
import { creerCarteOeuvre } from "./cartes.js";
import { oeuvres } from "./data/musee.js";

initNatif();
initTailleTexte();

// ---------------------------------------------------------------------------
// Œuvres en vedette : l'accueil ne montre que les œuvres marquées `vedette`,
// la page Collections liste tout.
// ---------------------------------------------------------------------------

const listeOeuvres = document.getElementById("liste-oeuvres");
for (const oeuvre of oeuvres.filter((o) => o.vedette)) {
  listeOeuvres.appendChild(creerCarteOeuvre(oeuvre));
}

// ---------------------------------------------------------------------------
// Titre animé lettre par lettre. Chaque mot est enveloppé dans un span
// insécable pour qu'aucun mot ne soit coupé en deux, même en très grand.
// ---------------------------------------------------------------------------

function splitTitle(el, text) {
  el.textContent = "";
  const words = text.split(" ");
  words.forEach((word, i) => {
    const wordSpan = document.createElement("span");
    wordSpan.className = "word";
    for (const char of word) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = char;
      wordSpan.appendChild(span);
    }
    el.appendChild(wordSpan);
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode(" "));
    }
  });
}

const title = document.querySelector(".hero-title");
splitTitle(title, "Musée Interactif");

// ---------------------------------------------------------------------------
// Animations GSAP
// ---------------------------------------------------------------------------

const mm = gsap.matchMedia();

mm.add(
  {
    reduceMotion: "(prefers-reduced-motion: reduce)",
    motionOK: "(prefers-reduced-motion: no-preference)",
    hoverOK: "(hover: hover) and (pointer: fine)",
  },
  (context) => {
    const { reduceMotion, hoverOK } = context.conditions;

    if (reduceMotion) {
      gsap.set(
        [".hero-kicker", ".hero-title .char", ".hero-subtitle", ".btn", ".card", ".shape"],
        { clearProps: "all" }
      );
      return;
    }

    // Séquence d'entrée de la page d'accueil.
    const intro = gsap.timeline({
      defaults: { ease: "power3.out", duration: 0.8 },
    });

    intro
      .from(".hero-kicker", { autoAlpha: 0, y: 20 })
      .from(
        ".hero-title .char",
        {
          autoAlpha: 0,
          y: 80,
          rotationX: -90,
          stagger: { each: 0.04, from: "start" },
          ease: "back.out(1.7)",
          duration: 1,
        },
        "-=0.4"
      )
      .from(".hero-subtitle", { autoAlpha: 0, y: 30 }, "-=0.5")
      .from(
        ".hero-actions .btn",
        { autoAlpha: 0, y: 20, scale: 0.9, stagger: 0.12, ease: "back.out(2)" },
        "-=0.4"
      )
      .from(
        ".card",
        { autoAlpha: 0, y: 60, stagger: { each: 0.12, from: "start" } },
        "-=0.3"
      )
      .from(".shape", { autoAlpha: 0, scale: 0, stagger: 0.1 }, 0.2);

    // Flottement continu des formes décoratives (démarre après l'intro).
    intro.call(() => {
      gsap.to(".shape-circle", {
        y: -30,
        x: 15,
        duration: 4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".shape-square", {
        rotation: 360,
        duration: 24,
        repeat: -1,
        ease: "none",
      });
      gsap.to(".shape-triangle", {
        y: 25,
        rotation: -12,
        duration: 5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
      gsap.to(".shape-ring", {
        rotation: -360,
        scale: 1.08,
        duration: 30,
        repeat: -1,
        ease: "none",
      });
    });

    // Mise en avant des cartes : survol à la souris, pression du doigt au tactile.
    const cards = gsap.utils.toArray(".card");
    const cleanups = cards.map((card) => {
      const lift = gsap.to(card, {
        y: -8,
        scale: 1.02,
        duration: 0.3,
        ease: "power2.out",
        paused: true,
      });
      const press = gsap.to(card, {
        scale: 0.97,
        duration: 0.15,
        ease: "power2.out",
        paused: true,
      });

      if (hoverOK) {
        const onEnter = () => lift.play();
        const onLeave = () => lift.reverse();
        card.addEventListener("mouseenter", onEnter);
        card.addEventListener("mouseleave", onLeave);
        return () => {
          card.removeEventListener("mouseenter", onEnter);
          card.removeEventListener("mouseleave", onLeave);
        };
      }

      const onDown = () => press.play();
      const onUp = () => press.reverse();
      card.addEventListener("touchstart", onDown, { passive: true });
      card.addEventListener("touchend", onUp, { passive: true });
      card.addEventListener("touchcancel", onUp, { passive: true });
      return () => {
        card.removeEventListener("touchstart", onDown);
        card.removeEventListener("touchend", onUp);
        card.removeEventListener("touchcancel", onUp);
      };
    });

    return () => cleanups.forEach((fn) => fn());
  }
);
