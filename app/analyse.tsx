import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fournisseurAnalyse, analyseEnModeDemonstration } from '../src/analyse/composition';
import { BoutonPrincipal } from '../src/composants/BoutonPrincipal';
import { CarteAnalyse } from '../src/composants/CarteAnalyse';
import { SqueletteCarte } from '../src/composants/SqueletteCarte';
import type { AnalyseBijou } from '../src/domaine/analyse.schema';
import { utiliserEstimation } from '../src/etat/magasin-estimation';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../src/design/tokens';

type Etape =
  | { nom: 'cadrage' }
  | { nom: 'analyse'; photoUri: string }
  | { nom: 'resultat'; photoUri: string; analyse: AnalyseBijou }
  | { nom: 'erreur'; photoUri: string; message: string };

/**
 * Écran F2 — Photo & assistance IA. La photo reste plein écran ; la carte
 * d'analyse remonte du bas comme le ticket F1. L'IA suggère, l'humain décide.
 */
export default function EcranAnalyse(): React.JSX.Element {
  const routeur = useRouter();
  const appliquerAnalyse = utiliserEstimation((etat) => etat.appliquerAnalyse);
  const [permission, demanderPermission] = useCameraPermissions();
  const [etape, setEtape] = useState<Etape>({ nom: 'cadrage' });
  const camera = useRef<CameraView>(null);

  async function compresserEtAnalyser(uri: string): Promise<void> {
    setEtape({ nom: 'analyse', photoUri: uri });
    try {
      // Compression avant envoi : ~1600 px de large, JPEG qualité 0,7 (< 1,5 Mo).
      const compressee = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (compressee.base64 == null) {
        throw new Error('La photo n’a pas pu être préparée — reprendre la photo.');
      }
      const analyse = await fournisseurAnalyse.analyser(compressee.base64);
      setEtape({ nom: 'resultat', photoUri: uri, analyse });
    } catch (e) {
      setEtape({
        nom: 'erreur',
        photoUri: uri,
        message: e instanceof Error ? e.message : 'Analyse impossible — reprendre la photo.',
      });
    }
  }

  async function prendrePhoto(): Promise<void> {
    const photo = await camera.current?.takePictureAsync({ quality: 0.9 });
    if (photo !== undefined) {
      await compresserEtAnalyser(photo.uri);
    }
  }

  async function importerDepuisGalerie(): Promise<void> {
    const resultat = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    const uri = resultat.assets?.[0]?.uri;
    if (!resultat.canceled && uri !== undefined) {
      await compresserEtAnalyser(uri);
    }
  }

  function utiliserPourEstimation(analyse: AnalyseBijou): void {
    appliquerAnalyse(analyse);
    routeur.dismissTo('/');
  }

  if (etape.nom === 'cadrage') {
    return (
      <View style={styles.ecran}>
        {permission?.granted === true ? (
          <CameraView ref={camera} style={styles.camera} facing="back" />
        ) : (
          <View style={[styles.camera, styles.cameraAbsente]}>
            <Text style={styles.textePermission}>
              La caméra n’est pas accessible.{'\n'}Autoriser l’accès, ou importer une photo depuis
              la galerie.
            </Text>
            {permission?.canAskAgain === true && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void demanderPermission()}
                style={styles.boutonSecondaire}
              >
                <Text style={styles.texteBoutonSecondaire}>Autoriser la caméra</Text>
              </Pressable>
            )}
          </View>
        )}

        <View pointerEvents="none" style={styles.cadreVisee} />
        <Text style={styles.rappelLumiere}>Lumière du jour, fond neutre</Text>

        <View style={styles.barreCapture}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Importer depuis la galerie"
            onPress={() => void importerDepuisGalerie()}
            style={styles.boutonGalerie}
          >
            <Text style={styles.texteBoutonSecondaire}>Galerie</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Prendre la photo"
            onPress={() => void prendrePhoto()}
            disabled={permission?.granted !== true}
            style={[styles.declencheur, permission?.granted !== true && styles.declencheurInactif]}
          >
            <View style={styles.declencheurInterieur} />
          </Pressable>
          <View style={styles.boutonGalerie} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ecran}>
      <Image source={{ uri: etape.photoUri }} style={styles.camera} resizeMode="cover" />

      <View style={styles.voile} />

      <View style={styles.zoneCarte}>
        {etape.nom === 'analyse' && <SqueletteCarte />}

        {etape.nom === 'erreur' && (
          <View style={styles.carteErreur}>
            <Text style={styles.texteErreur}>{etape.message}</Text>
            <BoutonPrincipal libelle="Reprendre la photo" onPress={() => setEtape({ nom: 'cadrage' })} />
          </View>
        )}

        {etape.nom === 'resultat' && (
          <ScrollView style={styles.defilementCarte} contentContainerStyle={styles.contenuCarte}>
            <CarteAnalyse analyse={etape.analyse} />
            {analyseEnModeDemonstration() && (
              <Text style={styles.noteDemonstration}>
                Analyse de démonstration — service IA non branché (voir TODO-HUMAIN.md).
              </Text>
            )}
            <View style={styles.actionsCarte}>
              <BoutonPrincipal
                libelle="Utiliser pour l’estimation"
                onPress={() => utiliserPourEstimation(etape.analyse)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setEtape({ nom: 'cadrage' })}
                style={styles.lienReprendre}
              >
                <Text style={styles.texteLien}>Reprendre la photo</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.noirEncre,
  },
  camera: {
    ...StyleSheet.absoluteFill,
  },
  cameraAbsente: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaces.l,
    padding: espaces.xl,
  },
  textePermission: {
    color: couleurs.blancCraie,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
    textAlign: 'center',
  },
  cadreVisee: {
    position: 'absolute',
    top: '18%',
    alignSelf: 'center',
    width: '72%',
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: couleurs.blancCraie,
    borderRadius: rayons.carte,
    opacity: 0.7,
  },
  rappelLumiere: {
    position: 'absolute',
    top: '10%',
    alignSelf: 'center',
    color: couleurs.blancCraie,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    backgroundColor: 'rgba(26, 24, 20, 0.55)',
    borderRadius: 999,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.xs + 2,
    overflow: 'hidden',
  },
  barreCapture: {
    position: 'absolute',
    bottom: espaces.xl,
    left: espaces.l,
    right: espaces.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boutonGalerie: {
    minWidth: 88,
    minHeight: CIBLE_TACTILE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonSecondaire: {
    minHeight: CIBLE_TACTILE_MIN,
    borderRadius: rayons.bouton,
    borderWidth: 1,
    borderColor: couleurs.blancCraie,
    paddingHorizontal: espaces.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texteBoutonSecondaire: {
    color: couleurs.blancCraie,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
  },
  declencheur: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: couleurs.blancCraie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declencheurInactif: {
    opacity: 0.4,
  },
  declencheurInterieur: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: couleurs.blancCraie,
  },
  voile: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 24, 20, 0.25)',
  },
  zoneCarte: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  defilementCarte: {
    maxHeight: '75%',
    flexGrow: 0,
  },
  contenuCarte: {
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  carteErreur: {
    backgroundColor: couleurs.blancCraie,
    borderTopLeftRadius: rayons.carte,
    borderTopRightRadius: rayons.carte,
    padding: espaces.l,
    gap: espaces.m,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  texteErreur: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  noteDemonstration: {
    backgroundColor: couleurs.blancCraie,
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    paddingHorizontal: espaces.l,
    paddingTop: espaces.s,
  },
  actionsCarte: {
    backgroundColor: couleurs.blancCraie,
    padding: espaces.l,
    gap: espaces.s,
  },
  lienReprendre: {
    minHeight: CIBLE_TACTILE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texteLien: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    textDecorationLine: 'underline',
  },
});
