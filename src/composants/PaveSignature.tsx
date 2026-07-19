import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../design/tokens';

interface Props {
  /** Reçoit le SVG complet de la signature, ou null tant qu'elle est vide. */
  onChangement: (svg: string | null) => void;
}

type Point = { x: number; y: number };
type Trace = Point[];

const HAUTEUR = 160;

/** Signature tactile du vendeur, embarquée telle quelle dans le reçu PDF. */
export function PaveSignature({ onChangement }: Props): React.JSX.Element {
  const [traces, setTraces] = useState<Trace[]>([]);
  const vue = useRef<View>(null);
  const origine = useRef<Point>({ x: 0, y: 0 });
  const largeur = useRef(320);

  function pointDepuisEvenement(
    evenement: GestureResponderEvent,
    geste: PanResponderGestureState,
  ): Point {
    const { locationX, locationY } = evenement.nativeEvent;
    // Natif : coordonnées locales fournies. Web : on retombe sur les
    // coordonnées de page moins l'origine mesurée de la zone.
    if (typeof locationX === 'number' && Number.isFinite(locationX) && locationX !== 0) {
      return { x: locationX, y: locationY };
    }
    return { x: geste.moveX - origine.current.x, y: geste.moveY - origine.current.y };
  }

  function publier(nouvellesTraces: Trace[]): void {
    const utiles = nouvellesTraces.filter((trace) => trace.length >= 2);
    if (utiles.length === 0) {
      onChangement(null);
      return;
    }
    const polylignes = utiles
      .map(
        (trace) =>
          `<polyline fill="none" stroke="#1A1814" stroke-width="2" stroke-linecap="round" ` +
          `points="${trace.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>`,
      )
      .join('');
    onChangement(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largeur.current} ${HAUTEUR}">${polylignes}</svg>`,
    );
  }

  const repondeur = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evenement, geste) => {
          vue.current?.measureInWindow((x, y) => {
            origine.current = { x, y };
          });
          const depart = {
            x: geste.x0 - origine.current.x,
            y: geste.y0 - origine.current.y,
          };
          const { locationX, locationY } = evenement.nativeEvent;
          const premier =
            typeof locationX === 'number' && Number.isFinite(locationX) && locationX !== 0
              ? { x: locationX, y: locationY }
              : depart;
          setTraces((precedentes) => [...precedentes, [premier]]);
        },
        onPanResponderMove: (evenement, geste) => {
          const point = pointDepuisEvenement(evenement, geste);
          setTraces((precedentes) => {
            const derniere = precedentes[precedentes.length - 1] ?? [];
            return [...precedentes.slice(0, -1), [...derniere, point]];
          });
        },
        onPanResponderRelease: () => {
          setTraces((precedentes) => {
            publier(precedentes);
            return precedentes;
          });
        },
      }),
    // Les callbacks ne lisent que des refs et des setters stables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function effacer(): void {
    setTraces([]);
    onChangement(null);
  }

  return (
    <View>
      <View
        ref={vue}
        style={styles.zone}
        onLayout={(evenement) => {
          largeur.current = Math.round(evenement.nativeEvent.layout.width);
          vue.current?.measureInWindow((x, y) => {
            origine.current = { x, y };
          });
        }}
        {...repondeur.panHandlers}
      >
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {traces.map((trace, indice) => (
            <Polyline
              key={indice}
              points={trace.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={couleurs.noirEncre}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </Svg>
        {traces.length === 0 && <Text style={styles.invite}>Faire signer le vendeur ici</Text>}
      </View>
      <Pressable accessibilityRole="button" onPress={effacer} style={styles.boutonEffacer}>
        <Text style={styles.texteEffacer}>Effacer la signature</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    height: HAUTEUR,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.blancCraie,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invite: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.corps,
  },
  boutonEffacer: {
    minHeight: CIBLE_TACTILE_MIN,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  texteEffacer: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
    textDecorationLine: 'underline',
  },
});
