import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { couleurs, espaces, rayons } from '../design/tokens';

/**
 * État de chargement de la carte d'analyse : squelette qui respire —
 * jamais de spinner (CLAUDE.md §3).
 */
export function SqueletteCarte(): React.JSX.Element {
  const respiration = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const boucle = Animated.loop(
      Animated.sequence([
        Animated.timing(respiration, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(respiration, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    boucle.start();
    return () => boucle.stop();
  }, [respiration]);

  return (
    <View style={styles.carte}>
      <Animated.View style={[styles.ligne, styles.ligneTitre, { opacity: respiration }]} />
      <Animated.View style={[styles.ligne, { opacity: respiration }]} />
      <Animated.View style={[styles.ligne, styles.ligneCourte, { opacity: respiration }]} />
      <Animated.View style={[styles.ligne, styles.ligneCourte, { opacity: respiration }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  carte: {
    backgroundColor: couleurs.blancCraie,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
    padding: espaces.l,
    gap: espaces.m,
  },
  ligne: {
    height: 16,
    borderRadius: 8,
    backgroundColor: couleurs.craieProfonde,
  },
  ligneTitre: {
    height: 24,
    width: '70%',
  },
  ligneCourte: {
    width: '45%',
  },
});
