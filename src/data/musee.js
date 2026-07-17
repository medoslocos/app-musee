/*
 * Données du musée : c'est LE fichier à remplacer pour changer de musée.
 * Le reste du code est un moteur générique qui lit ces données.
 *
 * Chaque œuvre :
 * - id           : identifiant utilisé dans l'URL (oeuvre.html?id=...)
 * - titre, date  : affichés tels quels
 * - accroche     : phrase courte pour la carte
 * - description  : 3-4 phrases en français simple
 * - image        : chemin relatif à la racine du site (dossier public/)
 * - credit       : mention de la photo (licence libre)
 * - vedette      : true → l'œuvre apparaît sur la page d'accueil
 *                  (toutes les œuvres apparaissent sur la page Collections)
 * - reconstitution (facultatif) :
 *   - legende : phrase affichée sous l'image quand la reconstitution est visible
 *   - svg     : calque SVG superposé à la photo (même viewBox que l'image).
 *     Conventions d'animation du moteur :
 *       .trace       → contours dessinés progressivement (stroke)
 *       .apparition  → éléments qui apparaissent en fondu
 *       .lueur-pulse → halos qui « respirent » une fois la reconstitution visible
 *   - effetMatiere : true → expérience « matière » (assemblage + marbre
 *     solidifié + particules + curseur) au lieu du simple hologramme
 *   - reconstitutionPrompt : description (en anglais, pour les modèles
 *     d'inpainting) des parties à générer — consommée par
 *     scripts/generer-reconstitution.mjs, jamais affichée aux visiteurs.
 *   - imageComplete : chemin d'une PHOTO de l'œuvre reconstituée.
 *     Si le fichier existe, le moteur montre une transition photo → photo
 *     (masque animé le long des membres, des épaules vers les mains).
 *     Si le fichier est absent, repli automatique sur matière/hologramme.
 *     Spécifications de la photo : mêmes dimensions et cadrage EXACTS que
 *     l'image originale (superposition au pixel près), JPEG sRGB, seules
 *     les parties reconstituées diffèrent ; les zones révélées suivent
 *     les tracés .trace du calque SVG.
 */

