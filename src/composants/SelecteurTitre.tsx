import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CodeTitre } from '../domaine/metaux';
import { TITRES } from '../domaine/metaux';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../design/tokens';

interface Props {
  selection: CodeTitre | null;
  onSelection: (code: CodeTitre) => void;
}

/** Gros boutons tactiles pour choisir le titre — jamais de liste déroulante. */
export function SelecteurTitre({ selection, onSelection }: Props): React.JSX.Element {
  return (
    <View style={styles.grille}>
      {TITRES.map((titre) => {
        const actif = titre.code === selection;
        return (
          <Pressable
            key={titre.code}
            accessibilityRole="button"
            accessibilityState={{ selected: actif }}
            onPress={() => onSelection(titre.code)}
            style={({ pressed }) => [styles.bouton, actif && styles.actif, pressed && styles.presse]}
          >
            <Text style={[styles.libelle, actif && styles.libelleActif]}>{titre.libelle}</Text>
            <Text style={[styles.purete, actif && styles.libelleActif]}>
              {titre.puretePourMille} ‰
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaces.s,
  },
  bouton: {
    minHeight: CIBLE_TACTILE_MIN + 12,
    flexBasis: '31%',
    flexGrow: 1,
    borderRadius: rayons.bouton,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    backgroundColor: couleurs.craieProfonde,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espaces.s,
    paddingHorizontal: espaces.xs,
  },
  actif: {
    backgroundColor: couleurs.noirEncre,
    borderColor: couleurs.noirEncre,
  },
  presse: {
    opacity: 0.85,
  },
  libelle: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    textAlign: 'center',
  },
  purete: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    marginTop: 2,
  },
  libelleActif: {
    color: couleurs.blancCraie,
  },
});
