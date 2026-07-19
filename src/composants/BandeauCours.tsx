import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CoursAvecProvenance } from '../cours/service-cours';
import { formaterCentimes } from '../domaine/monnaie';
import { LIBELLES_METAUX } from '../domaine/metaux';
import { couleurs, espaces, polices, rayons, tailles } from '../design/tokens';

/** « cours du 19/07 à 14h05 » */
export function formaterHeureCours(horodatageIso: string): string {
  const date = new Date(horodatageIso);
  const jour = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(date);
  const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .format(date)
    .replace(':', 'h');
  return `cours du ${jour} à ${heure}`;
}

interface Props {
  cours: CoursAvecProvenance;
}

/** Bandeau discret sous la saisie : cours utilisé, heure, et alerte si hors-ligne. */
export function BandeauCours({ cours }: Props): React.JSX.Element {
  const horsLigne = cours.provenance === 'dernier-connu';
  return (
    <View style={[styles.bandeau, horsLigne && styles.bandeauAlerte]}>
      <Text style={[styles.texte, horsLigne && styles.texteAlerte]}>
        {LIBELLES_METAUX[cours.cours.metal]} pur : {formaterCentimes(cours.cours.centimesParGramme)}/g
        {' — '}
        {formaterHeureCours(cours.cours.horodatageIso)}
      </Text>
      {horsLigne && (
        <Text style={[styles.texte, styles.texteAlerte]}>
          Cours en direct indisponible — dernier cours connu utilisé
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bandeau: {
    borderRadius: rayons.bouton,
    backgroundColor: couleurs.craieProfonde,
    paddingHorizontal: espaces.m,
    paddingVertical: espaces.s,
    gap: espaces.xs,
  },
  bandeauAlerte: {
    backgroundColor: '#F6E7D8',
  },
  texte: {
    color: couleurs.grisEtain,
    fontFamily: polices.corpsMedium,
    fontSize: tailles.secondaire,
  },
  texteAlerte: {
    color: couleurs.ambreAlerte,
  },
});