export const musee = {
  nom: "Musée Interactif",
  slogan: "Explorez l'art autrement",
  // Petite mention de réassurance affichée en bas de l'accueil.
  reassurance: "Données hébergées en France 🇫🇷",
  // Numéro au format international pour le lien d'appel direct.
  telephoneLien: "+33123456789",
  infosPratiques: [
    {
      icone: "🕙",
      libelle: "Horaires",
      texte: "Du mardi au dimanche, de 10 h à 19 h",
    },
    {
      icone: "📍",
      libelle: "Adresse",
      texte: "12 place des Arts, 75000 Paris",
    },
    {
      icone: "📞",
      libelle: "Téléphone",
      texte: "01 23 45 67 89",
    },
    {
      icone: "♿",
      libelle: "Accès",
      texte: "Le musée est entièrement accessible, ascenseurs à chaque étage",
    },
    {
      icone: "🎟️",
      libelle: "Tarifs",
      texte: "Entrée gratuite le premier dimanche du mois",
    },
  ],
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
    vedette: true,
    reconstitution: {
      // Active la reconstitution « matière » : assemblage + solidification
      // en marbre, particules dorées, curseur avant/après.
      effetMatiere: true,
      // Photo de la statue avec ses bras : déposer le fichier dans
      // public/images/ pour activer la transition photo → photo
      // (repli automatique sur l'effet matière tant qu'il est absent).
      imageComplete: "images/venus-reconstituee.jpg",
      reconstitutionPrompt:
        "Restore the two missing arms of this ancient Greek marble statue of Aphrodite. " +
        "Her right arm reaches down across the body toward the drapery on her left hip; " +
        "her left arm is raised, the hand holding a small apple. " +
        "Same weathered white Parian marble as the torso, same museum lighting and grain, " +
        "seamless joins at the shoulder stumps, photorealistic, nothing else changed.",
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

  {
    id: "victoire-de-samothrace",
    titre: "Victoire de Samothrace",
    categorie: "Antiquités grecques",
    date: "Vers 190 avant J.-C.",
    accroche: "La déesse ailée qui a perdu sa tête",
    description:
      "Cette grande statue représente Niké, la déesse grecque de la victoire. " +
      "Elle se pose sur l'avant d'un navire de pierre, les ailes encore ouvertes. " +
      "Elle a été retrouvée en 1863 sur l'île de Samothrace, brisée en de nombreux morceaux. " +
      "Sa tête et ses bras n'ont jamais été retrouvés.",
    image: "images/victoire-de-samothrace.jpg",
    imageAlt:
      "Statue en marbre d'une femme ailée sans tête ni bras, drapée, posée sur une proue de navire en pierre",
    credit:
      "Photo : Shonagon, musée du Louvre — Wikimedia Commons, licence CC0 (domaine public)",
    vedette: true,
    reconstitution: {
      // La transition photo s'activera automatiquement quand l'image
      // approuvée sera déposée dans public/images/.
      imageComplete: "images/victoire-reconstituee.jpg",
      reconstitutionPrompt:
        "Restore the missing head and both arms of this winged ancient Greek marble statue " +
        "of Nike standing on a stone ship prow. Head facing forward with a classical Greek " +
        "chignon hairstyle; right arm raised high in triumph with an open hand; left arm " +
        "lowered along the drapery. Same weathered marble as the body, same museum lighting " +
        "and grain, seamless joins, photorealistic, nothing else changed.",
      legende:
        "Reconstitution possible : la tête tournée vers l'avant, le bras droit levé pour annoncer la victoire.",
      svg: `
<svg viewBox="0 0 1280 1544" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="or-hologramme" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe9b0"/>
      <stop offset="1" stop-color="#dfa63d"/>
    </linearGradient>
    <filter id="lueur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
  </defs>

  <!-- La tête : profil tourné vers l'avant (la gauche de l'image), chignon grec -->
  <g>
    <path class="trace lueur-pulse" pathLength="1"
      d="M 688 156 C 667 156 654 174 654 196 C 654 220 668 236 688 236 C 708 236 722 220 722 196 C 722 174 709 156 688 156 Z"
      fill="none" stroke="#e8b95c" stroke-width="20" stroke-linecap="round" opacity="0.35" filter="url(#lueur)"/>
    <path class="trace" pathLength="1"
      d="M 688 156 C 667 156 654 174 654 196 C 654 220 668 236 688 236 C 708 236 722 220 722 196 C 722 174 709 156 688 156 Z"
      fill="none" stroke="url(#or-hologramme)" stroke-width="9" stroke-linecap="round" opacity="0.65"/>
    <path class="apparition" pathLength="1"
      d="M 688 156 C 667 156 654 174 654 196 C 654 220 668 236 688 236 C 708 236 722 220 722 196 C 722 174 709 156 688 156 Z"
      fill="#e8b95c" opacity="0.18"/>
    <!-- Chignon et nuque -->
    <circle class="apparition" cx="720" cy="212" r="13" fill="#e8b95c" opacity="0.45"/>
    <path class="apparition" pathLength="1" d="M 664 168 Q 686 156 710 166" fill="none"
      stroke="#ffe9b0" stroke-width="4" stroke-dasharray="10 8" opacity="0.9"/>
  </g>

  <!-- Bras droit levé au-dessus de l'aile : il annonce la victoire -->
  <g>
    <path class="trace lueur-pulse" pathLength="1" d="M 732 298 C 778 258 802 208 804 152 Q 804 120 786 84"
      fill="none" stroke="#e8b95c" stroke-width="40" stroke-linecap="round" opacity="0.35" filter="url(#lueur)"/>
    <path class="trace" pathLength="1" d="M 732 298 C 778 258 802 208 804 152 Q 804 120 786 84"
      fill="none" stroke="url(#or-hologramme)" stroke-width="27" stroke-linecap="round" opacity="0.55"/>
    <path class="apparition" pathLength="1" d="M 732 298 C 778 258 802 208 804 152 Q 804 120 786 84"
      fill="none" stroke="#ffe9b0" stroke-width="3" stroke-dasharray="12 9" opacity="0.9"/>
    <!-- Main ouverte vers le ciel -->
    <ellipse class="apparition" cx="780" cy="64" rx="18" ry="14" fill="#e8b95c" opacity="0.5"/>
  </g>

  <!-- Bras gauche : le long du corps, vers le drapé de la hanche -->
  <g>
    <path class="trace lueur-pulse" pathLength="1" d="M 600 330 C 568 390 556 450 566 505 Q 572 532 592 552"
      fill="none" stroke="#e8b95c" stroke-width="38" stroke-linecap="round" opacity="0.35" filter="url(#lueur)"/>
    <path class="trace" pathLength="1" d="M 600 330 C 568 390 556 450 566 505 Q 572 532 592 552"
      fill="none" stroke="url(#or-hologramme)" stroke-width="26" stroke-linecap="round" opacity="0.55"/>
    <path class="apparition" pathLength="1" d="M 600 330 C 568 390 556 450 566 505 Q 572 532 592 552"
      fill="none" stroke="#ffe9b0" stroke-width="3" stroke-dasharray="12 9" opacity="0.9"/>
    <ellipse class="apparition" cx="598" cy="562" rx="17" ry="13" fill="#e8b95c" opacity="0.5"/>
  </g>
</svg>`,
    },
  },

  {
    id: "amphore-panathenaique",
    titre: "Amphore panathénaïque",
    categorie: "Céramique grecque",
    date: "Vers 530 avant J.-C.",
    accroche: "Le trophée des jeux d'Athènes",
    description:
      "Cette grande jarre en terre cuite était un prix de concours. " +
      "Elle était remplie d'huile d'olive précieuse et offerte aux vainqueurs des jeux d'Athènes. " +
      "Sur la panse, la déesse Athéna est peinte en noir, prête au combat. " +
      "L'autre face montre l'épreuve gagnée : une course à pied.",
    image: "images/amphore-panathenaique.jpg",
    imageAlt:
      "Grande amphore en terre cuite orangée à figures noires : Athéna casquée tient une lance et un bouclier",
    credit:
      "Photo : The Metropolitan Museum of Art, New York — Wikimedia Commons, licence CC0 (domaine public)",
    vedette: true,
  },

  {
    id: "tete-de-constantin",
    titre: "Tête colossale de Constantin",
    categorie: "Art romain",
    date: "Vers 325 après J.-C.",
    accroche: "Le regard d'un empereur, sans son corps",
    description:
      "Cette tête en marbre représente Constantin, un grand empereur romain. " +
      "Elle mesure presque un mètre : la statue entière était haute comme deux personnes. " +
      "Le corps a disparu depuis des siècles, et le nez comme le menton sont abîmés. " +
      "Les grands yeux levés vers le ciel voulaient montrer un chef guidé par le divin.",
    image: "images/tete-constantin.jpg",
    imageAlt:
      "Tête colossale en marbre blanc d'un homme aux grands yeux, nez cassé, posée sur un socle",
    credit:
      "Photo : The Metropolitan Museum of Art, New York — Wikimedia Commons, licence CC0 (domaine public)",
    vedette: false,
  },

  {
    id: "bacinet-medieval",
    titre: "Bacinet à visière",
    categorie: "Moyen Âge",
    date: "Vers 1375–1425",
    accroche: "Le casque des chevaliers de la guerre de Cent Ans",
    description:
      "Ce casque de fer protégeait la tête d'un chevalier. " +
      "Sa visière pointue, appelée « bec de passereau », faisait glisser les coups d'épée et les flèches. " +
      "Le chevalier pouvait la relever pour respirer entre deux combats. " +
      "Des casques comme celui-ci étaient portés en France pendant la guerre de Cent Ans.",
    image: "images/bacinet-medieval.jpg",
    imageAlt:
      "Casque médiéval en fer poli à visière pointue percée de trous, sur fond gris",
    credit:
      "Photo : The Metropolitan Museum of Art, New York — Wikimedia Commons, licence CC0 (domaine public)",
    vedette: false,
  },
];
