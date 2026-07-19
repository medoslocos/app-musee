import { describe, expect, it } from 'vitest';
import {
  formaterCentimes,
  formaterCentimesArrondis,
  formaterMilligrammes,
  poidsEnMilligrammes,
} from '../monnaie';

// Intl insère des espaces insécables (fines) dans le format fr-FR ; on les
// normalise pour que les tests restent lisibles.
function normaliser(texte: string): string {
  return texte.replace(/[  ]/g, ' ');
}

describe('poidsEnMilligrammes', () => {
  it('convertit virgule et point en milligrammes entiers', () => {
    expect(poidsEnMilligrammes('12,4')).toBe(12400);
    expect(poidsEnMilligrammes('12.4')).toBe(12400);
    expect(poidsEnMilligrammes('0,001')).toBe(1);
    expect(poidsEnMilligrammes('10000')).toBe(10_000_000);
    expect(poidsEnMilligrammes(' 7 ')).toBe(7000);
  });

  it('refuse les poids mal formés', () => {
    for (const poids of ['', 'abc', '1,2345', '1.2.3', '-5', '1e3', '12,']) {
      expect(() => poidsEnMilligrammes(poids)).toThrow('Poids invalide');
    }
  });

  it('refuse zéro et les poids au-delà de 10 kg', () => {
    expect(() => poidsEnMilligrammes('0')).toThrow('Poids hors limites');
    expect(() => poidsEnMilligrammes('10000,001')).toThrow('Poids hors limites');
  });
});

describe('formatage', () => {
  it('formate les centimes en euros fr-FR', () => {
    expect(normaliser(formaterCentimes(63240))).toBe('632,40 €');
    expect(normaliser(formaterCentimes(123456))).toBe('1 234,56 €');
    expect(normaliser(formaterCentimes(0))).toBe('0,00 €');
  });

  it('formate les montants arrondis sans décimales', () => {
    expect(normaliser(formaterCentimesArrondis(63240))).toBe('632 €');
    expect(normaliser(formaterCentimesArrondis(63250))).toBe('633 €');
  });

  it('refuse les montants non entiers', () => {
    expect(() => formaterCentimes(12.5)).toThrow('Montant invalide');
  });

  it('formate les milligrammes en grammes fr-FR', () => {
    expect(normaliser(formaterMilligrammes(12400))).toBe('12,4 g');
    expect(normaliser(formaterMilligrammes(1))).toBe('0,001 g');
    expect(normaliser(formaterMilligrammes(1000))).toBe('1 g');
  });
});
