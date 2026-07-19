import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BoutonPrincipal } from '../src/composants/BoutonPrincipal';
import { formaterCentimes } from '../src/domaine/monnaie';
import { obtenirDepot } from '../src/livre/composition';
import type { LigneLivrePolice } from '../src/livre/depot';
import { CIBLE_TACTILE_MIN, couleurs, espaces, polices, rayons, tailles } from '../src/design/tokens';

function formaterDateCourte(dateIso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(dateIso),
  );
}

/**
 * Livre de police : consultation et export. Aucune suppression possible —
 * la seule action corrective est la ligne d'annulation.
 */
export default function EcranLivrePolice(): React.JSX.Element {
  const [lignes, setLignes] = useState<LigneLivrePolice[]>([]);
  const [integrite, setIntegrite] = useState<number[]>([]);
  const [charge, setCharge] = useState(false);
  const [annulationEnCours, setAnnulationEnCours] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    const depot = await obtenirDepot();
    setLignes(await depot.listerLivre());
    setIntegrite(await depot.verifierChaine());
    setCharge(true);
  }, []);

  useEffect(() => {
    void rafraichir();
  }, [rafraichir]);

  async function annuler(numero: number): Promise<void> {
    try {
      await (await obtenirDepot()).annulerLigne(numero, 'annulation demandée par le bijoutier');
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Annulation impossible');
    }
    setAnnulationEnCours(null);
    await rafraichir();
  }

  async function exporterCsv(): Promise<void> {
    const csv = await (await obtenirDepot()).exporterCsv();
    if (Platform.OS === 'web') {
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
      lien.download = 'livre-police.csv';
      lien.click();
      return;
    }
    const chemin = `${FileSystem.cacheDirectory}livre-police.csv`;
    await FileSystem.writeAsStringAsync(chemin, '﻿' + csv);
    await Sharing.shareAsync(chemin, { mimeType: 'text/csv', dialogTitle: 'Livre de police' });
  }

  return (
    <View style={styles.ecran}>
      {lignes.length === 0 ? (
        !charge ? (
          <View style={styles.etatVide} />
        ) : (
        <View style={styles.etatVide}>
          <Text style={styles.titreVide}>Livre de police vide</Text>
          <Text style={styles.texteVide}>
            La première ligne s’écrira automatiquement au premier rachat validé.
          </Text>
        </View>
        )
      ) : (
        <FlatList
          data={lignes}
          keyExtractor={(ligne) => String(ligne.numero)}
          contentContainerStyle={styles.liste}
          ListHeaderComponent={
            integrite.length > 0 ? (
              <View style={styles.carteAlerte}>
                <Text style={styles.texteAlerte}>
                  Intégrité compromise : lignes {integrite.join(', ')} — le scellé ne correspond
                  plus. Contacter le support.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item: ligne }) => (
            <View style={[styles.carte, ligne.type_ligne === 'annulation' && styles.carteAnnulation]}>
              <View style={styles.enteteLigne}>
                <Text style={styles.numero}>N° {String(ligne.numero).padStart(4, '0')}</Text>
                <Text style={styles.date}>{formaterDateCourte(ligne.date_iso)}</Text>
              </View>
              <Text style={styles.description}>{ligne.description_objet}</Text>
              <Text style={styles.detail}>
                {ligne.nature_metal} — {ligne.poids_grammes.replace('.', ',')} g —{' '}
                {formaterCentimes(ligne.prix_centimes)}
              </Text>
              {ligne.type_ligne === 'rachat' &&
                (annulationEnCours === ligne.numero ? (
                  <View style={styles.rangeeConfirmation}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void annuler(ligne.numero)}
                      style={styles.lien}
                    >
                      <Text style={styles.texteConfirmerAnnulation}>Confirmer l’annulation</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setAnnulationEnCours(null)}
                      style={styles.lien}
                    >
                      <Text style={styles.texteLien}>Garder la ligne</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAnnulationEnCours(ligne.numero)}
                    style={styles.lien}
                  >
                    <Text style={styles.texteLien}>Annuler par une ligne d’annulation</Text>
                  </Pressable>
                ))}
            </View>
          )}
        />
      )}

      {message !== null && (
        <View style={styles.carteAlerte}>
          <Text style={styles.texteAlerte}>{message}</Text>
        </View>
      )}

      {lignes.length > 0 && (
        <View style={styles.piedDePage}>
          <BoutonPrincipal libelle="Exporter en CSV" onPress={() => void exporterCsv()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ecran: {
    flex: 1,
    backgroundColor: couleurs.blancCraie,
  },
  etatVide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaces.xl,
    gap: espaces.s,
  },
  titreVide: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.titreEcran,
  },
  texteVide: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.5,
    textAlign: 'center',
  },
  liste: {
    padding: espaces.l,
    gap: espaces.m,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  carte: {
    backgroundColor: couleurs.craieProfonde,
    borderRadius: rayons.carte,
    padding: espaces.m,
    gap: espaces.xs,
  },
  carteAnnulation: {
    borderWidth: 1,
    borderColor: couleurs.ambreAlerte,
    backgroundColor: '#F6E7D8',
  },
  enteteLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  numero: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.corps,
    letterSpacing: 0.4,
  },
  date: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
  },
  description: {
    color: couleurs.noirEncre,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.corps,
    lineHeight: tailles.corps * 1.4,
  },
  detail: {
    color: couleurs.grisEtain,
    fontFamily: polices.corps,
    fontSize: tailles.secondaire,
    fontVariant: ['tabular-nums'],
  },
  rangeeConfirmation: {
    flexDirection: 'row',
    gap: espaces.l,
  },
  lien: {
    minHeight: CIBLE_TACTILE_MIN,
    justifyContent: 'center',
  },
  texteLien: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
    textDecorationLine: 'underline',
  },
  texteConfirmerAnnulation: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsSemiBold,
    fontSize: tailles.secondaire,
    textDecorationLine: 'underline',
  },
  carteAlerte: {
    backgroundColor: '#F6E7D8',
    borderRadius: rayons.bouton,
    padding: espaces.m,
    marginHorizontal: espaces.l,
    marginBottom: espaces.s,
  },
  texteAlerte: {
    color: couleurs.ambreAlerte,
    fontFamily: polices.corpsMedium,
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
});
