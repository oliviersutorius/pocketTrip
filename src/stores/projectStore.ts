import { create } from 'zustand';
import type { Project } from '../types';
import * as db from '../db/database';

interface ProjectStore {
  projects: Project[];
  selectedProjectId: number | null;
  loadProjects: () => void;
  selectProject: (id: number) => void;
  createProject: (data: Omit<Project, 'id' | 'created_at'>) => number;
  updateProject: (id: number, data: Omit<Project, 'id' | 'created_at'>) => void;
  deleteProject: (id: number) => void;
  getSelectedProject: () => Project | undefined;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  selectedProjectId: null,

  loadProjects: () => {
    set({ projects: db.getProjects() });
  },

  selectProject: (id) => {
    set({ selectedProjectId: id });
  },

  createProject: (data) => {
    const id = db.createProject(data);
    set({ projects: db.getProjects() });
    return id;
  },

  updateProject: (id, data) => {
    db.updateProject(id, data);
    set({ projects: db.getProjects() });
  },

  deleteProject: (id) => {
    db.deleteProject(id);
    set((state) => ({
      projects: db.getProjects(),
      selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
    }));
  },

  getSelectedProject: () => {
    const { projects, selectedProjectId } = get();
    return projects.find((p) => p.id === selectedProjectId);
  },
}));
