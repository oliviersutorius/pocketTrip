import { parseAmount } from '../validation';

describe('parseAmount', () => {
  describe('valeurs valides', () => {
    it('parse un entier', () => {
      expect(parseAmount('100')).toBe(100);
    });

    it('parse un décimal avec point', () => {
      expect(parseAmount('12.50')).toBe(12.5);
    });

    it('parse un décimal avec virgule (format FR)', () => {
      expect(parseAmount('12,50')).toBe(12.5);
    });

    it('parse un très petit montant', () => {
      expect(parseAmount('0.01')).toBe(0.01);
    });

    it('parse le montant maximum (1 000 000)', () => {
      expect(parseAmount('1000000')).toBe(1_000_000);
    });

    it('parse zéro (la validation métier le rejette, pas parseAmount)', () => {
      expect(parseAmount('0')).toBe(0);
    });

    it('parse un entier avec zéro initial (01 → 1)', () => {
      expect(parseAmount('01')).toBe(1);
    });
  });

  describe('valeurs invalides → null', () => {
    it('chaîne vide', () => {
      expect(parseAmount('')).toBeNull();
    });

    it('texte alphabétique', () => {
      expect(parseAmount('abc')).toBeNull();
    });

    it('valeur négative', () => {
      expect(parseAmount('-5')).toBeNull();
    });

    it('dépasse le maximum (1 000 001)', () => {
      expect(parseAmount('1000001')).toBeNull();
    });

    it('deux séparateurs décimaux (1.2.3)', () => {
      expect(parseAmount('1.2.3')).toBeNull();
    });

    it('symbole monétaire (10€)', () => {
      expect(parseAmount('10€')).toBeNull();
    });

    it('espace seul', () => {
      expect(parseAmount(' ')).toBeNull();
    });

    it('point en début (.5)', () => {
      expect(parseAmount('.5')).toBeNull();
    });

    it('point en fin sans chiffre (5.)', () => {
      expect(parseAmount('5.')).toBeNull();
    });

    it('mélange lettres et chiffres (12abc)', () => {
      expect(parseAmount('12abc')).toBeNull();
    });

    it('virgule seule', () => {
      expect(parseAmount(',')).toBeNull();
    });
  });
});
