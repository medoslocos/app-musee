/**
 * Génération du reçu client : HTML pur (testable en Node), imprimé en PDF
 * par expo-print. Reprend l'identité visuelle du ticket d'estimation F1 :
 * fond craie, montant en serif géant, bord perforé.
 */

import type { EstimationEnregistree, LigneLivrePolice } from '../livre/depot';
import type { IdentiteVendeur } from '../livre/chiffrement';
import { LIBELLES_PAIEMENT } from '../domaine/paiement';
import { formaterCentimes } from '../domaine/monnaie';

export interface Boutique {
  nom: string;
  adresse: string;
}

export interface DonneesRecu {
  boutique: Boutique;
  estimation: EstimationEnregistree;
  ligne: LigneLivrePolice;
  identite: IdentiteVendeur;
  signatureSvg: string | null;
}

function echapperHtml(texte: string): string {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formaterDateFr(dateIso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(dateIso),
  );
}

export function genererHtmlRecu(donnees: DonneesRecu): string {
  const { boutique, estimation, ligne, identite, signatureSvg } = donnees;
  const e = echapperHtml;
  const detail = [
    ['Objet', estimation.description_objet],
    ['Poids', `${estimation.poids_grammes.replace('.', ',')} g`],
    ['Nature du métal', ligne.nature_metal],
    ['Cours du métal pur', `${formaterCentimes(estimation.cours_centimes_par_gramme)}/g`],
    ['Valeur fonte', formaterCentimes(estimation.valeur_fonte_centimes)],
    ['Marge', `− ${formaterCentimes(estimation.marge_centimes)}`],
    ['Mode de paiement', LIBELLES_PAIEMENT[ligne.mode_paiement]],
  ]
    .map(
      ([libelle, valeur]) =>
        `<tr><td class="libelle">${e(libelle ?? '')}</td><td class="valeur">${e(valeur ?? '')}</td></tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Reçu n° ${ligne.numero}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 32px; background: #FAF8F4; color: #1A1814;
    font-family: 'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px; line-height: 1.5;
  }
  .ticket {
    max-width: 560px; margin: 0 auto; background: #FAF8F4;
    border: 1px solid #F1EDE5; border-radius: 16px; padding: 28px 32px 20px;
  }
  header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
  .boutique { font-weight: 600; font-size: 16px; }
  .boutique small { display: block; font-weight: 400; color: #8A8578; }
  .numero { text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; font-size: 12px; }
  .date { color: #8A8578; font-size: 12px; }
  .etiquette { color: #8A8578; margin: 16px 0 2px; }
  .montant {
    font-family: 'Fraunces', Georgia, 'Times New Roman', serif;
    font-weight: 600; font-size: 52px; color: #B8963E;
    font-variant-numeric: tabular-nums; margin: 0 0 20px;
  }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 6px 0; border-bottom: 1px solid #F1EDE5; vertical-align: top; }
  td.libelle { color: #8A8578; }
  td.valeur { text-align: right; font-variant-numeric: tabular-nums; }
  .bloc { margin-top: 20px; }
  .titre-bloc { text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600; font-size: 11px; margin-bottom: 6px; }
  .mentions { color: #8A8578; font-size: 11px; margin-top: 20px; }
  .signature { margin-top: 16px; }
  .signature svg { max-width: 220px; height: auto; }
  .perforation {
    margin-top: 24px; border-top: 6px dotted #F1EDE5;
  }
</style>
</head>
<body>
  <div class="ticket">
    <header>
      <div class="boutique">${e(boutique.nom)}<small>${e(boutique.adresse)}</small></div>
      <div style="text-align:right">
        <div class="numero">Reçu — livre de police n° ${ligne.numero}</div>
        <div class="date">${e(formaterDateFr(ligne.date_iso))}</div>
      </div>
    </header>

    <div class="etiquette">Prix de rachat</div>
    <p class="montant">${e(formaterCentimes(ligne.prix_centimes))}</p>

    <table>${detail}</table>

    <div class="bloc">
      <div class="titre-bloc">Vendeur</div>
      ${e(identite.nom)}<br>
      ${e(identite.adresse)}<br>
      Pièce d'identité : ${e(identite.typePiece)} n° ${e(identite.numeroPiece)}
    </div>

    ${
      signatureSvg !== null
        ? `<div class="bloc signature"><div class="titre-bloc">Signature du vendeur</div>${signatureSvg}</div>`
        : ''
    }

    <p class="mentions">
      Le vendeur déclare être propriétaire de l'objet décrit ci-dessus et le céder librement.
      Conformément à l'article L112-6 du Code monétaire et financier, le paiement des métaux
      précieux est effectué exclusivement par chèque barré ou virement — jamais en espèces.
      Objet inscrit au livre de police sous le numéro d'ordre ${ligne.numero}.
    </p>
    <div class="perforation"></div>
  </div>
</body>
</html>`;
}
