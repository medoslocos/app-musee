/**
 * Dépôt local-first : estimations + livre de police.
 * Toute la logique légale vit ici, derrière BaseSql — donc testée en Node
 * contre un vrai moteur SQLite (voir __tests__/livre-police.test.ts).
 */

import type { Marge, ResultatEstimation } from '../domaine/calcul-estimation';
import type { ModePaiement } from '../domaine/paiement';
import type { BaseSql, Hacheur } from './base-sql';
import type { Chiffreur, IdentiteVendeur } from './chiffrement';
import { chiffrerIdentite, dechiffrerIdentite } from './chiffrement';
import { EMPREINTE_RACINE, SCHEMA_SQL } from './schema-sql';
import { formaterMilligrammes } from '../domaine/monnaie';

export type StatutEstimation = 'estime' | 'rachete' | 'refuse';

export interface EstimationEnregistree {
  id: string;
  cree_le: string;
  statut: StatutEstimation;
  poids_grammes: string;
  code_titre: string;
  metal: string;
  cours_centimes_par_gramme: number;
  valeur_fonte_centimes: number;
  marge_centimes: number;
  prix_rachat_centimes: number;
  description_objet: string;
  signature_svg: string | null;
}

export interface LigneLivrePolice {
  numero: number;
  type_ligne: 'rachat' | 'annulation';
  numero_annule: number | null;
  estimation_id: string;
  date_iso: string;
  description_objet: string;
  poids_grammes: string;
  nature_metal: string;
  identite_chiffree: string;
  prix_centimes: number;
  mode_paiement: ModePaiement;
  empreinte_precedente: string;
  empreinte: string;
}

export interface Dependances {
  base: BaseSql;
  hacher: Hacheur;
  chiffreur: Chiffreur;
  horloge: () => string;
  genererId: () => string;
}

function grammesDepuisMilligrammes(milligrammes: number): string {
  // « 12,4 g » → « 12,4 » : valeur légale stockée en décimal string.
  return formaterMilligrammes(milligrammes).replace(/ g$/, '');
}

export class Depot {
  constructor(private readonly dependances: Dependances) {}

  async initialiser(): Promise<void> {
    await this.dependances.base.executerScript(SCHEMA_SQL);
  }

  // ── Estimations ────────────────────────────────────────────────────────

