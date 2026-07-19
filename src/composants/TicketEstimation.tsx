import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { ResultatEstimation } from '../domaine/calcul-estimation';
import {
  formaterCentimes,
  formaterCentimesArrondis,
  formaterMilligrammes,
} from '../domaine/monnaie';
import { couleurs, espaces, polices, rayons, tailles } from '../design/tokens';

interface Props {
  resultat: ResultatEstimation;
  numeroTicket: number;
  heureCours: string;
}

const NOMBRE_PERFORATIONS = 14;

/**
 * Élément signature de l'app : le résultat s'affiche comme un ticket de pesée
 * physique. Glisse vers le haut à l'affichage (300 ms, ease-out), sauf si
 * l'utilisateur a demandé la réduction des animations.
 */
export function TicketEstimation({ resultat, numeroTicket, heureCours }: Props): React.JSX.Element {
  const translation = useRef(new Animated.Value(0)).current;
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let annule = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduit) => {
      if (annule) {
        return;
      }
      if (reduit) {
        translation.setValue(1);
        setPret(true);
        return;
      }
      setPret(true);
      Animated.timing(translation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      annule = true;
    };
  }, [translation]);

  const glissement = translation.interpolate({ inputRange: [0, 1], outputRange: [48, 0] });

  return (
    <Animated.View
      style={[styles.ticket, { opacity: pret ? translation : 0, transform: [{ translateY: glissement }] }]}
    >
      <View style={styles.entete}>
        <Text style={styles.numero}>Estimation n° {String(numeroTicket).padStart(4, '0')}</Text>
        <Text style={styles.secondaire}>{heureCours}</Text>
      </View>

      <Text style={styles.etiquettePrix}>Prix de rachat proposé</Text>
      <Text style={styles.montant}>{formaterCentimesArrondis(resultat.prixRachatCentimes)}</Text>
      <Text style={styles.montantExact}>{formaterCentimes(resultat.prixRachatCentimes)}</Text>

      <View style={styles.separateur} />

      <LigneDetail
        libelle={`${resultat.titre.libelleCourt} — ${formaterMilligrammes(resultat.poidsMilligrammes)}`}
        valeur={`${formaterMilligrammes(resultat.poidsFinMilligrammes)} de métal fin`}
      />
      <LigneDetail
        libelle={`Cours du métal pur`}
        valeur={`${formaterCentimes(resultat.coursCentimesParGramme)}/g`}
      />
      <LigneDetail libelle="Valeur fonte" valeur={formaterCentimes(resultat.valeurFonteCentimes)} />
      <LigneDetail
        libelle={
          resultat.marge.mode === 'pourcentage'
            ? `Marge (${(resultat.marge.pourMille / 10).toLocaleString('fr-FR')} %)`
            : `Marge (${formaterCentimes(resultat.marge.centimesParGramme)}/g)`
        }
        valeur={`− ${formaterCentimes(resultat.margeCentimes)}`}
      />

      <View style={styles.perforations} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: NOMBRE_PERFORATIONS }, (_, i) => (
          <View key={i} style={styles.perforation} />
        ))}
      </View>
    </Animated.View>
  );
}

function LigneDetail({ libelle, valeur }: { libelle: string; valeur: string }): React.JSX.Element {
  return (
    <View style={styles.ligne}>
      <Text style={styles.secondaire}>{libelle}</Text>
      <Text style={styles.valeurLigne}>{valeur}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    backgroundColor: couleurs.blancCraie,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.craieProfonde,
    paddingHorizontal: espaces.l,
    paddingTop: espaces.l,
    paddingBottom: espaces.m,
    shadowColor: couleurs.noirEncre,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  entete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: espaces.l,
  },
  numero: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.secondaire,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  etiquettePrix: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
  },
  montant: {
    color: couleurs.orMat,
    fontFamily: polices.display,
    fontSize: tailles.montantTicket,
    fontVariant: ['tabular-nums'],
    marginVertical: espaces.xs,
  },
  montantExact: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    fontVariant: ['tabular-nums'],
    marginBottom: espaces.m,
  },
  separateur: {
    height: 1,
    backgroundColor: couleurs.craieProfonde,
    marginBottom: espaces.m,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: espaces.s,
    gap: espaces.m,
  },
  secondaire: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    flexShrink: 1,
  },
  valeurLigne: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    fontVariant: ['tabular-nums'],
  },
  perforations: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espaces.m,
    marginHorizontal: -espaces.xs,
  },
  perforation: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: couleurs.craieProfonde,
  },
});
