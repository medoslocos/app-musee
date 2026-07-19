import { Redirect, useRouter } from 'expo-router';
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
import { PaveSignature } from '../src/composants/PaveSignature';
import { MESSAGE_ESPECES_INTERDITES, type ModePaiement } from '../src/domaine/paiement';
import { formaterCentimes } from '../src/domaine/monnaie';
import { utiliserEstimation } from '../src/etat/magasin-estimation';
import { utiliserReglages } from '../src/etat/magasin-reglages';
import { obtenirDepot } from '../src/livre/composition';
import type { LigneLivrePolice } from '../src/livre/depot';
import { genererHtmlRecu } from '../src/recu/recu-html';
import { imprimerOuPartagerRecu } from '../src/recu/imprimer';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../src/design/tokens';

const TYPES_PIECE = ['CNI', 'Passeport', 'Titre de séjour', 'Permis de conduire'] as const;

/**
 * Écran 3/3 — Rachat : identité du vendeur, mode de paiement (espèces
 * bloquées — art. L112-6 CMF), signature, puis ligne du livre de police
 * et reçu. Une seule action principale : « Valider le rachat ».
 */
export default function EcranRachat(): React.JSX.Element {
  const routeur = useRouter();
  const { resultat, estimationId, recommencer } = utiliserEstimation();
  const marge = utiliserEstimation((etat) => etat.resultat?.marge);
  const boutique = utiliserReglages((etat) => etat.boutique);
  const rappelLegalVu = utiliserReglages((etat) => etat.rappelLegalVu);
  const marquerRappelLegalVu = utiliserReglages((etat) => etat.marquerRappelLegalVu);

  const [nom, setNom] = useState('');
  const [adresse, setAdresse] = useState('');
  const [typePiece, setTypePiece] = useState<(typeof TYPES_PIECE)[number]>('CNI');
  const [numeroPiece, setNumeroPiece] = useState('');
  const [modePaiement, setModePaiement] = useState<ModePaiement>('cheque-barre');
  const [signatureSvg, setSignatureSvg] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ligneValidee, setLigneValidee] = useState<LigneLivrePolice | null>(null);

  if (resultat === null || estimationId === null) {
    return <Redirect href="/" />;
  }

  const saisieComplete =
    nom.trim() !== '' && adresse.trim() !== '' && numeroPiece.trim() !== '' && signatureSvg !== null;

  async function validerRachat(): Promise<void> {
    if (estimationId === null || marge === undefined || signatureSvg === null) {
      return;
    }
    try {
      const ligne = await (await obtenirDepot()).enregistrerRachat({
        estimationId,
        identite: {
          nom: nom.trim(),
          adresse: adresse.trim(),
          typePiece,
          numeroPiece: numeroPiece.trim(),
        },
        modePaiement,
        signatureSvg,
        marge,
      });
      setLigneValidee(ligne);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le rachat n’a pas pu être enregistré — réessayer.');
    }
  }

  async function genererRecu(): Promise<void> {
    if (ligneValidee === null || estimationId === null) {
      return;
    }
    const depot = await obtenirDepot();
    const estimation = await depot.lireEstimation(estimationId);
    if (estimation === null) {
      setErreur('Estimation introuvable — le reçu ne peut pas être généré.');
      return;
    }
    await imprimerOuPartagerRecu(
      genererHtmlRecu({
        boutique,
        estimation,
        ligne: ligneValidee,
        identite: depot.identiteDeLigne(ligneValidee),
        signatureSvg: estimation.signature_svg,
      }),
    );
  }

  if (ligneValidee !== null) {
    return (
      <View style={styles.ecran}>
        <ScrollView contentContainerStyle={styles.contenu}>
          <View style={styles.carteConfirmation}>
            <Text style={styles.titreConfirmation}>Rachat enregistré</Text>
            <Text style={styles.texteConfirmation}>
              Ligne n° {ligneValidee.numero} du livre de police —{' '}
              {formaterCentimes(ligneValidee.prix_centimes)}.
            </Text>
            <Text style={styles.texteConfirmationSecondaire}>
              L’écriture est définitive : une erreur se corrige par une ligne d’annulation,
              jamais par un effacement.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.piedDePage}>
          <BoutonPrincipal libelle="Générer le reçu" onPress={() => void genererRecu()} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              recommencer();
              routeur.dismissTo('/');
            }}
            style={styles.lien}
          >
            <Text style={styles.texteLien}>Nouvelle estimation</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.ecran}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.contenu} keyboardShouldPersistTaps="handled">
        {!rappelLegalVu && (
          <View style={styles.rappelLegal}>
            <Text style={styles.texteRappelLegal}>{MESSAGE_ESPECES_INTERDITES}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={marquerRappelLegalVu}
              style={styles.boutonRappelCompris}
            >
              <Text style={styles.texteRappelCompris}>Compris</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.recapitulatif}>
          Rachat : {formaterCentimes(resultat.prixRachatCentimes)} —{' '}
          {resultat.titre.libelleCourt}
        </Text>

        <Text style={styles.etiquette}>Nom du vendeur</Text>
        <TextInput
          accessibilityLabel="Nom du vendeur"
          value={nom}
          onChangeText={setNom}
          autoComplete="off"
          style={styles.champ}
        />

        <Text style={styles.etiquette}>Adresse</Text>
        <TextInput
          accessibilityLabel="Adresse du vendeur"
          value={adresse}
          onChangeText={setAdresse}
          autoComplete="off"
          style={styles.champ}
        />

        <Text style={styles.etiquette}>Pièce d’identité</Text>
        <View style={styles.rangee}>
          {TYPES_PIECE.map((type) => (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: type === typePiece }}
              onPress={() => setTypePiece(type)}
              style={[styles.pastille, type === typePiece && styles.pastilleActive]}
            >
              <Text style={[styles.textePastille, type === typePiece && styles.textePastilleActive]}>
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          accessibilityLabel="Numéro de la pièce d'identité"
          value={numeroPiece}
          onChangeText={setNumeroPiece}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Numéro de la pièce"
          placeholderTextColor={couleurs.grisEtain}
          style={styles.champ}
        />

        <Text style={styles.etiquette}>Mode de paiement</Text>
        <View style={styles.rangee}>
          {(['cheque-barre', 'virement'] as const).map((mode) => (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === modePaiement }}
              onPress={() => setModePaiement(mode)}
              style={[styles.pastille, mode === modePaiement && styles.pastilleActive]}
            >
              <Text style={[styles.textePastille, mode === modePaiement && styles.textePastilleActive]}>
                {mode === 'cheque-barre' ? 'Chèque barré' : 'Virement'}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.pastille, styles.pastilleInterdite]}>
            <Text style={styles.textePastilleInterdite}>Espèces — interdit (L112-6)</Text>
          </View>
        </View>

        <Text style={styles.etiquette}>Signature du vendeur</Text>
        <PaveSignature onChangement={setSignatureSvg} />

        {erreur !== null && (
          <View style={styles.carteErreur}>
            <Text style={styles.texteErreur}>{erreur}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.piedDePage}>
        <BoutonPrincipal
          libelle="Valider le rachat"
          onPress={() => void validerRachat()}
          desactive={!saisieComplete}
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
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
    gap: espaces.s,
  },
  rappelLegal: {
    backgroundColor: '#F6E7D8',
    borderRadius: rayons.carte,
    padding: espaces.m,
    gap: espaces.s,
    marginBottom: espaces.s,
  },
  texteRappelLegal: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  boutonRappelCompris: {
    minHeight: CIBLE_TACTILE_MIN,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  texteRappelCompris: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    textDecorationLine: 'underline',
  },
  recapitulatif: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps + 2,
    marginBottom: espaces.s,
  },
  etiquette: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    marginTop: espaces.s,
  },
  champ: {
    minHeight: CIBLE_TACTILE_MIN + 8,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.craieProfonde,
    paddingHorizontal: espaces.m,
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps + 2,
  },
  rangee: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaces.s,
  },
  pastille: {
    minHeight: CIBLE_TACTILE_MIN,
    borderRadius: rayons.bouton,
    borderWidth: 1,
    borderColor: couleurs.grisEtain,
    backgroundColor: couleurs.craieProfonde,
    paddingHorizontal: espaces.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleActive: {
    backgroundColor: couleurs.noirEncre,
    borderColor: couleurs.noirEncre,
  },
  pastilleInterdite: {
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  textePastille: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
  },
  textePastilleActive: {
    color: couleurs.blancCraie,
  },
  textePastilleInterdite: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
  },
  carteErreur: {
    borderRadius: rayons.bouton,
    backgroundColor: '#F6E7D8',
    padding: espaces.m,
    marginTop: espaces.s,
  },
  texteErreur: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  carteConfirmation: {
    backgroundColor: couleurs.blancCraie,
    borderRadius: rayons.carte,
    borderWidth: 1,
    borderColor: couleurs.vertValidation,
    padding: espaces.l,
    gap: espaces.s,
  },
  titreConfirmation: {
    color: couleurs.vertValidation,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.titreEcran,
  },
  texteConfirmation: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
  },
  texteConfirmationSecondaire: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    lineHeight: tailles.secondaire * 1.5,
  },
  piedDePage: {
    padding: espaces.l,
    paddingTop: espaces.s,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  lien: {
    minHeight: CIBLE_TACTILE_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espaces.xs,
  },
  texteLien: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    textDecorationLine: 'underline',
  },
});
