import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { couleurs, polices } from '../src/design/tokens';

export default function DispositionRacine(): React.JSX.Element | null {
  const [policesChargees] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!policesChargees) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: couleurs.blancCraie },
          headerTintColor: couleurs.noirEncre,
          headerTitleStyle: { fontFamily: polices.corpsSemiBold, color: couleurs.noirEncre },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: couleurs.blancCraie },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Nouvelle estimation' }} />
        <Stack.Screen name="resultat" options={{ title: 'Estimation', headerBackTitle: 'Saisie' }} />
        <Stack.Screen name="reglages" options={{ title: 'Réglages', presentation: 'modal' }} />
        <Stack.Screen
          name="analyse"
          options={{
            title: 'Analyser en photo',
            headerStyle: { backgroundColor: couleurs.noirEncre },
            headerTintColor: couleurs.blancCraie,
            headerTitleStyle: { fontFamily: polices.corpsSemiBold, color: couleurs.blancCraie },
          }}
        />
      </Stack>
    </>
  );
}
