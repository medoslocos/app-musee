import { Capacitor } from "@capacitor/core";

// Sur iOS/Android : plein écran, la WebView passe sous la barre d'état
// (les encoches sont compensées en CSS via env(safe-area-inset-*)).
export function initNatif() {
  if (!Capacitor.isNativePlatform()) return;
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  });
}

// ---------------------------------------------------------------------------
// Taille du texte : 3 niveaux, mémorisés pendant la session.
// Le niveau est posé sur <html data-texte="...">, le CSS fait le reste
// (tout est en rem, donc textes ET boutons grandissent ensemble).
// ---------------------------------------------------------------------------

const NIVEAUX = [
  { id: "normal", libelle: "Normal" },
  { id: "grand", libelle: "Grand" },
  { id: "tres-grand", libelle: "Très grand" },
];
const CLE_SESSION = "musee-taille-texte";

export function initTailleTexte() {
  const btn = document.getElementById("btn-taille-texte");
  if (!btn) return;
  const libelle = btn.querySelector(".btn-taille-libelle");

  function appliquer(id) {
    const niveau = NIVEAUX.find((n) => n.id === id) ?? NIVEAUX[0];
    if (niveau.id === "normal") {
      delete document.documentElement.dataset.texte;
    } else {
      document.documentElement.dataset.texte = niveau.id;
    }
    libelle.textContent = `Texte : ${niveau.libelle}`;
    const suivant = NIVEAUX[(NIVEAUX.indexOf(niveau) + 1) % NIVEAUX.length];
    btn.setAttribute(
      "aria-label",
      `Taille du texte : ${niveau.libelle}. Appuyer pour passer à : ${suivant.libelle}.`
    );
    sessionStorage.setItem(CLE_SESSION, niveau.id);
    return niveau;
  }

  let actuel = appliquer(sessionStorage.getItem(CLE_SESSION) ?? "normal");

  btn.addEventListener("click", () => {
    actuel = appliquer(NIVEAUX[(NIVEAUX.indexOf(actuel) + 1) % NIVEAUX.length].id);
  });
}
