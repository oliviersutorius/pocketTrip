import { validateProject } from '../projectValidation';

const D = (s: string) => new Date(s);

describe('validateProject', () => {
  const start = D('2026-04-01');
  const end = D('2026-04-07');

  describe('champs valides → aucune erreur', () => {
    it('retourne un objet vide pour des données correctes', () => {
      expect(validateProject('Rome 2026', start, end, '1000')).toEqual({});
    });

    it('accepte un budget avec virgule (format FR)', () => {
      expect(validateProject('Rome', start, end, '1500,50')).toEqual({});
    });

    it('accepte un budget minimal de 0.01', () => {
      expect(validateProject('Rome', start, end, '0.01')).toEqual({});
    });

    it('accepte un nom de exactement 100 caractères', () => {
      expect(validateProject('A'.repeat(100), start, end, '500')).toEqual({});
    });

    it('accepte des dates de début et fin identiques', () => {
      expect(validateProject('Rome', start, start, '500')).toEqual({});
    });
  });

  describe('nom invalide', () => {
    it('erreur si le nom est vide', () => {
      const e = validateProject('', start, end, '1000');
      expect(e.name).toBeDefined();
    });

    it('erreur si le nom est uniquement des espaces', () => {
      const e = validateProject('   ', start, end, '1000');
      expect(e.name).toBeDefined();
    });

    it('erreur si le nom dépasse 100 caractères', () => {
      const e = validateProject('A'.repeat(101), start, end, '1000');
      expect(e.name).toBeDefined();
    });
  });

  describe('date invalide', () => {
    it('erreur si la date de fin est avant la date de début', () => {
      const e = validateProject('Rome', end, start, '1000');
      expect(e.endDate).toBeDefined();
    });
  });

  describe('budget invalide', () => {
    it('erreur si le budget est zéro', () => {
      const e = validateProject('Rome', start, end, '0');
      expect(e.budget).toBeDefined();
    });

    it('erreur si le budget est négatif', () => {
      const e = validateProject('Rome', start, end, '-100');
      expect(e.budget).toBeDefined();
    });

    it('erreur si le budget est vide', () => {
      const e = validateProject('Rome', start, end, '');
      expect(e.budget).toBeDefined();
    });

    it('erreur si le budget contient du texte', () => {
      const e = validateProject('Rome', start, end, 'abc');
      expect(e.budget).toBeDefined();
    });
  });

  describe('erreurs multiples', () => {
    it('rapporte toutes les erreurs simultanément', () => {
      const e = validateProject('', D('2026-04-07'), D('2026-04-01'), '0');
      expect(e.name).toBeDefined();
      expect(e.endDate).toBeDefined();
      expect(e.budget).toBeDefined();
    });
  });
});
