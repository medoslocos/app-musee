import gsap from "gsap";
import { initNatif, initTailleTexte } from "./commun.js";
import { musee } from "./data/musee.js";

initNatif();
initTailleTexte();

// Infos pratiques : générées depuis le fichier de données.
const liste = document.getElementById("infos-liste");
for (const info of musee.infosPratiques) {
  const li = document.createElement("li");
  const icone = document.createElement("span");
  icone.className = "infos-icone";
  icone.setAttribute("aria-hidden", "true");
  icone.textContent = info.icone;
  const texte = document.createElement("span");
  const libelle = document.createElement("strong");
  libelle.textContent = `${info.libelle} : `;
  texte.append(libelle, info.texte);
  li.append(icone, texte);
  liste.appendChild(li);
}

// Le bouton d'appel utilise le numéro du fichier de données.
document.getElementById("btn-appeler").href = `tel:${musee.telephoneLien}`;

// Entrée en douceur, sauf si l'utilisateur préfère un mouvement réduit.
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  gsap.from(".infos-liste li, .gallery-actions .btn", {
    autoAlpha: 0,
    y: 40,
    duration: 0.6,
    stagger: 0.09,
    ease: "power3.out",
  });
}
