jest.mock('../../db/database', () => ({
  getExpenses: jest.fn().mockResolvedValue([]),
  getCategorySummary: jest.fn().mockResolvedValue([]),
  getParticipantSummary: jest.fn().mockResolvedValue([]),
  getExpenseWithDetails: jest.fn().mockResolvedValue(null),
  createExpense: jest.fn().mockResolvedValue(1),
  updateExpense: jest.fn().mockResolvedValue(undefined),
  deleteExpense: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

import * as db from '../../db/database';
import { Alert } from 'react-native';
import { sortExpenses, useExpenseStore } from '../expenseStore';
import type { ExpenseWithDetails, CategorySummary } from '../../types';

const mockDb = db as jest.Mocked<typeof db>;

function makeExpense(id: number, date: string, created_at: string): ExpenseWithDetails {
  return {
    id,
    project_id: 1,
    subcategory_id: 1,
    participant_id: null,
    amount: 10,
    currency: 'EUR',
    date,
    comment: null,
    created_at,
    category_name: 'Transports',
    subcategory_name: 'Avion',
    participant_name: null,
  };
}

describe('sortExpenses', () => {
  it('trie par date décroissante', () => {
    const expenses = [
      makeExpense(1, '2024-01-01', '2024-01-01T10:00:00.000Z'),
      makeExpense(2, '2024-01-03', '2024-01-03T10:00:00.000Z'),
      makeExpense(3, '2024-01-02', '2024-01-02T10:00:00.000Z'),
    ];
    const sorted = sortExpenses(expenses);
    expect(sorted.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it('trie par created_at décroissant à date égale', () => {
    const expenses = [
      makeExpense(1, '2024-01-01', '2024-01-01T08:00:00.000Z'),
      makeExpense(2, '2024-01-01', '2024-01-01T12:00:00.000Z'),
      makeExpense(3, '2024-01-01', '2024-01-01T10:00:00.000Z'),
    ];
    const sorted = sortExpenses(expenses);
    expect(sorted.map((e) => e.id)).toEqual([2, 3, 1]);
  });

  it('ne modifie pas le tableau original (immutabilité)', () => {
    const expenses = [
      makeExpense(1, '2024-01-01', '2024-01-01T10:00:00.000Z'),
      makeExpense(2, '2024-01-02', '2024-01-02T10:00:00.000Z'),
    ];
    const copy = [...expenses];
    sortExpenses(expenses);
    expect(expenses).toEqual(copy);
  });

  it('retourne un tableau vide si l\'entrée est vide', () => {
    expect(sortExpenses([])).toEqual([]);
  });

  it('retourne un tableau d\'un élément inchangé', () => {
    const expense = makeExpense(1, '2024-01-01', '2024-01-01T10:00:00.000Z');
    expect(sortExpenses([expense])).toEqual([expense]);
  });

  it('gère des dépenses avec date ET created_at identiques', () => {
    const e1 = makeExpense(1, '2024-06-01', '2024-06-01T09:00:00.000Z');
    const e2 = makeExpense(2, '2024-06-01', '2024-06-01T09:00:00.000Z');
    const sorted = sortExpenses([e1, e2]);
    expect(sorted).toHaveLength(2);
  });
});

describe('useExpenseStore', () => {
  beforeEach(() => {
    useExpenseStore.setState({
      expenses: [],
      summary: [],
      participantSummary: [],
      totalSpent: 0,
      loadedForProjectId: null,
      isLoading: false,
    });
    jest.clearAllMocks();
  });

  function makeSummary(total: number, id = 1): CategorySummary {
    return { category_id: id, category_name: 'Transports', total, subcategories: [] };
  }

  describe('loadExpenses', () => {
    it('ne recharge pas si le projet est déjà chargé', async () => {
      useExpenseStore.setState({ loadedForProjectId: 1 });
      await useExpenseStore.getState().loadExpenses(1);
      expect(mockDb.getExpenses).not.toHaveBeenCalled();
    });

    it('charge les dépenses et met à jour le state', async () => {
      const expenses = [makeExpense(1, '2024-01-01', '2024-01-01T10:00:00.000Z')];
      const summary = [makeSummary(42)];
      mockDb.getExpenses.mockResolvedValueOnce(expenses);
      mockDb.getCategorySummary.mockResolvedValueOnce(summary);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      await useExpenseStore.getState().loadExpenses(1);

      const state = useExpenseStore.getState();
      expect(state.expenses).toEqual(expenses);
      expect(state.summary).toEqual(summary);
      expect(state.totalSpent).toBe(42);
      expect(state.loadedForProjectId).toBe(1);
      expect(state.isLoading).toBe(false);
    });

    it('calcule totalSpent comme somme des totaux de toutes les catégories', async () => {
      mockDb.getExpenses.mockResolvedValueOnce([]);
      mockDb.getCategorySummary.mockResolvedValueOnce([makeSummary(100, 1), makeSummary(50, 2)]);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      await useExpenseStore.getState().loadExpenses(2);

      expect(useExpenseStore.getState().totalSpent).toBe(150);
    });

    it('remet isLoading à false en cas d\'erreur db', async () => {
      mockDb.getExpenses.mockRejectedValueOnce(new Error('DB error'));
      await useExpenseStore.getState().loadExpenses(3);
      expect(useExpenseStore.getState().isLoading).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('remet loadedForProjectId à null', () => {
      useExpenseStore.setState({ loadedForProjectId: 5 });
      useExpenseStore.getState().invalidate();
      expect(useExpenseStore.getState().loadedForProjectId).toBeNull();
    });
  });

  describe('addExpense', () => {
    const expenseData = {
      project_id: 1,
      subcategory_id: 1,
      participant_id: null,
      amount: 25,
      currency: 'EUR',
      date: '2024-06-01',
      comment: null,
    };

    it('ajoute la dépense en tête de liste et retourne true', async () => {
      const newExpense = makeExpense(10, '2024-06-01', '2024-06-01T12:00:00.000Z');
      mockDb.createExpense.mockResolvedValueOnce(10);
      mockDb.getExpenseWithDetails.mockResolvedValueOnce(newExpense);
      mockDb.getCategorySummary.mockResolvedValueOnce([makeSummary(25)]);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      const result = await useExpenseStore.getState().addExpense(expenseData);

      expect(result).toBe(true);
      expect(useExpenseStore.getState().expenses).toContainEqual(newExpense);
      expect(useExpenseStore.getState().totalSpent).toBe(25);
      expect(useExpenseStore.getState().isLoading).toBe(false);
    });

    it('laisse la liste inchangée si getExpenseWithDetails retourne null, et retourne true', async () => {
      mockDb.createExpense.mockResolvedValueOnce(99);
      mockDb.getExpenseWithDetails.mockResolvedValueOnce(null);
      mockDb.getCategorySummary.mockResolvedValueOnce([]);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      const result = await useExpenseStore.getState().addExpense(expenseData);

      expect(result).toBe(true);
      expect(useExpenseStore.getState().expenses).toEqual([]);
    });

    it('affiche une alerte et retourne false en cas d\'erreur db', async () => {
      mockDb.createExpense.mockRejectedValueOnce(new Error('DB error'));

      const result = await useExpenseStore.getState().addExpense(expenseData);

      expect(result).toBe(false);
      expect(useExpenseStore.getState().isLoading).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('updateExpense', () => {
    const updateData = {
      subcategory_id: 2,
      participant_id: null,
      amount: 50,
      currency: 'EUR',
      date: '2024-06-01',
      comment: 'modifié',
    };

    it('remplace la dépense dans la liste, met à jour les totaux et retourne true', async () => {
      const existing = makeExpense(1, '2024-06-01', '2024-06-01T10:00:00.000Z');
      const updated = { ...existing, amount: 50, comment: 'modifié' };
      useExpenseStore.setState({ expenses: [existing] });

      mockDb.getExpenseWithDetails.mockResolvedValueOnce(updated);
      mockDb.getCategorySummary.mockResolvedValueOnce([makeSummary(50)]);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      const result = await useExpenseStore.getState().updateExpense(1, 1, updateData);

      expect(result).toBe(true);
      expect(useExpenseStore.getState().expenses[0]).toEqual(updated);
      expect(useExpenseStore.getState().totalSpent).toBe(50);
      expect(useExpenseStore.getState().isLoading).toBe(false);
    });

    it('conserve la liste inchangée si getExpenseWithDetails retourne null et retourne true', async () => {
      const existing = makeExpense(1, '2024-06-01', '2024-06-01T10:00:00.000Z');
      useExpenseStore.setState({ expenses: [existing] });

      mockDb.getExpenseWithDetails.mockResolvedValueOnce(null);
      mockDb.getCategorySummary.mockResolvedValueOnce([]);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      const result = await useExpenseStore.getState().updateExpense(1, 1, updateData);

      expect(result).toBe(true);
      expect(useExpenseStore.getState().expenses).toEqual([existing]);
    });

    it('affiche une alerte et retourne false en cas d\'erreur db', async () => {
      mockDb.updateExpense.mockRejectedValueOnce(new Error('DB error'));

      const result = await useExpenseStore.getState().updateExpense(1, 1, updateData);

      expect(result).toBe(false);
      expect(useExpenseStore.getState().isLoading).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('deleteExpense', () => {
    it('retire la dépense de la liste, met à jour les totaux et retourne true', async () => {
      const expense = makeExpense(1, '2024-06-01', '2024-06-01T10:00:00.000Z');
      useExpenseStore.setState({ expenses: [expense] });

      mockDb.getCategorySummary.mockResolvedValueOnce([makeSummary(0)]);
      mockDb.getParticipantSummary.mockResolvedValueOnce([]);

      const result = await useExpenseStore.getState().deleteExpense(1, 1);

      expect(result).toBe(true);
      expect(useExpenseStore.getState().expenses).toEqual([]);
      expect(useExpenseStore.getState().isLoading).toBe(false);
    });

    it('affiche une alerte et retourne false en cas d\'erreur db', async () => {
      mockDb.deleteExpense.mockRejectedValueOnce(new Error('DB error'));

      const result = await useExpenseStore.getState().deleteExpense(1, 1);

      expect(result).toBe(false);
      expect(useExpenseStore.getState().isLoading).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });
  });
});
