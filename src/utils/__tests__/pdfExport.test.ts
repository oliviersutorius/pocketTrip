jest.mock('expo-print');
jest.mock('expo-sharing');

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { escapeHtml, svgPie, exportToPDF } from '../pdfExport';
import type { Project, CategorySummary, ExpenseWithDetails } from '../../types';

describe('escapeHtml', () => {
  it('échappe le &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('échappe le <', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('échappe le >', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('échappe les guillemets doubles', () => {
    expect(escapeHtml('"texte"')).toBe('&quot;texte&quot;');
  });

  it('chaîne sans caractère spécial reste inchangée', () => {
    expect(escapeHtml('Voyage Rome 2026')).toBe('Voyage Rome 2026');
  });

  it('chaîne vide reste vide', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('échappe plusieurs caractères dans une même chaîne', () => {
    expect(escapeHtml('<b>a & b > c "d"</b>')).toBe(
      '&lt;b&gt;a &amp; b &gt; c &quot;d&quot;&lt;/b&gt;'
    );
  });

  it('échappe plusieurs & consécutifs', () => {
    expect(escapeHtml('a && b')).toBe('a &amp;&amp; b');
  });

  it('échappe un commentaire HTML', () => {
    expect(escapeHtml('<!-- commentaire -->')).toBe('&lt;!-- commentaire --&gt;');
  });

  it('échappe une balise script (cas injection XSS)', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });
});

describe('svgPie', () => {
  it('retourne une chaîne vide si le tableau de secteurs est vide', () => {
    expect(svgPie([], 100)).toBe('');
  });

  it('retourne une chaîne vide si tous les secteurs ont la valeur 0', () => {
    expect(svgPie([{ value: 0, color: '#000' }], 100)).toBe('');
  });

  it('retourne un <circle> pour un secteur unique non nul', () => {
    const result = svgPie([{ value: 100, color: '#1A6BAE' }], 100);
    expect(result).toContain('<circle');
    expect(result).not.toContain('<path');
  });

  it('retourne un <circle> si un secteur représente la totalité (les autres à 0)', () => {
    const result = svgPie([
      { value: 100, color: '#1A6BAE' },
      { value: 0, color: '#4CAF50' },
    ], 100);
    expect(result).toContain('<circle');
    expect(result).not.toContain('<path');
  });

  it('retourne des <path> pour plusieurs secteurs de valeurs non nulles', () => {
    const result = svgPie([
      { value: 50, color: '#1A6BAE' },
      { value: 50, color: '#4CAF50' },
    ], 100);
    expect(result).toContain('<path');
    expect(result).not.toContain('<circle');
  });

  it('utilise large-arc-flag=1 pour un secteur supérieur à 180°', () => {
    const result = svgPie([
      { value: 3, color: '#1A6BAE' },
      { value: 1, color: '#4CAF50' },
    ], 100);
    expect(result).toMatch(/A [\d.]+ [\d.]+ 0 1 1/);
  });
});

const project: Project = {
  id: 1,
  name: 'Rome 2026',
  start_date: '2026-04-01',
  end_date: '2026-04-07',
  initial_budget: 1000,
  currency: 'EUR',
  created_at: '2026-01-01T00:00:00.000Z',
};

function makeExpenseForPdf(id: number, categoryName: string, subcategoryName: string): ExpenseWithDetails {
  return {
    id,
    project_id: 1,
    subcategory_id: 1,
    participant_id: null,
    amount: 100,
    currency: 'EUR',
    date: '2026-04-02',
    comment: null,
    created_at: '2026-04-02T10:00:00.000Z',
    category_name: categoryName,
    subcategory_name: subcategoryName,
    participant_name: null,
  };
}

describe('exportToPDF', () => {
  const mockPrintToFileAsync = Print.printToFileAsync as jest.Mock;
  const mockShareAsync = Sharing.shareAsync as jest.Mock;

  beforeEach(() => {
    mockPrintToFileAsync.mockResolvedValue({ uri: 'file://test.pdf' });
    mockShareAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function getCapturedHtml(): string {
    return mockPrintToFileAsync.mock.calls[0][0].html as string;
  }

  it('appelle printToFileAsync une fois avec un HTML non vide', async () => {
    await exportToPDF(project, [], [], 0);
    expect(mockPrintToFileAsync).toHaveBeenCalledTimes(1);
    expect(getCapturedHtml().length).toBeGreaterThan(0);
  });

  it('le HTML généré contient le nom du projet', async () => {
    await exportToPDF(project, [], [], 0);
    expect(getCapturedHtml()).toContain('Rome 2026');
  });

  it('appelle shareAsync avec l\'URI retourné par printToFileAsync et le type MIME PDF', async () => {
    await exportToPDF(project, [], [], 0);
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file://test.pdf',
      expect.objectContaining({ mimeType: 'application/pdf' }),
    );
  });

  it('inclut "Budget restant" quand le total est inférieur au budget initial', async () => {
    await exportToPDF(project, [], [], 400);
    expect(getCapturedHtml()).toContain('Budget restant');
  });

  it('inclut "Budget dépassé" quand le total dépasse le budget initial', async () => {
    await exportToPDF(project, [], [], 1200);
    expect(getCapturedHtml()).toContain('Budget dépassé');
  });

  it('inclut les noms de catégories et sous-catégories actives', async () => {
    const summary: CategorySummary[] = [{
      category_id: 1,
      category_name: 'Transports',
      total: 300,
      subcategories: [{ subcategory_id: 1, subcategory_name: 'Avion', total: 300 }],
    }];
    await exportToPDF(project, summary, [], 300);
    const html = getCapturedHtml();
    expect(html).toContain('Transports');
    expect(html).toContain('Avion');
  });

  it('inclut les noms de catégories et sous-catégories dans la liste des dépenses', async () => {
    const expenses = [makeExpenseForPdf(1, 'Nourriture', 'Restaurant')];
    await exportToPDF(project, [], expenses, 100);
    const html = getCapturedHtml();
    expect(html).toContain('Nourriture');
    expect(html).toContain('Restaurant');
  });

  it('trie les dépenses par catégorie, sous-catégorie et date dans la liste', async () => {
    const expenses = [
      makeExpenseForPdf(1, 'Transports', 'Avion'),
      makeExpenseForPdf(2, 'Nourriture', 'Sur le pouce'),
      makeExpenseForPdf(3, 'Nourriture', 'Restaurant'),
      makeExpenseForPdf(4, 'Nourriture', 'Restaurant'),
    ];
    await exportToPDF(project, [], expenses, 400);
    const html = getCapturedHtml();
    expect(html).toContain('Transports');
    expect(html).toContain('Nourriture');
    expect(html).toContain('Sur le pouce');
  });
});
