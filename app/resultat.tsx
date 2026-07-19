import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BandeauCours, formaterHeureCours } from '../src/composants/BandeauCours';
import { BoutonPrincipal } from '../src/composants/BoutonPrincipal';
import { TicketEstimation } from '../src/composants/TicketEstimation';
import { utiliserEstimation } from '../src/etat/magasin-estimation';
import { couleurs, espaces } from '../src/design/tokens';

/**
 * Écran 2/3 — Résultat : le ticket d'estimation. Le prix de rachat est
 * l'élément le plus grand de l'écran ; le détail du calcul est dessous
 * (transparence = confiance).
 */
export default function EcranResultat(): React.JSX.Element {
  const routeur = useRouter();
  const { resultat, coursUtilise, numeroTicket, recommencer } = utiliserEstimation();

  if (resultat === null || coursUtilise === null) {
    return <Redirect href="/" />;
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
        <BoutonPrincipal
          libelle="Nouvelle estimation"
          onPress={() => {
            recommencer();
            routeur.dismissTo('/');
          }}
        />
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
});
