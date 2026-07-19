import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { AnalyseBijou } from '../domaine/analyse.schema';
import {
  LIBELLES_BADGE,
  LIBELLES_CONFIANCE,
  MENTION_ESTIMATION_VISUELLE,
  MENTION_LABO,
  mentionLaboObligatoire,
  niveauBadge,
  niveauConfiance,
} from '../domaine/confiance';
import { formaterCentimes } from '../domaine/monnaie';
import { titreParCode } from '../domaine/metaux';
import { couleurs, espaces, polices, rayons, tailles } from '../design/tokens';
import { utiliserGlissement } from './utiliserGlissement';

interface Props {
  analyse: AnalyseBijou;
}

/**
 * Carte d'analyse F2 : remonte par-dessus la photo comme le ticket F1.
 * Toujours un niveau de confiance, jamais de verdict binaire, et la mention
 * laboratoire obligatoire au-dessus du seuil (non désactivable).
 */
export function CarteAnalyse({ analyse }: Props): React.JSX.Element {
  const { opacite, translation } = utiliserGlissement();
  const badge = niveauBadge(analyse);
  const poincon = analyse.poincon;
  const fourchette = analyse.fourchette_centimes;

  return (
    <Animated.View
      style={[styles.carte, { opacity: opacite, transform: [{ translateY: translation }] }]}
    >
      <View style={styles.enteteLigne}>
        <Text style={styles.type}>
          {analyse.type_objet.charAt(0).toUpperCase() + analyse.type_objet.slice(1)}
          {analyse.matiere_probable !== null ? ` — ${analyse.matiere_probable}` : ''}
        </Text>
        <View style={[styles.badge, stylesBadge[badge]]}>
          <Text style={[styles.texteBadge, badge === 'elevee' && styles.texteBadgeClair]}>
            {LIBELLES_BADGE[badge]}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{analyse.description_courte}</Text>
      {analyse.style_epoque !== null && (
        <Text style={styles.secondaire}>Style / époque : {analyse.style_epoque}</Text>
      )}

      {analyse.alerte_valeur && (
        <View style={styles.bandeauAlerte}>
          <Text style={styles.texteAlerte}>
            Ce bijou pourrait valoir plus que son poids — vérifier avant fonte.
          </Text>
          {analyse.motif_alerte !== null && (
            <Text style={styles.motifAlerte}>{analyse.motif_alerte}</Text>
          )}
        </View>
      )}

      {analyse.indices.length > 0 && (
        <View style={styles.blocIndices}>
          {analyse.indices.map((indice) => (
            <Text key={indice} style={styles.indice}>
              •  {indice}
            </Text>
          ))}
        </View>
      )}

      {poincon !== null && poincon.visible && (
        <View style={styles.blocPoincon}>
          <Text style={styles.titreBloc}>Poinçon</Text>
          {poincon.description !== null && (
            <Text style={styles.secondaire}>{poincon.description}</Text>
          )}
          {poincon.titre_suggere !== null && (
            <Text style={styles.suggestionTitre}>
              Titre suggéré : {titreParCode(poincon.titre_suggere).libelle} (
              {LIBELLES_CONFIANCE[niveauConfiance(poincon.confiance)]}) — modifiable à la saisie
            </Text>
          )}
        </View>
      )}

      {fourchette !== null && (
        <View style={styles.blocFourchette}>
          <Text style={styles.titreBloc}>{MENTION_ESTIMATION_VISUELLE}</Text>
          <Text style={styles.fourchette}>
            {formaterCentimes(fourchette.minimum_centimes)} —{' '}
            {formaterCentimes(fourchette.maximum_centimes)}
          </Text>
          {mentionLaboObligatoire(fourchette) && (
            <Text style={styles.mentionLabo}>{MENTION_LABO}</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.blancCraie,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
    paddingHorizontal: espaces.l,
    paddingTop: espaces.l,
    paddingBottom: espaces.m,
    gap: espaces.s,
  },
  enteteLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: espaces.s,
  },
  type: {
    flexShrink: 1,
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps + 4,
    lineHeight: (tailles.corps + 4) * 1.4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.xs + 2,
  },
  texteBadge: {
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.secondaire,
    color: couleurs.blancCraie,
  },
  texteBadgeClair: {
    color: couleurs.blancCraie,
  },
  description: {
    color: couleurs.noirEncre,
    fontFamily: polices.corps,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  secondaire: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    lineHeight: tailles.secondaire * 1.5,
  },
  bandeauAlerte: {
    backgroundColor: '#F6E7D8',
    borderRadius: rayons.bouton,
    padding: espaces.m,
    gap: espaces.xs,
  },
  texteAlerte: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.4,
  },
  motifAlerte: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
  },
  blocIndices: {
    gap: espaces.xs,
  },
  indice: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    lineHeight: tailles.secondaire * 1.5,
  },
  blocPoincon: {
    borderTopWidth: 1,
    borderTopColor: couleurs.craieProfonde,
    paddingTop: espaces.s,
    gap: espaces.xs,
  },
  titreBloc: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.secondaire,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  suggestionTitre: {
    color: couleurs.orMat,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.4,
  },
  blocFourchette: {
    borderTopWidth: 1,
    borderTopColor: couleurs.craieProfonde,
    paddingTop: espaces.s,
    gap: espaces.xs,
  },
  fourchette: {
    color: couleurs.noirEncre,
    fontFamily: polices.display,
    fontSize: tailles.titreEcran + 4,
    fontVariant: ['tabular-nums'],
  },
  mentionLabo: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.secondaire,
  },
});

const stylesBadge: Record<ReturnType<typeof niveauBadge>, { backgroundColor: string }> = {
  elevee: { backgroundColor: couleurs.vertValidation },
  'a-verifier': { backgroundColor: couleurs.ambreAlerte },
  douteux: { backgroundColor: '#7A3D12' },
};
