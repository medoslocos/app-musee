import gsap from "gsap";
import { initNatif, initTailleTexte } from "./commun.js";
import { creerCarteOeuvre } from "./cartes.js";
import { oeuvres } from "./data/musee.js";

initNatif();
initTailleTexte();

// Toutes les œuvres du fichier de données, dans l'ordre.
const liste = document.getElementById("liste-oeuvres");
for (const oeuvre of oeuvres) {
  liste.appendChild(creerCarteOeuvre(oeuvre));
}

// Entrée en douceur, sauf si l'utilisateur préfère un mouvement réduit.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  gsap.from(".card", {
    autoAlpha: 0,
    y: 50,
    duration: 0.7,
    stagger: 0.1,
    ease: "power3.out",
  });
}
