import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BoutonPrincipal } from '../src/composants/BoutonPrincipal';
import { SelecteurTitre } from '../src/composants/SelecteurTitre';
import { serviceCours } from '../src/cours/composition';
import { titreParCode } from '../src/domaine/metaux';
import { utiliserEstimation } from '../src/etat/magasin-estimation';
import { utiliserReglages } from '../src/etat/magasin-reglages';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../src/design/tokens';

/**
 * Écran 1/3 — Saisie. Un seul travail : poids + titre, puis « Estimer ».
 */
export default function EcranSaisie(): React.JSX.Element {
  const routeur = useRouter();
  const { poids, codeTitre, definirPoids, definirTitre, estimer } = utiliserEstimation();
  const margesParMetal = utiliserReglages((etat) => etat.margesParMetal);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const saisieComplete = poids.trim() !== '' && codeTitre !== null;

  async function lancerEstimation(): Promise<void> {
    if (codeTitre === null) {
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      const titre = titreParCode(codeTitre);
      const cours = await serviceCours.obtenirCours(titre.metal);
      estimer(cours, margesParMetal[titre.metal]);
      routeur.push('/resultat');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Estimation impossible — réessayer.');
    } finally {
      setEnCours(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.ecran}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contenu}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.invitation}>
          Poser le bijou sur la balance, saisir le poids et choisir le titre.
        </Text>

        <Text style={styles.etiquette}>Poids</Text>
        <View style={styles.champPoids}>
          <TextInput
            accessibilityLabel="Poids en grammes"
            value={poids}
            onChangeText={(texte) => {
              setErreur(null);
              definirPoids(texte);
            }}
            placeholder="0,0"
            placeholderTextColor={couleurs.grisEtain}
            keyboardType="decimal-pad"
            style={styles.saisiePoids}
            maxLength={9}
          />
          <Text style={styles.unite}>g</Text>
        </View>

        <Text style={styles.etiquette}>Titre</Text>
        <SelecteurTitre
          selection={codeTitre}
          onSelection={(code) => {
            setErreur(null);
            definirTitre(code);
          }}
        />

        {erreur !== null && (
          <View style={styles.carteErreur}>
            <Text style={styles.texteErreur}>{erreur}</Text>
          </View>
        )}

        <Link href="/reglages" asChild>
          <Pressable accessibilityRole="button" style={styles.lienReglages}>
            <Text style={styles.texteLien}>Réglages des marges</Text>
          </Pressable>
        </Link>
      </ScrollView>

      <View style={styles.piedDePage}>
        <BoutonPrincipal
          libelle={enCours ? 'Récupération du cours…' : 'Estimer'}
          onPress={lancerEstimation}
          desactive={!saisieComplete || enCours}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.blancCraie,
  },
  contenu: {
    padding: espaces.l,
    paddingBottom: espaces.xl,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  invitation: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
    marginBottom: espaces.l,
  },
  etiquette: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    marginBottom: espaces.s,
  },
  champPoids: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.craieProfonde,
    paddingHorizontal: espaces.m,
    marginBottom: espaces.l,
  },
  saisiePoids: {
    flex: 1,
    minHeight: CIBLE_TACTILE_MIN + 16,
    color: couleurs.noirEncre,
    fontFamily: polices.display,
    fontSize: 40,
    fontVariant: ['tabular-nums'],
  },
  unite: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.titreEcran,
    marginLeft: espaces.s,
  },
  carteErreur: {
    marginTop: espaces.l,
    borderRadius: rayons.bouton,
    backgroundColor: '#F6E7D8',
    padding: espaces.m,
  },
  texteErreur: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  lienReglages: {
    minHeight: CIBLE_TACTILE_MIN,
    justifyContent: 'center',
    marginTop: espaces.l,
  },
  texteLien: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    textDecorationLine: 'underline',
  },
  piedDePage: {
    padding: espaces.l,
    paddingTop: espaces.s,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
});
