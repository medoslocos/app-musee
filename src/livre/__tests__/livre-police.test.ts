import { describe, expect, it } from 'vitest';
import { MESSAGE_ESPECES_INTERDITES, verifierModePaiement } from '../../domaine/paiement';
import type { Depot } from '../depot';
import { creerDepotDeTest, estimationDeTest, IDENTITE_TEST } from './aides-test';

async function rachat(depot: Depot, description?: string) {
  const id = await estimationDeTest(depot, description);
  return depot.enregistrerRachat({
    estimationId: id,
    identite: { ...IDENTITE_TEST },
    modePaiement: 'cheque-barre',
    signatureSvg: 'M0,0 L10,10',
    marge: { mode: 'pourcentage', pourMille: 150 },
  });
}

describe('livre de police — numérotation et statuts', () => {
  it('numérote séquentiellement 1, 2, 3…', async () => {
    const { depot } = await creerDepotDeTest();
    expect((await rachat(depot)).numero).toBe(1);
    expect((await rachat(depot)).numero).toBe(2);
    expect((await rachat(depot)).numero).toBe(3);
  });

  it('passe l’estimation au statut « racheté » avec la signature', async () => {
    const { depot } = await creerDepotDeTest();
    const ligne = await rachat(depot);
    const estimation = await depot.lireEstimation(ligne.estimation_id);
    expect(estimation?.statut).toBe('rachete');
    expect(estimation?.signature_svg).toBe('M0,0 L10,10');
    expect(ligne.prix_centimes).toBe(53754); // 12,4 g × 18k × 68 €/g − 15 %
    expect(ligne.nature_metal).toBe('or (or-18k)');
  });

  it('refuse de racheter deux fois la même estimation', async () => {
    const { depot } = await creerDepotDeTest();
    const ligne = await rachat(depot);
    await expect(
      depot.enregistrerRachat({
        estimationId: ligne.estimation_id,
        identite: { ...IDENTITE_TEST },
        modePaiement: 'virement',
        signatureSvg: 'M0,0',
        marge: { mode: 'pourcentage', pourMille: 150 },
      }),
    ).rejects.toThrow('déjà été rachetée');
  });
});

describe('livre de police — inaltérabilité', () => {
  it('PREUVE : toute suppression est rejetée par la base elle-même', async () => {
    const { depot, base } = await creerDepotDeTest();
    await rachat(depot);
    expect(() => base.executerBrut('DELETE FROM livre_police WHERE numero = 1')).toThrow(
      /suppression interdite/,
    );
    expect(() => base.executerBrut('DELETE FROM livre_police')).toThrow(/suppression interdite/);
    expect(await depot.listerLivre()).toHaveLength(1);
  });

  it('PREUVE : toute modification est rejetée par la base elle-même', async () => {
    const { depot, base } = await creerDepotDeTest();
    await rachat(depot);
    expect(() =>
      base.executerBrut('UPDATE livre_police SET prix_centimes = 1 WHERE numero = 1'),
    ).toThrow(/modification interdite/);
    expect((await depot.listerLivre())[0]?.prix_centimes).toBe(53754);
  });

  it('une annulation crée une ligne d’annulation qui référence l’origine — jamais d’effacement', async () => {
    const { depot } = await creerDepotDeTest();
    await rachat(depot);
    const annulation = await depot.annulerLigne(1, 'erreur de saisie du poids');
    expect(annulation.numero).toBe(2);
    expect(annulation.type_ligne).toBe('annulation');
    expect(annulation.numero_annule).toBe(1);
    expect(annulation.description_objet).toContain('Annulation de la ligne 1');
    expect(annulation.description_objet).toContain('erreur de saisie du poids');
    expect(await depot.listerLivre()).toHaveLength(2);
  });

  it('refuse d’annuler deux fois la même ligne, ou d’annuler une annulation', async () => {
    const { depot } = await creerDepotDeTest();
    await rachat(depot);
    await depot.annulerLigne(1, 'test');
    await expect(depot.annulerLigne(1, 'encore')).rejects.toThrow('déjà été annulée');
    await expect(depot.annulerLigne(2, 'annuler l’annulation')).rejects.toThrow(
      "déjà une ligne d'annulation",
    );
  });

  it('la séquence ne réutilise jamais un numéro (AUTOINCREMENT)', async () => {
    const { depot, base } = await creerDepotDeTest();
    await rachat(depot);
    await rachat(depot);
    // Même un administrateur qui contourne les triggers ne fait pas revenir le compteur.
    base.executerScriptBrut('DROP TRIGGER livre_police_sans_suppression;');
    base.executerBrut('DELETE FROM livre_police WHERE numero = 2');
    expect((await rachat(depot)).numero).toBe(3);
  });
});

