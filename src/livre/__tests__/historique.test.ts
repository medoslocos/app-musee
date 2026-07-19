import { describe, expect, it } from 'vitest';
import { calculerEstimation } from '../../domaine/calcul-estimation';
import { titreParCode, type CodeTitre } from '../../domaine/metaux';
import type { Depot } from '../depot';
import { creerDepotDeTest, IDENTITE_TEST } from './aides-test';

async function estimation(depot: Depot, options: { poids?: string; titre?: CodeTitre; description?: string } = {}) {
  const resultat = calculerEstimation({
    poids: options.poids ?? '12,4',
    titre: titreParCode(options.titre ?? 'or-18k'),
    coursCentimesParGramme: 6800,
    marge: { mode: 'pourcentage', pourMille: 150 },
  });
  return depot.enregistrerEstimation(resultat, options.description ?? 'Chaîne maille gourmette');
}

async function rachatDe(depot: Depot, estimationId: string, nom: string = IDENTITE_TEST.nom) {
  return depot.enregistrerRachat({
    estimationId,
    identite: { ...IDENTITE_TEST, nom },
    modePaiement: 'virement',
    signatureSvg: 'M0,0',
    marge: { mode: 'pourcentage', pourMille: 150 },
  });
}

describe('historique — liste et filtres', () => {
  it('liste tout par défaut, avec les statuts', async () => {
    const { depot } = await creerDepotDeTest();
    const id1 = await estimation(depot);
    await estimation(depot, { description: 'Bague solitaire' });
    const id3 = await estimation(depot, { description: 'Broche ancienne' });
    await rachatDe(depot, id1);
    await depot.marquerRefusee(id3);

    const toutes = await depot.listerEstimations();
    expect(toutes).toHaveLength(3);
    expect(toutes.map((estimationEnregistree) => estimationEnregistree.statut).sort()).toEqual([
      'estime',
      'rachete',
      'refuse',
    ]);
  });

  it('filtre par statut', async () => {
    const { depot } = await creerDepotDeTest();
    const id1 = await estimation(depot);
    await estimation(depot);
    await rachatDe(depot, id1);

    expect(await depot.listerEstimations({ statut: 'rachete' })).toHaveLength(1);
    expect(await depot.listerEstimations({ statut: 'estime' })).toHaveLength(1);
    expect(await depot.listerEstimations({ statut: 'refuse' })).toHaveLength(0);
  });

  it('recherche par type d’objet et par date, sans casse', async () => {
    const { depot } = await creerDepotDeTest();
    await estimation(depot, { description: 'Bague solitaire diamant' });
    await estimation(depot, { description: 'Chaîne forçat' });

    expect(await depot.listerEstimations({ texte: 'BAGUE' })).toHaveLength(1);
    expect(await depot.listerEstimations({ texte: '2026-07-19' })).toHaveLength(2);
    expect(await depot.listerEstimations({ texte: 'gourmette' })).toHaveLength(0);
  });

  it('recherche par nom de client via le livre de police (identité chiffrée)', async () => {
    const { depot } = await creerDepotDeTest();
    const id1 = await estimation(depot, { description: 'Chaîne A' });
    const id2 = await estimation(depot, { description: 'Chaîne B' });
    await rachatDe(depot, id1, 'Émile Bernard');
    await rachatDe(depot, id2, 'Louise Petit');

    const resultat = await depot.listerEstimations({ texte: 'bernard' });
    expect(resultat).toHaveLength(1);
    expect(resultat[0]?.id).toBe(id1);
  });
});

describe('historique — statistiques du mois', () => {
  it('additionne les rachats, les grammes d’or et la marge moyenne', async () => {
    const { depot } = await creerDepotDeTest();
    // 12,4 g or 18k : rachat 537,54 €, marge 15 %.
    await rachatDe(depot, await estimation(depot));
    // 100 g argent 925 : fonte 9,25 € à 10 c/g… utilisons un cas simple :
    const argent = calculerEstimation({
      poids: '100',
      titre: titreParCode('argent-925'),
      coursCentimesParGramme: 100,
      marge: { mode: 'pourcentage', pourMille: 100 },
    });
    const idArgent = await depot.enregistrerEstimation(argent, 'Ménagère argent');
    await rachatDe(depot, idArgent);

    const stats = await depot.statistiquesDuMois('2026-07');
    // 53754 + (9250 − 925) = 62079 centimes
    expect(stats.rachatsCentimes).toBe(62079);
    // Seul l'or compte : 12,4 g
    expect(stats.orMilligrammes).toBe(12400);
    // Moyenne de 150 ‰ et 100 ‰ = 125 ‰
    expect(stats.margeMoyennePourMille).toBe(125);
  });

  it('ignore les lignes annulées et les autres mois', async () => {
    const { depot } = await creerDepotDeTest();
    const ligne = await rachatDe(depot, await estimation(depot));
    await depot.annulerLigne(ligne.numero, 'erreur');

    const stats = await depot.statistiquesDuMois('2026-07');
    expect(stats.rachatsCentimes).toBe(0);
    expect(stats.orMilligrammes).toBe(0);
    expect(stats.margeMoyennePourMille).toBeNull();

    const autreMois = await depot.statistiquesDuMois('2026-06');
    expect(autreMois.rachatsCentimes).toBe(0);
  });

  it('les estimations non rachetées ne comptent pas', async () => {
    const { depot } = await creerDepotDeTest();
    await estimation(depot);
    const stats = await depot.statistiquesDuMois('2026-07');
    expect(stats.rachatsCentimes).toBe(0);
    expect(stats.margeMoyennePourMille).toBeNull();
  });
});
