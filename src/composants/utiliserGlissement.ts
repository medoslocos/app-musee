import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * L'unique animation soignée de l'app (CLAUDE.md §3) : glissement vers le
 * haut à l'apparition, 300 ms ease-out, désactivée si l'utilisateur demande
 * la réduction des animations. Partagée entre le ticket F1 et la carte F2.
 */
export function utiliserGlissement(): {
  opacite: Animated.Value | number;
  translation: Animated.AnimatedInterpolation<number>;
} {
  const progression = useRef(new Animated.Value(0)).current;
  const [pret, setPret] = useState(false);

  useEffect(() => {
    let annule = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduit) => {
      if (annule) {
        return;
      }
      setPret(true);
      if (reduit) {
        progression.setValue(1);
        return;
      }
      Animated.timing(progression, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
    return () => {
      annule = true;
    };
  }, [progression]);

  return {
    opacite: pret ? progression : 0,
    translation: progression.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }),
  };
}
