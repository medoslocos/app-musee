import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formaterCentimes, formaterCentimesArrondis, formaterMilligrammes } from '../src/domaine/monnaie';
import { titreParCode, type CodeTitre } from '../src/domaine/metaux';
import { obtenirDepot } from '../src/livre/composition';
import type { EstimationEnregistree, StatutEstimation } from '../src/livre/depot';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../src/design/tokens';

const LIBELLES_STATUT: Record<StatutEstimation, string> = {
  estime: 'Estimé',
  rachete: 'Racheté',
  refuse: 'Refusé',
};

const FILTRES: Array<{ statut: StatutEstimation | null; libelle: string }> = [
  { statut: null, libelle: 'Tout' },
  { statut: 'estime', libelle: 'Estimé' },
  { statut: 'rachete', libelle: 'Racheté' },
  { statut: 'refuse', libelle: 'Refusé' },
];

interface Statistiques {
  rachatsCentimes: number;
  orMilligrammes: number;
  margeMoyennePourMille: number | null;
}

function libelleTitre(code: string): string {
  try {
    return titreParCode(code as CodeTitre).libelleCourt;
  } catch {
    return code;
  }
}

function formaterDateCourte(dateIso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(dateIso),
  );
}

/**
 * Écran F4 — Aujourd'hui : trois chiffres du mois (pas plus) et l'historique
 * des estimations, filtrable par statut, recherche par date / client / type.
 */
