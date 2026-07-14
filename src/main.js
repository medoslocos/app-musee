import gsap from "gsap";
import { Capacitor } from "@capacitor/core";

// Sur iOS/Android : plein écran, la WebView passe sous la barre d'état
// (les encoches sont compensées en CSS via env(safe-area-inset-*)).
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  });
}

// Découpe le titre en lettres animables individuellement.
function splitTitle(el, text) {
  el.textContent = "";
  for (const char of text) {
    const span = document.createElement("span");
    if (char === " ") {
      span.className = "word-space";
      span.textContent = " ";
    } else {
      span.className = "char";
      span.textContent = char;
    }
    el.appendChild(span);
  }
}

const title = document.querySelector(".hero-title");
splitTitle(title, "Musée Interactif");

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
        ".btn",
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