describe('livre de police — chaîne d’empreintes', () => {
  it('scelle chaque ligne sur la précédente et se vérifie', async () => {
    const { depot } = await creerDepotDeTest();
    await rachat(depot);
    await rachat(depot);
    await depot.annulerLigne(1, 'test');
    const lignes = await depot.listerLivre();
    expect(lignes[1]?.empreinte_precedente).toBe(lignes[0]?.empreinte);
    expect(lignes[2]?.empreinte_precedente).toBe(lignes[1]?.empreinte);
    expect(await depot.verifierChaine()).toEqual([]);
  });

  it('détecte une falsification même si un attaquant contourne les triggers', async () => {
    const { depot, base } = await creerDepotDeTest();
    await rachat(depot);
    await rachat(depot);
    base.executerScriptBrut('DROP TRIGGER livre_police_sans_modification;');
    base.executerBrut('UPDATE livre_police SET prix_centimes = 100 WHERE numero = 1');
    expect(await depot.verifierChaine()).toContain(1);
  });

  it('annule proprement la transaction si l’écriture de la ligne échoue', async () => {
    const { depot } = await creerDepotDeTest({
      hacher: () => {
        throw new Error('panne du hacheur');
      },
    });
    const id = await estimationDeTest(depot);
    await expect(
      depot.enregistrerRachat({
        estimationId: id,
        identite: { ...IDENTITE_TEST },
        modePaiement: 'virement',
        signatureSvg: 'M0,0',
        marge: { mode: 'pourcentage', pourMille: 150 },
      }),
    ).rejects.toThrow('panne du hacheur');
    // Rollback complet : l'estimation n'est PAS passée « rachetée ».
    expect((await depot.lireEstimation(id))?.statut).toBe('estime');
    expect(await depot.listerLivre()).toHaveLength(0);
  });
});

describe('livre de police — identité chiffrée au repos', () => {
  it('ne stocke jamais l’identité en clair et la restitue au déchiffrement', async () => {
    const { depot, base } = await creerDepotDeTest();
    const ligne = await rachat(depot);
    const brut = (
      await base.lignes<{ identite_chiffree: string }>(
        'SELECT identite_chiffree FROM livre_police WHERE numero = 1',
      )
    )[0];
    expect(brut?.identite_chiffree).not.toContain('Dupont');
    expect(brut?.identite_chiffree).not.toContain('X12AB34567');
    expect(brut?.identite_chiffree).toMatch(/^[0-9a-f]+$/);
    expect(depot.identiteDeLigne(ligne)).toEqual(IDENTITE_TEST);
  });

  it('deux chiffrements du même texte diffèrent (IV aléatoire)', async () => {
    const { depot } = await creerDepotDeTest();
    const ligne1 = await rachat(depot);
    const ligne2 = await rachat(depot);
    expect(ligne1.identite_chiffree).not.toBe(ligne2.identite_chiffree);
  });
});

describe('livre de police — export CSV', () => {
  it('exporte entêtes, identité déchiffrée et montants fr', async () => {
    const { depot } = await creerDepotDeTest();
    await rachat(depot, 'Chaîne; maille "gourmette"');
    const csv = await depot.exporterCsv();
    const [entete, ligne] = csv.split('\n');
    expect(entete).toBe(
      'numero;type;numero_annule;date;description;poids_grammes;nature_metal;' +
        'vendeur_nom;vendeur_adresse;piece_type;piece_numero;prix_euros;mode_paiement',
    );
    expect(ligne).toContain('Martin Dupont');
    expect(ligne).toContain('537,54');
    expect(ligne).toContain('"Chaîne; maille ""gourmette"""');
  });
});

describe('mode de paiement — verrou légal', () => {
  it('bloque les espèces avec le message de l’art. L112-6 CMF', () => {
    expect(() => verifierModePaiement('especes')).toThrow(MESSAGE_ESPECES_INTERDITES);
  });

  it('accepte chèque barré et virement, refuse le reste', () => {
    expect(verifierModePaiement('cheque-barre')).toBe('cheque-barre');
    expect(verifierModePaiement('virement')).toBe('virement');
    expect(() => verifierModePaiement('carte')).toThrow('Mode de paiement inconnu');
  });

  it('la base refuse elle aussi « especes » (contrainte CHECK)', async () => {
    const { depot, base } = await creerDepotDeTest();
    const ligne = await rachat(depot);
    expect(() =>
      base.executerBrut(
        `INSERT INTO livre_police (type_ligne, numero_annule, estimation_id, date_iso,
           description_objet, poids_grammes, nature_metal, identite_chiffree, prix_centimes,
           mode_paiement, empreinte_precedente, empreinte)
         VALUES ('rachat', NULL, ?, '2026-07-19', 'x', '1', 'or', 'aa', 1, 'especes', 'a', 'b')`,
        [ligne.estimation_id],
      ),
    ).toThrow(/CHECK/);
  });
});
