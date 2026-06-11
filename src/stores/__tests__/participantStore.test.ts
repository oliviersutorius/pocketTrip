jest.mock('../../db/database', () => ({
  getParticipants: jest.fn().mockResolvedValue([]),
  addParticipant: jest.fn().mockResolvedValue(1),
  removeParticipant: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../expenseStore', () => ({
  useExpenseStore: {
    getState: jest.fn().mockReturnValue({ invalidate: jest.fn() }),
  },
}));

import * as db from '../../db/database';
import { useParticipantStore } from '../participantStore';
import { useExpenseStore } from '../expenseStore';
import type { Participant } from '../../types';

const mockDb = db as jest.Mocked<typeof db>;

function makeParticipant(id: number, name = 'Alice'): Participant {
  return { id, project_id: 1, name };
}

describe('useParticipantStore', () => {
  let mockInvalidate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInvalidate = jest.fn();
    (useExpenseStore.getState as jest.Mock).mockReturnValue({ invalidate: mockInvalidate });
    useParticipantStore.setState({ participants: [] });
  });

  describe('loadParticipants', () => {
    it('charge les participants et met à jour le state', async () => {
      const participants = [makeParticipant(1), makeParticipant(2, 'Bob')];
      mockDb.getParticipants.mockResolvedValueOnce(participants);

      await useParticipantStore.getState().loadParticipants(1);

      expect(mockDb.getParticipants).toHaveBeenCalledWith(1);
      expect(useParticipantStore.getState().participants).toEqual(participants);
    });

    it('écrase les participants précédents lors d\'un rechargement', async () => {
      useParticipantStore.setState({ participants: [makeParticipant(99)] });
      mockDb.getParticipants.mockResolvedValueOnce([makeParticipant(1)]);

      await useParticipantStore.getState().loadParticipants(1);

      expect(useParticipantStore.getState().participants).toEqual([makeParticipant(1)]);
    });
  });

  describe('addParticipant', () => {
    it('appelle db.addParticipant, rafraîchit la liste et invalide expenseStore', async () => {
      const added = makeParticipant(1, 'Alice');
      mockDb.getParticipants.mockResolvedValueOnce([added]);

      await useParticipantStore.getState().addParticipant(1, 'Alice');

      expect(mockDb.addParticipant).toHaveBeenCalledWith(1, 'Alice');
      expect(useParticipantStore.getState().participants).toEqual([added]);
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });

  describe('removeParticipant', () => {
    it('appelle db.removeParticipant, rafraîchit la liste et invalide expenseStore', async () => {
      useParticipantStore.setState({ participants: [makeParticipant(1), makeParticipant(2, 'Bob')] });
      mockDb.getParticipants.mockResolvedValueOnce([makeParticipant(2, 'Bob')]);

      await useParticipantStore.getState().removeParticipant(1, 1);

      expect(mockDb.removeParticipant).toHaveBeenCalledWith(1);
      expect(useParticipantStore.getState().participants).toEqual([makeParticipant(2, 'Bob')]);
      expect(mockInvalidate).toHaveBeenCalled();
    });
  });
});
