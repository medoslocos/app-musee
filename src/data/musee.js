/*
 * Données du musée : c'est LE fichier à remplacer pour changer de musée.
 * Le reste du code est un moteur générique qui lit ces données.
 *
 * Chaque œuvre :
 * - id           : identifiant utilisé dans l'URL (oeuvre.html?id=...)
 * - titre, date  : affichés tels quels
 * - accroche     : phrase courte pour la carte d'accueil
 * - description  : 3-4 phrases en français simple
 * - image        : chemin relatif à la racine du site (dossier public/)
 * - credit       : mention de la photo (licence libre)
 * - reconstitution (facultatif) :
 *   - legende : phrase affichée sous l'image quand la reconstitution est visible
 *   - svg     : calque SVG superposé à la photo (même viewBox que l'image).
 *     Conventions d'animation du moteur :
 *       .trace      → contours dessinés progressivement (stroke)
 *       .apparition → éléments qui apparaissent en fondu
 */

export const musee = {
  nom: "Musée Interactif",
  slogan: "Explorez l'art autrement",
};

export const oeuvres = [
  {
    id: "venus-de-milo",
    titre: "Vénus de Milo",
    categorie: "Antiquités grecques",
    date: "Vers 130–100 avant J.-C.",
    accroche: "La déesse au mystère des bras perdus",
    description:
      "Cette statue en marbre représente Aphrodite, la déesse grecque de l'amour. " +
      "Elle a été sculptée il y a plus de 2 000 ans, puis retrouvée en 1820 sur l'île de Milo, en Grèce. " +
      "Ses bras ont été perdus et personne ne sait exactement comment ils étaient placés. " +
      "Les spécialistes pensent qu'elle tenait peut-être une pomme dans la main gauche.",
    image: "images/venus-de-milo.jpg",
    imageAlt:
      "Statue en marbre blanc d'une femme drapée à partir des hanches, sans bras, sur fond de marbre sombre",
    credit:
      "Photo : Shonagon, musée du Louvre — Wikimedia Commons, licence CC0 (domaine public)",
    reconstitution: {
      legende:
        "Reconstitution possible : la déesse tenait sans doute une pomme, souvenir du jugement de Pâris.",
      svg: `
<svg viewBox="0 0 1280 2163" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="or-hologramme" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9b0"/>
      <stop offset="1" stop-color="#dfa63d"/>
    </linearGradient>
    <filter id="lueur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>

  <!-- Bras droit (à gauche de l'image) : descend vers le drapé de la hanche -->
  <g>
    <path class="trace lueur-pulse" pathLength="1" d="M 470 655 Q 418 780 432 900 Q 448 992 540 1035"
      fill="none" stroke="#e8b95c" stroke-width="72" stroke-linecap="round" opacity="0.35" filter="url(#lueur)"/>
    <path class="trace" pathLength="1" d="M 470 655 Q 418 780 432 900 Q 448 992 540 1035"
      fill="none" stroke="url(#or-hologramme)" stroke-width="52" stroke-linecap="round" opacity="0.55"/>
    <path class="apparition" pathLength="1" d="M 470 655 Q 418 780 432 900 Q 448 992 540 1035"
      fill="none" stroke="#ffe9b0" stroke-width="3" stroke-dasharray="14 10" opacity="0.9"/>
    <ellipse class="apparition" cx="556" cy="1042" rx="34" ry="24" fill="#e8b95c" opacity="0.5"/>
  </g>

  <!-- Bras gauche (à droite de l'image) : levé, la main tient une pomme -->
  <g>
    <path class="trace lueur-pulse" pathLength="1" d="M 818 448 C 905 478 965 555 982 630 Q 990 660 1005 635 C 1030 580 1058 490 1072 435"
      fill="none" stroke="#e8b95c" stroke-width="70" stroke-linecap="round" opacity="0.35" filter="url(#lueur)"/>
    <path class="trace" pathLength="1" d="M 818 448 C 905 478 965 555 982 630 Q 990 660 1005 635 C 1030 580 1058 490 1072 435"
      fill="none" stroke="url(#or-hologramme)" stroke-width="50" stroke-linecap="round" opacity="0.55"/>
    <path class="apparition" pathLength="1" d="M 818 448 C 905 478 965 555 982 630 Q 990 660 1005 635 C 1030 580 1058 490 1072 435"
      fill="none" stroke="#ffe9b0" stroke-width="3" stroke-dasharray="14 10" opacity="0.9"/>
    <ellipse class="apparition" cx="1078" cy="424" rx="30" ry="26" fill="#e8b95c" opacity="0.5"/>
    <!-- La pomme -->
    <circle class="apparition" cx="1090" cy="352" r="36" fill="url(#or-hologramme)" opacity="0.75"/>
    <path class="apparition" d="M 1090 316 Q 1098 298 1112 292" fill="none"
      stroke="#ffe9b0" stroke-width="6" stroke-linecap="round" opacity="0.9"/>
  </g>
</svg>`,
    },
  },
];
