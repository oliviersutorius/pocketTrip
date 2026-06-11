import { validateExpense } from '../expenseValidation';

describe('validateExpense', () => {
  describe('données valides → aucune erreur', () => {
    it('retourne un objet vide pour des données correctes', () => {
      expect(validateExpense('25.50', 1, 3)).toEqual({});
    });

    it('accepte un montant avec virgule (format FR)', () => {
      expect(validateExpense('25,50', 1, 3)).toEqual({});
    });

    it('accepte un très petit montant (0.01)', () => {
      expect(validateExpense('0.01', 1, 3)).toEqual({});
    });
  });

  describe('montant invalide', () => {
    it('erreur si le montant est une chaîne vide', () => {
      const e = validateExpense('', 1, 3);
      expect(e.amount).toBeDefined();
    });

    it('erreur si le montant est zéro', () => {
      const e = validateExpense('0', 1, 3);
      expect(e.amount).toBeDefined();
    });

    it('erreur si le montant est négatif', () => {
      const e = validateExpense('-10', 1, 3);
      expect(e.amount).toBeDefined();
    });

    it('erreur si le montant contient du texte', () => {
      const e = validateExpense('abc', 1, 3);
      expect(e.amount).toBeDefined();
    });
  });

  describe('catégorie manquante', () => {
    it('erreur si categoryId est null', () => {
      const e = validateExpense('25', null, 3);
      expect(e.category).toBeDefined();
    });
  });

  describe('sous-catégorie manquante', () => {
    it('erreur si subcategoryId est null', () => {
      const e = validateExpense('25', 1, null);
      expect(e.subcategory).toBeDefined();
    });
  });

  describe('erreurs multiples', () => {
    it('rapporte toutes les erreurs simultanément', () => {
      const e = validateExpense('', null, null);
      expect(e.amount).toBeDefined();
      expect(e.category).toBeDefined();
      expect(e.subcategory).toBeDefined();
    });
  });
});
