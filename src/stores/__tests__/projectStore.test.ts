jest.mock('../../db/database', () => ({
  getProjects: jest.fn().mockResolvedValue([]),
  createProject: jest.fn().mockResolvedValue(1),
  updateProject: jest.fn().mockResolvedValue(undefined),
  deleteProject: jest.fn().mockResolvedValue(undefined),
}));

import * as db from '../../db/database';
import { useProjectStore } from '../projectStore';
import type { Project } from '../../types';

const mockDb = db as jest.Mocked<typeof db>;

function makeProject(id: number, name = 'Rome 2026'): Project {
  return {
    id,
    name,
    start_date: '2026-04-01',
    end_date: '2026-04-07',
    initial_budget: 1000,
    currency: 'EUR',
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('useProjectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], selectedProjectId: null });
    jest.clearAllMocks();
  });

  describe('loadProjects', () => {
    it('charge les projets et met à jour le state', async () => {
      const projects = [makeProject(1), makeProject(2, 'Paris 2027')];
      mockDb.getProjects.mockResolvedValueOnce(projects);

      await useProjectStore.getState().loadProjects();

      expect(useProjectStore.getState().projects).toEqual(projects);
    });

    it('écrase les projets existants lors d\'un rechargement', async () => {
      useProjectStore.setState({ projects: [makeProject(99)] });
      mockDb.getProjects.mockResolvedValueOnce([makeProject(1)]);

      await useProjectStore.getState().loadProjects();

      expect(useProjectStore.getState().projects).toEqual([makeProject(1)]);
    });
  });

  describe('createProject', () => {
    it('appelle db.createProject, rafraîchit la liste et retourne l\'id', async () => {
      const project = makeProject(5, 'Tokyo 2027');
      mockDb.createProject.mockResolvedValueOnce(5);
      mockDb.getProjects.mockResolvedValueOnce([project]);

      const { name, start_date, end_date, initial_budget, currency } = project;
      const id = await useProjectStore.getState().createProject({ name, start_date, end_date, initial_budget, currency });

      expect(id).toBe(5);
      expect(useProjectStore.getState().projects).toEqual([project]);
    });
  });

  describe('updateProject', () => {
    it('appelle db.updateProject avec les bonnes données et rafraîchit la liste', async () => {
      const updated = makeProject(1, 'Tokyo 2027');
      mockDb.getProjects.mockResolvedValueOnce([updated]);

      const { name, start_date, end_date, initial_budget, currency } = updated;
      await useProjectStore.getState().updateProject(1, { name, start_date, end_date, initial_budget, currency });

      expect(mockDb.updateProject).toHaveBeenCalledWith(1, expect.objectContaining({ name: 'Tokyo 2027' }));
      expect(useProjectStore.getState().projects).toEqual([updated]);
    });
  });

  describe('deleteProject', () => {
    it('retire le projet supprimé de la liste', async () => {
      useProjectStore.setState({ projects: [makeProject(1), makeProject(2, 'Berlin')] });

      await useProjectStore.getState().deleteProject(1);

      expect(useProjectStore.getState().projects.map((p) => p.id)).toEqual([2]);
    });

    it('remet selectedProjectId à null si c\'est le projet supprimé', async () => {
      useProjectStore.setState({ projects: [makeProject(1)], selectedProjectId: 1 });

      await useProjectStore.getState().deleteProject(1);

      expect(useProjectStore.getState().selectedProjectId).toBeNull();
    });

    it('conserve selectedProjectId si ce n\'est pas le projet supprimé', async () => {
      useProjectStore.setState({ projects: [makeProject(1), makeProject(2)], selectedProjectId: 2 });

      await useProjectStore.getState().deleteProject(1);

      expect(useProjectStore.getState().selectedProjectId).toBe(2);
    });
  });

  describe('selectProject', () => {
    it('définit selectedProjectId', () => {
      useProjectStore.getState().selectProject(42);
      expect(useProjectStore.getState().selectedProjectId).toBe(42);
    });
  });

  describe('getSelectedProject', () => {
    it('retourne le projet correspondant à selectedProjectId', () => {
      const target = makeProject(3, 'Lisbonne');
      useProjectStore.setState({ projects: [makeProject(1), target], selectedProjectId: 3 });

      expect(useProjectStore.getState().getSelectedProject()).toEqual(target);
    });

    it('retourne undefined si selectedProjectId est null', () => {
      useProjectStore.setState({ projects: [makeProject(1)], selectedProjectId: null });

      expect(useProjectStore.getState().getSelectedProject()).toBeUndefined();
    });

    it('retourne undefined si selectedProjectId ne correspond à aucun projet', () => {
      useProjectStore.setState({ projects: [makeProject(1)], selectedProjectId: 99 });

      expect(useProjectStore.getState().getSelectedProject()).toBeUndefined();
    });
  });
});