export default function EcranHistorique(): React.JSX.Element {
  const [statistiques, setStatistiques] = useState<Statistiques | null>(null);
  const [estimations, setEstimations] = useState<EstimationEnregistree[]>([]);
  const [charge, setCharge] = useState(false);
  const [texte, setTexte] = useState('');
  const [statut, setStatut] = useState<StatutEstimation | null>(null);

  const rafraichir = useCallback(async (recherche: string, filtreStatut: StatutEstimation | null) => {
    const depot = await obtenirDepot();
    const moisCourant = new Date().toISOString().slice(0, 7);
    setStatistiques(await depot.statistiquesDuMois(moisCourant));
    setEstimations(await depot.listerEstimations({ texte: recherche, statut: filtreStatut }));
    setCharge(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void rafraichir(texte, statut);
    }, [rafraichir, texte, statut]),
  );

  return (
    <View style={styles.ecran}>
      <FlatList
        data={estimations}
        keyExtractor={(estimation) => estimation.id}
        contentContainerStyle={styles.liste}
        ListHeaderComponent={
          <View style={styles.entete}>
            {statistiques !== null && (
              <View style={styles.rangeeChiffres}>
                <View style={styles.chiffre}>
                  <Text style={styles.valeurChiffre}>
                    {formaterCentimesArrondis(statistiques.rachatsCentimes)}
                  </Text>
                  <Text style={styles.libelleChiffre}>Rachats du mois</Text>
                </View>
                <View style={styles.chiffre}>
                  <Text style={styles.valeurChiffre}>
                    {formaterMilligrammes(statistiques.orMilligrammes)}
                  </Text>
                  <Text style={styles.libelleChiffre}>Or racheté</Text>
                </View>
                <View style={styles.chiffre}>
                  <Text style={styles.valeurChiffre}>
                    {statistiques.margeMoyennePourMille === null
                      ? '—'
                      : `${(statistiques.margeMoyennePourMille / 10).toLocaleString('fr-FR')} %`}
                  </Text>
                  <Text style={styles.libelleChiffre}>Marge moyenne</Text>
                </View>
              </View>
            )}

            <TextInput
              accessibilityLabel="Rechercher dans l'historique"
              value={texte}
              onChangeText={setTexte}
              placeholder="Rechercher : date, client, type…"
              placeholderTextColor={couleurs.grisEtain}
              style={styles.recherche}
            />

            <View style={styles.rangeeFiltres}>
              {FILTRES.map((filtre) => {
                const actif = filtre.statut === statut;
                return (
                  <Pressable
                    key={filtre.libelle}
                    accessibilityRole="button"
                    accessibilityState={{ selected: actif }}
                    onPress={() => setStatut(filtre.statut)}
                    style={[styles.filtre, actif && styles.filtreActif]}
                  >
                    <Text style={[styles.texteFiltre, actif && styles.texteFiltreActif]}>
                      {filtre.libelle}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          charge ? (
            <View style={styles.etatVide}>
              <Text style={styles.titreVide}>
                {texte === '' && statut === null
                  ? 'Aucune estimation pour l’instant'
                  : 'Rien ne correspond à cette recherche'}
              </Text>
              <Text style={styles.texteVide}>
                {texte === '' && statut === null
                  ? 'La première estimation apparaîtra ici dès qu’elle sera calculée.'
                  : 'Élargir la recherche ou changer de filtre.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: estimation }) => (
          <View style={styles.carte}>
            <View style={styles.ligneCarte}>
              <Text style={styles.description} numberOfLines={1}>
                {estimation.description_objet}
              </Text>
              <View style={[styles.badge, stylesStatut[estimation.statut]]}>
                <Text style={styles.texteBadge}>{LIBELLES_STATUT[estimation.statut]}</Text>
              </View>
            </View>
            <View style={styles.ligneCarte}>
              <Text style={styles.detail}>
                {libelleTitre(estimation.code_titre)} —{' '}
                {estimation.poids_grammes.replace('.', ',')} g —{' '}
                {formaterDateCourte(estimation.cree_le)}
              </Text>
              <Text style={styles.montant}>
                {formaterCentimes(estimation.prix_rachat_centimes)}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.blancCraie,
  },
  liste: {
    padding: espaces.l,
    gap: espaces.s,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  entete: {
    gap: espaces.m,
    marginBottom: espaces.s,
  },
  rangeeChiffres: {
    flexDirection: 'row',
    gap: espaces.s,
  },
  chiffre: {
    flex: 1,
    backgroundColor: couleurs.craieProfonde,
    borderRadius: rayons.carte,
    paddingVertical: espaces.m,
    paddingHorizontal: espaces.s,
    alignItems: 'center',
    gap: espaces.xs,
  },
  valeurChiffre: {
    color: couleurs.noirEncre,
    fontFamily: polices.display,
    fontSize: tailles.titreEcran,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  libelleChiffre: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
    textAlign: 'center',
  },
  recherche: {
    minHeight: CIBLE_TACTILE_MIN + 8,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.craieProfonde,
    paddingHorizontal: espaces.m,
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
  },
  rangeeFiltres: {
    flexDirection: 'row',
    gap: espaces.s,
  },
  filtre: {
    flex: 1,
    minHeight: CIBLE_TACTILE_MIN,
    borderRadius: rayons.bouton,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtreActif: {
    backgroundColor: couleurs.noirEncre,
    borderColor: couleurs.noirEncre,
  },
  texteFiltre: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
  },
  texteFiltreActif: {
    color: couleurs.blancCraie,
  },
  etatVide: {
    alignItems: 'center',
    padding: espaces.xl,
    gap: espaces.s,
  },
  titreVide: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps + 2,
    textAlign: 'center',
  },
  texteVide: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
    textAlign: 'center',
  },
  carte: {
    backgroundColor: couleurs.craieProfonde,
    borderRadius: rayons.carte,
    padding: espaces.m,
    gap: espaces.xs,
  },
  ligneCarte: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: espaces.s,
  },
  description: {
    flexShrink: 1,
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: espaces.s + 2,
    paddingVertical: 3,
  },
  texteBadge: {
    color: couleurs.blancCraie,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.secondaire - 1,
  },
  detail: {
    flexShrink: 1,
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    fontVariant: ['tabular-nums'],
  },
  montant: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    fontVariant: ['tabular-nums'],
  },
});

const stylesStatut: Record<StatutEstimation, { backgroundColor: string }> = {
  estime: { backgroundColor: couleurs.orMat },
  rachete: { backgroundColor: couleurs.vertValidation },
  refuse: { backgroundColor: couleurs.grisEtain },
};
