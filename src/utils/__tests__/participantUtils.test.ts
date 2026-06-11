import { prepareParticipantName } from '../participantUtils';

describe('prepareParticipantName', () => {
  describe('nom valide → retourne le nom préparé', () => {
    it('retourne le nom trimmé pour une saisie valide', () => {
      expect(prepareParticipantName('Alice', [])).toBe('Alice');
    });

    it('supprime les espaces en début et fin', () => {
      expect(prepareParticipantName('  Bob  ', [])).toBe('Bob');
    });

    it('tronque à 100 caractères un nom de 101 caractères', () => {
      const result = prepareParticipantName('A'.repeat(101), []);
      expect(result).toBe('A'.repeat(100));
    });

    it('accepte un nom de exactement 100 caractères', () => {
      const name = 'A'.repeat(100);
      expect(prepareParticipantName(name, [])).toBe(name);
    });

    it('accepte un nom nouveau même si la liste est non vide', () => {
      expect(prepareParticipantName('Charlie', [{ name: 'Alice' }, { name: 'Bob' }])).toBe('Charlie');
    });
  });

  describe('saisie vide → retourne null', () => {
    it('retourne null pour une chaîne vide', () => {
      expect(prepareParticipantName('', [])).toBeNull();
    });

    it('retourne null pour une chaîne d\'espaces', () => {
      expect(prepareParticipantName('   ', [])).toBeNull();
    });
  });

  describe('doublon → retourne null', () => {
    it('retourne null si le nom existe déjà (même casse)', () => {
      expect(prepareParticipantName('Alice', [{ name: 'Alice' }])).toBeNull();
    });

    it('retourne null si le nom existe en majuscules', () => {
      expect(prepareParticipantName('ALICE', [{ name: 'alice' }])).toBeNull();
    });

    it('retourne null si le nom existe en minuscules', () => {
      expect(prepareParticipantName('alice', [{ name: 'ALICE' }])).toBeNull();
    });

    it('retourne null si le nom est identique après trim', () => {
      expect(prepareParticipantName('  Alice  ', [{ name: 'Alice' }])).toBeNull();
    });
  });
});
