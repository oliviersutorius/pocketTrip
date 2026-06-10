import { create } from 'zustand';
import type { Project } from '../types';
import * as db from '../db/database';

interface ProjectStore {
  projects: Project[];
  selectedProjectId: number | null;
  loadProjects: () => Promise<void>;
  selectProject: (id: number) => void;
  createProject: (data: Omit<Project, 'id' | 'created_at'>) => Promise<number>;
  updateProject: (id: number, data: Omit<Project, 'id' | 'created_at'>) => Promise<void>;
  deleteProject: (id: number) => Promise<void>;
  getSelectedProject: () => Project | undefined;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProjectId: null,

  loadProjects: async () => {
    set({ projects: await db.getProjects() });
  },

  selectProject: (id) => {
    set({ selectedProjectId: id });
  },

  createProject: async (data) => {
    const id = await db.createProject(data);
    set({ projects: await db.getProjects() });
    return id;
  },

  updateProject: async (id, data) => {
    await db.updateProject(id, data);
    set({ projects: await db.getProjects() });
  },

  deleteProject: async (id) => {
    await db.deleteProject(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    }));
  },

  getSelectedProject: () => {
    const { projects, selectedProjectId } = get();
    return projects.find((p) => p.id === selectedProjectId);
  },
}));
