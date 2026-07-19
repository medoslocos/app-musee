import { describe, expect, it } from 'vitest';
import { genererHtmlRecu } from '../recu-html';
import { creerDepotDeTest, estimationDeTest, IDENTITE_TEST } from '../../livre/__tests__/aides-test';

async function donneesDeTest() {
  const { depot } = await creerDepotDeTest();
  const id = await estimationDeTest(depot, 'Chaîne maille gourmette <or>');
  const ligne = await depot.enregistrerRachat({
    estimationId: id,
    identite: { ...IDENTITE_TEST, nom: 'Martin "Le Sûr" Dupont' },
    modePaiement: 'cheque-barre',
    signatureSvg: '<svg viewBox="0 0 100 40"><polyline points="0,0 10,10"/></svg>',
    marge: { mode: 'pourcentage', pourMille: 150 },
  });
  const estimation = await depot.lireEstimation(id);
  if (estimation === null) {
    throw new Error('estimation absente');
  }
  return { depot, ligne, estimation };
}

describe('genererHtmlRecu', () => {
  it('contient le numéro du livre, le montant, le détail et la boutique', async () => {
    const { depot, ligne, estimation } = await donneesDeTest();
    const html = genererHtmlRecu({
      boutique: { nom: 'Bijouterie de l’Horloge', adresse: '4 place du Marché, Lyon' },
      estimation,
      ligne,
      identite: depot.identiteDeLigne(ligne),
      signatureSvg: estimation.signature_svg,
    });
    expect(html).toContain('livre de police n° 1');
    expect(html).toContain('537,54');
    expect(html).toContain('632,40'); // valeur fonte : transparence du calcul
    expect(html).toContain('Bijouterie de l’Horloge');
    expect(html).toContain('12,4 g');
    expect(html).toContain('Chèque barré');
    expect(html).toContain('L112-6');
    expect(html).toContain('<polyline points="0,0 10,10"');
  });

  it('échappe le HTML des champs saisis (description, identité)', async () => {
    const { depot, ligne, estimation } = await donneesDeTest();
    const html = genererHtmlRecu({
      boutique: { nom: 'B', adresse: 'A' },
      estimation,
      ligne,
      identite: depot.identiteDeLigne(ligne),
      signatureSvg: null,
    });
    expect(html).toContain('Chaîne maille gourmette &lt;or&gt;');
    expect(html).toContain('Martin &quot;Le Sûr&quot; Dupont');
    expect(html).not.toContain('<or>');
  });
});
