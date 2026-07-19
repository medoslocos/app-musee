import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Marge } from '../src/domaine/calcul-estimation';
import type { Metal } from '../src/domaine/metaux';
import { LIBELLES_METAUX } from '../src/domaine/metaux';
import { utiliserReglages } from '../src/etat/magasin-reglages';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../src/design/tokens';

const METAUX: readonly Metal[] = ['or', 'argent', 'platine'];

function margeEnTexte(marge: Marge): string {
  return marge.mode === 'pourcentage'
    ? (marge.pourMille / 10).toLocaleString('fr-FR')
    : (marge.centimesParGramme / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
}

function texteEnMarge(mode: Marge['mode'], texte: string): Marge | null {
  const valeur = Number(texte.trim().replace(',', '.'));
  if (Number.isNaN(valeur) || valeur < 0) {
    return null;
  }
  if (mode === 'pourcentage') {
    const pourMille = Math.round(valeur * 10);
    return pourMille <= 1000 ? { mode, pourMille } : null;
  }
  return { mode, centimesParGramme: Math.round(valeur * 100) };
}

/**
 * Écran Réglages — marge de rachat par métal, en pourcentage ou en €/g.
 * Aucun réglage n'est obligatoire : des préréglages s'appliquent d'office.
 */
export default function EcranReglages(): React.JSX.Element {
  return (
    <ScrollView style={styles.ecran} contentContainerStyle={styles.contenu}>
      <Text style={styles.explication}>
        Marge appliquée au prix de rachat, par métal. Elle est déduite de la valeur fonte.
      </Text>
      {METAUX.map((metal) => (
        <ReglageMarge key={metal} metal={metal} />
      ))}
      <ReglageBoutique />
      <Link href="/livre-police" asChild>
        <Pressable accessibilityRole="button" style={styles.lienLivre}>
          <Text style={styles.texteLienLivre}>Ouvrir le livre de police</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

function ReglageBoutique(): React.JSX.Element {
  const boutique = utiliserReglages((etat) => etat.boutique);
  const definirBoutique = utiliserReglages((etat) => etat.definirBoutique);
  return (
    <View style={styles.carte}>
      <Text style={styles.nomMetal}>Boutique (en-tête du reçu)</Text>
      <View style={styles.champ}>
        <TextInput
          accessibilityLabel="Nom de la boutique"
          value={boutique.nom}
          onChangeText={(nom) => definirBoutique({ ...boutique, nom })}
          style={styles.saisieBoutique}
        />
      </View>
      <View style={styles.champ}>
        <TextInput
          accessibilityLabel="Adresse de la boutique"
          value={boutique.adresse}
          onChangeText={(adresse) => definirBoutique({ ...boutique, adresse })}
          placeholder="Adresse"
          placeholderTextColor={couleurs.grisEtain}
          style={styles.saisieBoutique}
        />
      </View>
    </View>
  );
}

function ReglageMarge({ metal }: { metal: Metal }): React.JSX.Element {
  const marge = utiliserReglages((etat) => etat.margesParMetal[metal]);
  const definirMarge = utiliserReglages((etat) => etat.definirMarge);
  const [texte, setTexte] = useState(() => margeEnTexte(marge));
  const [invalide, setInvalide] = useState(false);

  function changerMode(mode: Marge['mode']): void {
    if (mode === marge.mode) {
      return;
    }
    const nouvelle: Marge =
      mode === 'pourcentage' ? { mode, pourMille: 150 } : { mode, centimesParGramme: 200 };
    definirMarge(metal, nouvelle);
    setTexte(margeEnTexte(nouvelle));
    setInvalide(false);
  }

  function changerValeur(nouveauTexte: string): void {
    setTexte(nouveauTexte);
    const analyse = texteEnMarge(marge.mode, nouveauTexte);
    if (analyse === null) {
      setInvalide(true);
      return;
    }
    setInvalide(false);
    definirMarge(metal, analyse);
  }

  return (
    <View style={styles.carte}>
      <Text style={styles.nomMetal}>{LIBELLES_METAUX[metal]}</Text>
      <View style={styles.ligneModes}>
        <BoutonMode
          libelle="En %"
          actif={marge.mode === 'pourcentage'}
          onPress={() => changerMode('pourcentage')}
        />
        <BoutonMode
          libelle="En €/g"
          actif={marge.mode === 'euros-par-gramme'}
          onPress={() => changerMode('euros-par-gramme')}
        />
      </View>
      <View style={[styles.champ, invalide && styles.champInvalide]}>
        <TextInput
          accessibilityLabel={`Marge pour ${LIBELLES_METAUX[metal]}`}
          value={texte}
          onChangeText={changerValeur}
          keyboardType="decimal-pad"
          style={styles.saisie}
          maxLength={7}
        />
        <Text style={styles.unite}>{marge.mode === 'pourcentage' ? '%' : '€/g'}</Text>
      </View>
      {invalide && (
        <Text style={styles.texteInvalide}>
          Valeur non prise en compte — saisir un nombre positif
          {marge.mode === 'pourcentage' ? ' entre 0 et 100' : ''}.
        </Text>
      )}
    </View>
  );
}

function BoutonMode({
  libelle,
  actif,
  onPress,
}: {
  libelle: string;
  actif: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: actif }}
      onPress={onPress}
      style={[styles.boutonMode, actif && styles.boutonModeActif]}
    >
      <Text style={[styles.libelleMode, actif && styles.libelleModeActif]}>{libelle}</Text>
    </Pressable>
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
    gap: espaces.m,
  },
  explication: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  carte: {
    backgroundColor: couleurs.craieProfonde,
    borderRadius: rayons.carte,
    padding: espaces.m,
    gap: espaces.s,
  },
  nomMetal: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps + 2,
  },
  ligneModes: {
    flexDirection: 'row',
    gap: espaces.s,
  },
  boutonMode: {
    minHeight: CIBLE_TACTILE_MIN,
    flex: 1,
    borderRadius: rayons.bouton,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonModeActif: {
    backgroundColor: couleurs.noirEncre,
    borderColor: couleurs.noirEncre,
  },
  libelleMode: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
  },
  libelleModeActif: {
    color: couleurs.blancCraie,
  },
  champ: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.blancCraie,
    paddingHorizontal: espaces.m,
  },
  champInvalide: {
    borderColor: couleurs.ambreAlerte,
  },
  saisie: {
    flex: 1,
    minHeight: CIBLE_TACTILE_MIN,
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.titreEcran,
    fontVariant: ['tabular-nums'],
  },
  unite: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    marginLeft: espaces.s,
  },
  texteInvalide: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
  },
  saisieBoutique: {
    flex: 1,
    minHeight: CIBLE_TACTILE_MIN,
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
  },
  lienLivre: {
    minHeight: CIBLE_TACTILE_MIN + 8,
    borderRadius: rayons.bouton,
    borderWidth: 1.5,
    borderColor: couleurs.noirEncre,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texteLienLivre: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
  },
});
