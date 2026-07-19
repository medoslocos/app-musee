import { describe, expect, it } from 'vitest';
import type { Metal } from '../../domaine/metaux';
import type { CoursMetal, FournisseurCours } from '../fournisseur-cours';
import { ErreurCoursIndisponible, ServiceCours, type StockageCleValeur } from '../service-cours';

class StockageMemoire implements StockageCleValeur {
  private donnees = new Map<string, string>();
  async lire(cle: string): Promise<string | null> {
    return this.donnees.get(cle) ?? null;
  }
  async ecrire(cle: string, valeur: string): Promise<void> {
    this.donnees.set(cle, valeur);
  }
}

function fournisseurFactice(options: { centimes?: number; echoue?: boolean } = {}): {
  fournisseur: FournisseurCours;
  compteurAppels: () => number;
} {
  let appels = 0;
  const fournisseur: FournisseurCours = {
    nom: 'factice',
    async recupererCours(metaux: readonly Metal[]): Promise<CoursMetal[]> {
      appels += 1;
      if (options.echoue) {
        throw new Error('réseau coupé');
      }
      return metaux.map((metal) => ({
        metal,
        centimesParGramme: options.centimes ?? 6800,
        horodatageIso: '2026-07-19T10:00:00.000Z',
      }));
    },
  };
  return { fournisseur, compteurAppels: () => appels };
}

describe('ServiceCours', () => {
  it('récupère un cours frais et le persiste', async () => {
    const { fournisseur, compteurAppels } = fournisseurFactice();
    const stockage = new StockageMemoire();
    const service = new ServiceCours(fournisseur, stockage, () => 1000);

    const resultat = await service.obtenirCours('or');

    expect(resultat.provenance).toBe('frais');
    expect(resultat.cours.centimesParGramme).toBe(6800);
    expect(compteurAppels()).toBe(1);
    expect(await stockage.lire('cours.or')).not.toBeNull();
  });

  it('sert le cache sans rappeler le fournisseur pendant 15 minutes', async () => {
    const { fournisseur, compteurAppels } = fournisseurFactice();
    const stockage = new StockageMemoire();
    let maintenant = 0;
    const service = new ServiceCours(fournisseur, stockage, () => maintenant);

    await service.obtenirCours('or');
    maintenant = 14 * 60 * 1000;
    const resultat = await service.obtenirCours('or');

    expect(resultat.provenance).toBe('cache');
    expect(compteurAppels()).toBe(1);
  });

  it('rafraîchit après expiration du cache', async () => {
    const { fournisseur, compteurAppels } = fournisseurFactice();
    const stockage = new StockageMemoire();
    let maintenant = 0;
    const service = new ServiceCours(fournisseur, stockage, () => maintenant);

    await service.obtenirCours('or');
    maintenant = 16 * 60 * 1000;
    const resultat = await service.obtenirCours('or');

    expect(resultat.provenance).toBe('frais');
    expect(compteurAppels()).toBe(2);
  });

  it('replie sur le dernier cours connu quand le fournisseur échoue', async () => {
    const stockage = new StockageMemoire();
    let maintenant = 0;
    const ok = fournisseurFactice({ centimes: 7000 });
    await new ServiceCours(ok.fournisseur, stockage, () => maintenant).obtenirCours('or');

    // Trois jours plus tard, hors-ligne : on doit servir le cours daté, pas échouer.
    maintenant = 3 * 24 * 60 * 60 * 1000;
    const casse = fournisseurFactice({ echoue: true });
    const resultat = await new ServiceCours(casse.fournisseur, stockage, () => maintenant).obtenirCours('or');

    expect(resultat.provenance).toBe('dernier-connu');
    expect(resultat.cours.centimesParGramme).toBe(7000);
    expect(resultat.cours.horodatageIso).toBe('2026-07-19T10:00:00.000Z');
  });

  it('rejette avec une erreur actionnable si aucun cours n’est disponible', async () => {
    const { fournisseur } = fournisseurFactice({ echoue: true });
    const service = new ServiceCours(fournisseur, new StockageMemoire(), () => 0);

    await expect(service.obtenirCours('or')).rejects.toThrow(ErreurCoursIndisponible);
    await expect(service.obtenirCours('or')).rejects.toThrow('Vérifier la connexion internet');
  });

  it('ignore un cache corrompu et repart sur le fournisseur', async () => {
    const stockage = new StockageMemoire();
    await stockage.ecrire('cours.or', '{pas du json');
    const { fournisseur } = fournisseurFactice();
    const service = new ServiceCours(fournisseur, stockage, () => 0);

    const resultat = await service.obtenirCours('or');

    expect(resultat.provenance).toBe('frais');
  });
});
