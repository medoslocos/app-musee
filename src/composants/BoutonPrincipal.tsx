import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../design/tokens';

interface Props {
  libelle: string;
  onPress: () => void;
  desactive?: boolean;
}

/** L'action principale de l'écran : toujours en bas, pleine largeur, une seule par écran. */
export function BoutonPrincipal({ libelle, onPress, desactive = false }: Props): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: desactive }}
      disabled={desactive}
      onPress={onPress}
      style={({ pressed }) => [styles.bouton, desactive && styles.desactive, pressed && styles.presse]}
    >
      <Text style={styles.libelle}>{libelle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bouton: {
    minHeight: 56,
    minWidth: CIBLE_TACTILE_MIN,
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.noirEncre,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaces.l,
    paddingVertical: espaces.m,
  },
  desactive: {
    backgroundColor: couleurs.grisEtain,
  },
  presse: {
    opacity: 0.85,
  },
  libelle: {
    color: couleurs.blancCraie,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps + 2,
  },
});
