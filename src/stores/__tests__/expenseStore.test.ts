jest.mock('../../db/database', () => ({
  getExpenses: jest.fn().mockResolvedValue([]),
  getCategorySummary: jest.fn().mockResolvedValue([]),
  getParticipantSummary: jest.fn().mockResolvedValue([]),
  getExpenseWithDetails: jest.fn().mockResolvedValue(null),
  createExpense: jest.fn().mockResolvedValue(1),
  updateExpense: jest.fn().mockResolvedValue(undefined),
  deleteExpense: jest.fn().mockResolvedValue(undefined),
}));

import { sortExpenses } from '../expenseStore';
import type { ExpenseWithDetails } from '../../types';

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
