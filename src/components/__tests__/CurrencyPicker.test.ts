import { getCurrencySymbol } from '../CurrencyPicker';

describe('getCurrencySymbol', () => {
  it('retourne € pour EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('retourne $ pour USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('retourne £ pour GBP', () => {
    expect(getCurrencySymbol('GBP')).toBe('£');
  });

  it('retourne CHF pour CHF (symbole multi-caractères sans $)', () => {
    expect(getCurrencySymbol('CHF')).toBe('CHF');
  });

  it('retourne CA$ pour CAD (symbole composite)', () => {
    expect(getCurrencySymbol('CAD')).toBe('CA$');
  });

  it('retourne A$ pour AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('A$');
  });

  it('retourne ¥ pour JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('retourne ₹ pour INR', () => {
    expect(getCurrencySymbol('INR')).toBe('₹');
  });

  it('retourne le code lui-même pour un code inconnu', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });

  it('retourne le code lui-même pour une chaîne vide', () => {
    expect(getCurrencySymbol('')).toBe('');
  });
});
