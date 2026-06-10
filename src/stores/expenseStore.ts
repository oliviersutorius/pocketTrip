import { create } from 'zustand';
import { Alert } from 'react-native';
import type { ExpenseWithDetails, CategorySummary, ParticipantSummary } from '../types';
import * as db from '../db/database';

interface ExpenseStore {
  expenses: ExpenseWithDetails[];
  summary: CategorySummary[];
  participantSummary: ParticipantSummary[];
  totalSpent: number;
  loadedForProjectId: number | null;
  isLoading: boolean;
  loadExpenses: (projectId: number) => Promise<void>;
  invalidate: () => void;
  addExpense: (data: { project_id: number; subcategory_id: number; participant_id: number | null; amount: number; currency: string; date: string; comment: string | null }) => Promise<boolean>;
  updateExpense: (id: number, projectId: number, data: { subcategory_id: number; participant_id: number | null; amount: number; currency: string; date: string; comment: string | null }) => Promise<boolean>;
  deleteExpense: (id: number, projectId: number) => Promise<boolean>;
}

export function sortExpenses(expenses: ExpenseWithDetails[]): ExpenseWithDetails[] {
  return [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at)
  );
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  expenses: [],
  summary: [],
  participantSummary: [],
  totalSpent: 0,
  loadedForProjectId: null,
  isLoading: false,

  loadExpenses: async (projectId) => {
    if (get().loadedForProjectId === projectId) return;
    set({ isLoading: true });
    try {
      const [expenses, summary, participantSummary] = await Promise.all([
        db.getExpenses(projectId),
        db.getCategorySummary(projectId),
        db.getParticipantSummary(projectId),
      ]);
      set({
        expenses,
        summary,
        participantSummary,
        totalSpent: summary.reduce((sum, c) => sum + c.total, 0),
        loadedForProjectId: projectId,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  invalidate: () => set({ loadedForProjectId: null }),

  addExpense: async (data) => {
    set({ isLoading: true });
    try {
      const id = await db.createExpense(data);
      const [newExpense, summary, participantSummary] = await Promise.all([
        db.getExpenseWithDetails(id),
        db.getCategorySummary(data.project_id),
        db.getParticipantSummary(data.project_id),
      ]);
      set((state) => ({
        expenses: sortExpenses(newExpense ? [newExpense, ...state.expenses] : state.expenses),
        summary,
        participantSummary,
        totalSpent: summary.reduce((sum, c) => sum + c.total, 0),
        isLoading: false,
      }));
      return true;
    } catch {
      set({ isLoading: false });
      Alert.alert('Erreur', "Impossible d'enregistrer la dépense.");
      return false;
    }
  },

  updateExpense: async (id, projectId, data) => {
    set({ isLoading: true });
    try {
      await db.updateExpense(id, data);
      const [updatedExpense, summary, participantSummary] = await Promise.all([
        db.getExpenseWithDetails(id),
        db.getCategorySummary(projectId),
        db.getParticipantSummary(projectId),
      ]);
      set((state) => ({
        expenses: sortExpenses(
          updatedExpense
            ? state.expenses.map((e) => (e.id === id ? updatedExpense : e))
            : state.expenses
        ),
        summary,
        participantSummary,
        totalSpent: summary.reduce((sum, c) => sum + c.total, 0),
        isLoading: false,
      }));
      return true;
    } catch {
      set({ isLoading: false });
      Alert.alert('Erreur', "Impossible de modifier la dépense.");
      return false;
    }
  },

  deleteExpense: async (id, projectId) => {
    set({ isLoading: true });
    try {
      await db.deleteExpense(id);
      const [summary, participantSummary] = await Promise.all([
        db.getCategorySummary(projectId),
        db.getParticipantSummary(projectId),
      ]);
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
        summary,
        participantSummary,
        totalSpent: summary.reduce((sum, c) => sum + c.total, 0),
        isLoading: false,
      }));
      return true;
    } catch {
      set({ isLoading: false });
      Alert.alert('Erreur', "Impossible de supprimer la dépense.");
      return false;
    }
  },
}));
