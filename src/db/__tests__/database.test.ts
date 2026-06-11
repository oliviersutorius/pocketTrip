jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  }),
}));

import { buildCategorySummary } from '../database';

describe('buildCategorySummary', () => {
  it('retourne un tableau vide pour des lignes vides', () => {
    expect(buildCategorySummary([])).toEqual([]);
  });

  it('construit un CategorySummary avec ses sous-catégories', () => {
    const rows = [
      { category_id: 1, category_name: 'Transports', subcategory_id: 1, subcategory_name: 'Avion', total: 200 },
      { category_id: 1, category_name: 'Transports', subcategory_id: 2, subcategory_name: 'Train', total: 50 },
    ];
    const result = buildCategorySummary(rows);

    expect(result).toHaveLength(1);
    expect(result[0].category_id).toBe(1);
    expect(result[0].category_name).toBe('Transports');
    expect(result[0].subcategories).toHaveLength(2);
  });

  it('calcule le total comme somme des sous-catégories', () => {
    const rows = [
      { category_id: 1, category_name: 'Transports', subcategory_id: 1, subcategory_name: 'Avion', total: 200 },
      { category_id: 1, category_name: 'Transports', subcategory_id: 2, subcategory_name: 'Train', total: 50 },
    ];
    expect(buildCategorySummary(rows)[0].total).toBe(250);
  });

  it('construit plusieurs CategorySummary pour des catégories différentes', () => {
    const rows = [
      { category_id: 1, category_name: 'Transports', subcategory_id: 1, subcategory_name: 'Avion', total: 200 },
      { category_id: 2, category_name: 'Nourriture', subcategory_id: 3, subcategory_name: 'Restaurant', total: 80 },
    ];
    const result = buildCategorySummary(rows);

    expect(result).toHaveLength(2);
    expect(result[0].category_id).toBe(1);
    expect(result[1].category_id).toBe(2);
  });

  it('inclut les sous-catégories avec total 0 (non filtrées ici)', () => {
    const rows = [
      { category_id: 1, category_name: 'Transports', subcategory_id: 1, subcategory_name: 'Avion', total: 0 },
    ];
    const result = buildCategorySummary(rows);

    expect(result[0].subcategories[0].total).toBe(0);
    expect(result[0].total).toBe(0);
  });

  it('calcule correctement le total pour 3 sous-catégories', () => {
    const rows = [
      { category_id: 1, category_name: 'Transports', subcategory_id: 1, subcategory_name: 'Avion', total: 100 },
      { category_id: 1, category_name: 'Transports', subcategory_id: 2, subcategory_name: 'Train', total: 150 },
      { category_id: 1, category_name: 'Transports', subcategory_id: 3, subcategory_name: 'Bus', total: 50 },
    ];
    expect(buildCategorySummary(rows)[0].total).toBe(300);
  });

  it('conserve l\'ordre des catégories tel que reçu', () => {
    const rows = [
      { category_id: 3, category_name: 'Visites', subcategory_id: 5, subcategory_name: 'Musée', total: 20 },
      { category_id: 1, category_name: 'Transports', subcategory_id: 1, subcategory_name: 'Avion', total: 100 },
    ];
    const result = buildCategorySummary(rows);

    expect(result[0].category_id).toBe(3);
    expect(result[1].category_id).toBe(1);
  });

  it('peuple correctement les champs de chaque SubcategorySummary', () => {
    const rows = [
      { category_id: 1, category_name: 'Transports', subcategory_id: 2, subcategory_name: 'Train', total: 75 },
    ];
    const sub = buildCategorySummary(rows)[0].subcategories[0];

    expect(sub.subcategory_id).toBe(2);
    expect(sub.subcategory_name).toBe('Train');
    expect(sub.total).toBe(75);
  });
});
