import { create } from 'zustand';
import type { Participant } from '../types';
import * as db from '../db/database';
import { useExpenseStore } from './expenseStore';

interface ParticipantStore {
  participants: Participant[];
  loadParticipants: (projectId: number) => void;
  addParticipant: (projectId: number, name: string) => void;
  removeParticipant: (id: number, projectId: number) => void;
}

export const useParticipantStore = create<ParticipantStore>((set) => ({
  participants: [],

  loadParticipants: (projectId) => {
    set({ participants: db.getParticipants(projectId) });
  },

  addParticipant: (projectId, name) => {
    db.addParticipant(projectId, name);
    set({ participants: db.getParticipants(projectId) });
    useExpenseStore.getState().invalidate();
  },

  removeParticipant: (id, projectId) => {
    db.removeParticipant(id);
    set({ participants: db.getParticipants(projectId) });
    useExpenseStore.getState().invalidate();
  },
}));
