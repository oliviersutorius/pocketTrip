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
  loadExpenses: (projectId: number) => void;
  invalidate: () => void;
  addExpense: (data: { project_id: number; subcategory_id: number; participant_id: number | null; amount: number; currency: string; date: string; comment: string | null }) => void;
  updateExpense: (id: number, projectId: number, data: { subcategory_id: number; participant_id: number | null; amount: number; currency: string; date: string; comment: string | null }) => void;
  deleteExpense: (id: number, projectId: number) => void;
}

function reload(projectId: number) {
  const summary = db.getCategorySummary(projectId);
  return {
    expenses: db.getExpenses(projectId),
    summary,
    participantSummary: db.getParticipantSummary(projectId),
    totalSpent: summary.reduce((sum, c) => sum + c.total, 0),
    loadedForProjectId: projectId,
  };
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  expenses: [],
  summary: [],
  participantSummary: [],
  totalSpent: 0,
  loadedForProjectId: null,

  loadExpenses: (projectId) => {
    if (get().loadedForProjectId === projectId) return;
    set(reload(projectId));
  },

  invalidate: () => set({ loadedForProjectId: null }),

  addExpense: (data) => {
    try {
      db.createExpense(data);
      set(reload(data.project_id));
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer la dépense.");
    }
  },

  updateExpense: (id, projectId, data) => {
    try {
      db.updateExpense(id, data);
      set(reload(projectId));
    } catch {
      Alert.alert('Erreur', "Impossible de modifier la dépense.");
    }
  },

  deleteExpense: (id, projectId) => {
    try {
      db.deleteExpense(id);
      set(reload(projectId));
    } catch {
      Alert.alert('Erreur', "Impossible de supprimer la dépense.");
    }
  },
}));
