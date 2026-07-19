import { Redirect, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BandeauCours, formaterHeureCours } from '../src/composants/BandeauCours';
import { BoutonPrincipal } from '../src/composants/BoutonPrincipal';
import { TicketEstimation } from '../src/composants/TicketEstimation';
import { obtenirDepot } from '../src/livre/composition';
import { utiliserEstimation } from '../src/etat/magasin-estimation';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, tailles } from '../src/design/tokens';

/**
 * Écran 2/3 — Résultat : le ticket d'estimation. L'estimation est persistée
 * ici (statut « estimé ») ; le rachat se joue à l'écran suivant.
 */
export default function EcranResultat(): React.JSX.Element {
  const routeur = useRouter();
  const {
    resultat,
    coursUtilise,
    analyse,
    numeroTicket,
    estimationId,
    definirEstimationId,
    recommencer,
  } = utiliserEstimation();

  useEffect(() => {
    if (resultat === null || estimationId !== null) {
      return;
    }
    const description =
      analyse !== null
        ? `${analyse.type_objet}${analyse.matiere_probable !== null ? ` — ${analyse.matiere_probable}` : ''}`
        : `Bijou ${resultat.titre.libelleCourt}`;
    let annule = false;
    void obtenirDepot()
      .then((depot) => depot.enregistrerEstimation(resultat, description))
      .then((id) => {
        if (!annule) {
          definirEstimationId(id);
        }
      });
    return () => {
      annule = true;
    };
  }, [resultat, estimationId, analyse, definirEstimationId]);

  if (resultat === null || coursUtilise === null) {
    return <Redirect href="/" />;
  }

  function marquerRefus(): void {
    if (estimationId !== null) {
      void obtenirDepot().then((depot) => depot.marquerRefusee(estimationId));
    }
    recommencer();
    routeur.dismissTo('/');
  }

  return (
    <View style={styles.ecran}>
      <ScrollView contentContainerStyle={styles.contenu}>
        <TicketEstimation
          resultat={resultat}
          numeroTicket={numeroTicket}
          heureCours={formaterHeureCours(coursUtilise.cours.horodatageIso)}
        />
        <View style={styles.espaceBandeau}>
          <BandeauCours cours={coursUtilise} />
        </View>
      </ScrollView>

      <View style={styles.piedDePage}>
        <BoutonPrincipal libelle="Passer au rachat" onPress={() => routeur.push('/rachat')} />
        <View style={styles.lignesSecondaires}>
          <Pressable accessibilityRole="button" onPress={marquerRefus} style={styles.lien}>
            <Text style={styles.texteLien}>Refus du client</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              recommencer();
              routeur.dismissTo('/');
            }}
            style={styles.lien}
          >
            <Text style={styles.texteLien}>Nouvelle estimation</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.blancCraie,
  },
  contenu: {
    padding: espaces.l,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  espaceBandeau: {
    marginTop: espaces.m,
  },
  piedDePage: {
    padding: espaces.l,
    paddingTop: espaces.s,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  lignesSecondaires: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: espaces.xs,
  },
  lien: {
    minHeight: CIBLE_TACTILE_MIN,
    justifyContent: 'center',
  },
  texteLien: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    textDecorationLine: 'underline',
  },
});