  async enregistrerEstimation(resultat: ResultatEstimation, descriptionObjet: string): Promise<string> {
    const id = this.dependances.genererId();
    await this.dependances.base.executer(
      `INSERT INTO estimations (id, cree_le, statut, poids_grammes, code_titre, metal,
         cours_centimes_par_gramme, valeur_fonte_centimes, marge_centimes,
         prix_rachat_centimes, description_objet, signature_svg)
       VALUES (?, ?, 'estime', ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [
        id,
        this.dependances.horloge(),
        grammesDepuisMilligrammes(resultat.poidsMilligrammes),
        resultat.titre.code,
        resultat.titre.metal,
        resultat.coursCentimesParGramme,
        resultat.valeurFonteCentimes,
        resultat.margeCentimes,
        resultat.prixRachatCentimes,
        descriptionObjet,
      ],
    );
    return id;
  }

  async lireEstimation(id: string): Promise<EstimationEnregistree | null> {
    const lignes = await this.dependances.base.lignes<EstimationEnregistree>(
      'SELECT * FROM estimations WHERE id = ?',
      [id],
    );
    return lignes[0] ?? null;
  }

  async marquerRefusee(id: string): Promise<void> {
    await this.dependances.base.executer(
      `UPDATE estimations SET statut = 'refuse' WHERE id = ? AND statut = 'estime'`,
      [id],
    );
  }

  // ── Livre de police ────────────────────────────────────────────────────

  private async derniereEmpreinte(): Promise<string> {
    const lignes = await this.dependances.base.lignes<{ empreinte: string }>(
      'SELECT empreinte FROM livre_police ORDER BY numero DESC LIMIT 1',
    );
    return lignes[0]?.empreinte ?? EMPREINTE_RACINE;
  }

  private async prochainNumero(): Promise<number> {
    // S'appuie sur le compteur AUTOINCREMENT (sqlite_sequence) : il ne
    // redescend jamais, même si des lignes disparaissaient par un accès
    // direct à la base — un numéro n'est donc JAMAIS réutilisé.
    const sequence = await this.dependances.base.lignes<{ seq: number }>(
      `SELECT seq FROM sqlite_sequence WHERE name = 'livre_police'`,
    );
    const max = await this.dependances.base.lignes<{ maxNumero: number | null }>(
      'SELECT MAX(numero) AS maxNumero FROM livre_police',
    );
    return Math.max(sequence[0]?.seq ?? 0, max[0]?.maxNumero ?? 0) + 1;
  }

  private contenuCanonique(ligne: Omit<LigneLivrePolice, 'empreinte'>): string {
    return [
      ligne.numero,
      ligne.type_ligne,
      ligne.numero_annule ?? '',
      ligne.estimation_id,
      ligne.date_iso,
      ligne.description_objet,
      ligne.poids_grammes,
      ligne.nature_metal,
      ligne.identite_chiffree,
      ligne.prix_centimes,
      ligne.mode_paiement,
      ligne.empreinte_precedente,
    ].join('|');
  }

  private async insererLigne(
    ligne: Omit<LigneLivrePolice, 'numero' | 'empreinte_precedente' | 'empreinte'>,
  ): Promise<LigneLivrePolice> {
    const numero = await this.prochainNumero();
    const empreinte_precedente = await this.derniereEmpreinte();
    const sansEmpreinte = { ...ligne, numero, empreinte_precedente };
    const empreinte = this.dependances.hacher(this.contenuCanonique(sansEmpreinte));
    const complete: LigneLivrePolice = { ...sansEmpreinte, empreinte };
    await this.dependances.base.executer(
      `INSERT INTO livre_police (numero, type_ligne, numero_annule, estimation_id, date_iso,
         description_objet, poids_grammes, nature_metal, identite_chiffree, prix_centimes,
         mode_paiement, empreinte_precedente, empreinte)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        complete.numero,
        complete.type_ligne,
        complete.numero_annule,
        complete.estimation_id,
        complete.date_iso,
        complete.description_objet,
        complete.poids_grammes,
        complete.nature_metal,
        complete.identite_chiffree,
        complete.prix_centimes,
        complete.mode_paiement,
        complete.empreinte_precedente,
        complete.empreinte,
      ],
    );
    return complete;
  }

  /**
   * Valide un rachat : passe l'estimation au statut « racheté » (avec la
   * signature du vendeur) et écrit la ligne du livre de police — le tout
   * dans une transaction.
   */
  async enregistrerRachat(parametres: {
    estimationId: string;
    identite: IdentiteVendeur;
    modePaiement: ModePaiement;
    signatureSvg: string;
    marge: Marge;
  }): Promise<LigneLivrePolice> {
    const estimation = await this.lireEstimation(parametres.estimationId);
    if (estimation === null) {
      throw new Error(`Estimation introuvable : ${parametres.estimationId}`);
    }
    if (estimation.statut === 'rachete') {
      throw new Error('Cette estimation a déjà été rachetée');
    }
    let ligne: LigneLivrePolice | null = null;
    await this.dependances.base.transaction(async () => {
      await this.dependances.base.executer(
        `UPDATE estimations SET statut = 'rachete', signature_svg = ? WHERE id = ?`,
        [parametres.signatureSvg, parametres.estimationId],
      );
      ligne = await this.insererLigne({
        type_ligne: 'rachat',
        numero_annule: null,
        estimation_id: estimation.id,
        date_iso: this.dependances.horloge(),
        description_objet: estimation.description_objet,
        poids_grammes: estimation.poids_grammes,
        nature_metal: `${estimation.metal} (${estimation.code_titre})`,
        identite_chiffree: chiffrerIdentite(this.dependances.chiffreur, parametres.identite),
        prix_centimes: estimation.prix_rachat_centimes,
        mode_paiement: parametres.modePaiement,
      });
    });
    if (ligne === null) {
      throw new Error("La ligne du livre de police n'a pas été écrite");
    }
    return ligne;
  }

  /**
   * Annule une ligne : AUCUN effacement — une ligne d'annulation est ajoutée,
   * qui référence la ligne d'origine et reprend ses valeurs.
   */
  async annulerLigne(numero: number, motif: string): Promise<LigneLivrePolice> {
    const origine = (
      await this.dependances.base.lignes<LigneLivrePolice>(
        `SELECT * FROM livre_police WHERE numero = ?`,
        [numero],
      )
    )[0];
    if (origine === undefined) {
      throw new Error(`Ligne ${numero} introuvable dans le livre de police`);
    }
    if (origine.type_ligne === 'annulation') {
      throw new Error(`La ligne ${numero} est déjà une ligne d'annulation`);
    }
    const dejaAnnulee = await this.dependances.base.lignes<{ numero: number }>(
      `SELECT numero FROM livre_police WHERE type_ligne = 'annulation' AND numero_annule = ?`,
      [numero],
    );
    if (dejaAnnulee.length > 0) {
      throw new Error(`La ligne ${numero} a déjà été annulée (ligne ${dejaAnnulee[0]?.numero})`);
    }
    return this.insererLigne({
      type_ligne: 'annulation',
      numero_annule: numero,
      estimation_id: origine.estimation_id,
      date_iso: this.dependances.horloge(),
      description_objet: `Annulation de la ligne ${numero} — ${motif}`,
      poids_grammes: origine.poids_grammes,
      nature_metal: origine.nature_metal,
      identite_chiffree: origine.identite_chiffree,
      prix_centimes: origine.prix_centimes,
      mode_paiement: origine.mode_paiement,
    });
  }

  listerLivre(): Promise<LigneLivrePolice[]> {
    return this.dependances.base.lignes<LigneLivrePolice>(
      'SELECT * FROM livre_police ORDER BY numero ASC',
    );
  }

  identiteDeLigne(ligne: LigneLivrePolice): IdentiteVendeur {
    return dechiffrerIdentite(this.dependances.chiffreur, ligne.identite_chiffree);
  }

  /**
   * Revérifie toute la chaîne d'empreintes.
   * Retourne les numéros des lignes dont le scellé ne correspond plus
   * (tableau vide = registre intègre).
   */
  async verifierChaine(): Promise<number[]> {
    const lignes = await this.listerLivre();
    const invalides: number[] = [];
    let empreinteAttendue = EMPREINTE_RACINE;
    for (const ligne of lignes) {
      const { empreinte, ...sansEmpreinte } = ligne;
      const recalculee = this.dependances.hacher(this.contenuCanonique(sansEmpreinte));
      if (ligne.empreinte_precedente !== empreinteAttendue || empreinte !== recalculee) {
        invalides.push(ligne.numero);
      }
      empreinteAttendue = ligne.empreinte;
    }
    return invalides;
  }

  /** Export CSV (séparateur « ; », identités déchiffrées — document légal). */
  async exporterCsv(): Promise<string> {
    const entetes = [
      'numero',
      'type',
      'numero_annule',
      'date',
      'description',
      'poids_grammes',
      'nature_metal',
      'vendeur_nom',
      'vendeur_adresse',
      'piece_type',
      'piece_numero',
      'prix_euros',
      'mode_paiement',
    ];
    const echapper = (valeur: string | number | null): string => {
      const texte = valeur === null ? '' : String(valeur);
      return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
    };
    const lignesCsv = (await this.listerLivre()).map((ligne) => {
      const identite = this.identiteDeLigne(ligne);
      return [
        ligne.numero,
        ligne.type_ligne,
        ligne.numero_annule,
        ligne.date_iso,
        ligne.description_objet,
        ligne.poids_grammes,
        ligne.nature_metal,
        identite.nom,
        identite.adresse,
        identite.typePiece,
        identite.numeroPiece,
        (ligne.prix_centimes / 100).toFixed(2).replace('.', ','),
        ligne.mode_paiement,
      ]
        .map(echapper)
        .join(';');
    });
    return [entetes.join(';'), ...lignesCsv].join('\n');
  }
}
