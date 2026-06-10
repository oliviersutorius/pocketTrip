import { create } from 'zustand';
import type { Participant } from '../types';
import * as db from '../db/database';
import { useExpenseStore } from './expenseStore';

interface ParticipantStore {
  participants: Participant[];
  loadParticipants: (projectId: number) => Promise<void>;
  addParticipant: (projectId: number, name: string) => Promise<void>;
  removeParticipant: (id: number, projectId: number) => Promise<void>;
}

export const useParticipantStore = create<ParticipantStore>((set) => ({
  participants: [],

  loadParticipants: async (projectId) => {
    set({ participants: await db.getParticipants(projectId) });
  },

  addParticipant: async (projectId, name) => {
    await db.addParticipant(projectId, name);
    set({ participants: await db.getParticipants(projectId) });
    useExpenseStore.getState().invalidate();
  },

  removeParticipant: async (id, projectId) => {
    await db.removeParticipant(id);
    set({ participants: await db.getParticipants(projectId) });
    useExpenseStore.getState().invalidate();
  },
}));
