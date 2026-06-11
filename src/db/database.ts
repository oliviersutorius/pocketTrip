import * as SQLite from 'expo-sqlite';
import type { Category, Subcategory, Project, Participant, Expense, ExpenseWithDetails, CategorySummary, ParticipantSummary } from '../types';

const SEED_DATA: { category: string; subcategories: string[] }[] = [
  { category: 'Transports', subcategories: ['Avion', 'Voiture', 'Essence', 'Péage', 'Parking', 'Bus/Métro/Tramway', 'Train'] },
  { category: 'Nourriture', subcategories: ['Restaurant', 'Sur le pouce', 'Supérette'] },
  { category: 'Visites', subcategories: ['Stade', 'Musée', 'Autres'] },
  { category: 'Shopping', subcategories: ['Perso', 'Cadeaux'] },
  { category: 'Logement', subcategories: ['Hôtel', 'Air BNB', "Appart'Hôtel"] },
];

// Assigned once in initDatabase(), before any other function is called (App.tsx gate ensures this).
let db!: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('mytravel.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subcategories (
      id          INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id             INTEGER PRIMARY KEY,
      name           TEXT NOT NULL,
      start_date     TEXT NOT NULL,
      end_date       TEXT NOT NULL,
      initial_budget REAL NOT NULL,
      currency       TEXT NOT NULL DEFAULT 'EUR',
      created_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS participants (
      id         INTEGER PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id             INTEGER PRIMARY KEY,
      project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
      participant_id INTEGER,
      amount         REAL NOT NULL,
      currency       TEXT NOT NULL DEFAULT 'EUR',
      date           TEXT NOT NULL,
      comment        TEXT,
      created_at     TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_project_date        ON expenses(project_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_subcategory         ON expenses(subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_participants_project         ON participants(project_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_project_subcategory ON expenses(project_id, subcategory_id);
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(expenses)');
  if (!columns.some((c) => c.name === 'comment')) {
    await db.execAsync('ALTER TABLE expenses ADD COLUMN comment TEXT');
  }
  if (!columns.some((c) => c.name === 'participant_id')) {
    await db.execAsync('ALTER TABLE expenses ADD COLUMN participant_id INTEGER');
  }

  await db.withTransactionAsync(async () => {
    for (const item of SEED_DATA) {
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM categories WHERE name = ?',
        [item.category]
      );
      const categoryId = existing
        ? existing.id
        : (await db.runAsync('INSERT INTO categories (name) VALUES (?)', [item.category])).lastInsertRowId;

      for (const sub of item.subcategories) {
        const subExists = await db.getFirstAsync(
          'SELECT id FROM subcategories WHERE category_id = ? AND name = ?',
          [categoryId, sub]
        );
        if (!subExists) {
          await db.runAsync('INSERT INTO subcategories (category_id, name) VALUES (?, ?)', [categoryId, sub]);
        }
      }
    }
  });
}

// --- Categories ---

export async function getCategories(): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY id');
}

export async function getSubcategories(categoryId: number): Promise<Subcategory[]> {
  return db.getAllAsync<Subcategory>(
    'SELECT * FROM subcategories WHERE category_id = ? ORDER BY id',
    [categoryId]
  );
}

export async function getAllSubcategories(): Promise<Subcategory[]> {
  return db.getAllAsync<Subcategory>('SELECT * FROM subcategories ORDER BY category_id, id');
}

// --- Projects ---

export async function getProjects(): Promise<Project[]> {
  return db.getAllAsync<Project>('SELECT * FROM projects ORDER BY created_at DESC');
}

export async function getProject(id: number): Promise<Project | null> {
  return (await db.getFirstAsync<Project>('SELECT * FROM projects WHERE id = ?', [id])) ?? null;
}

export async function createProject(data: Omit<Project, 'id' | 'created_at'>): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO projects (name, start_date, end_date, initial_budget, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.start_date, data.end_date, data.initial_budget, data.currency, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function updateProject(id: number, data: Omit<Project, 'id' | 'created_at'>): Promise<void> {
  await db.runAsync(
    'UPDATE projects SET name = ?, start_date = ?, end_date = ?, initial_budget = ?, currency = ? WHERE id = ?',
    [data.name, data.start_date, data.end_date, data.initial_budget, data.currency, id]
  );
}

export async function deleteProject(id: number): Promise<void> {
  await db.runAsync('DELETE FROM projects WHERE id = ?', [id]);
}

// --- Expenses ---

export async function getExpenses(projectId: number): Promise<ExpenseWithDetails[]> {
  return db.getAllAsync<ExpenseWithDetails>(
    `SELECT e.*, c.name as category_name, s.name as subcategory_name, p.name as participant_name
     FROM expenses e
     JOIN subcategories s ON e.subcategory_id = s.id
     JOIN categories c ON s.category_id = c.id
     LEFT JOIN participants p ON e.participant_id = p.id
     WHERE e.project_id = ?
     ORDER BY e.date DESC, e.created_at DESC`,
    [projectId]
  );
}

export async function getExpenseWithDetails(id: number): Promise<ExpenseWithDetails | null> {
  return (await db.getFirstAsync<ExpenseWithDetails>(
    `SELECT e.*, c.name as category_name, s.name as subcategory_name, p.name as participant_name
     FROM expenses e
     JOIN subcategories s ON e.subcategory_id = s.id
     JOIN categories c ON s.category_id = c.id
     LEFT JOIN participants p ON e.participant_id = p.id
     WHERE e.id = ?`,
    [id]
  )) ?? null;
}

export async function createExpense(data: Omit<Expense, 'id' | 'created_at'>): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO expenses (project_id, subcategory_id, participant_id, amount, currency, date, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [data.project_id, data.subcategory_id, data.participant_id ?? null, data.amount, data.currency, data.date, data.comment ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export async function getExpense(id: number): Promise<Expense | null> {
  return (await db.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', [id])) ?? null;
}

export async function updateExpense(id: number, data: Omit<Expense, 'id' | 'project_id' | 'created_at'>): Promise<void> {
  await db.runAsync(
    'UPDATE expenses SET subcategory_id = ?, participant_id = ?, amount = ?, currency = ?, date = ?, comment = ? WHERE id = ?',
    [data.subcategory_id, data.participant_id ?? null, data.amount, data.currency, data.date, data.comment ?? null, id]
  );
}

export async function deleteExpense(id: number): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// --- Summary ---

type CategoryRow = {
  category_id: number;
  category_name: string;
  subcategory_id: number;
  subcategory_name: string;
  total: number;
};

export function buildCategorySummary(rows: CategoryRow[]): CategorySummary[] {
  const map = new Map<number, CategorySummary>();
  for (const row of rows) {
    if (!map.has(row.category_id)) {
      map.set(row.category_id, {
        category_id: row.category_id,
        category_name: row.category_name,
        total: 0,
        subcategories: [],
      });
    }
    const cat = map.get(row.category_id)!;
    cat.subcategories.push({
      subcategory_id: row.subcategory_id,
      subcategory_name: row.subcategory_name,
      total: row.total,
    });
    cat.total += row.total;
  }
  return Array.from(map.values());
}

export async function getCategorySummary(projectId: number): Promise<CategorySummary[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT c.id as category_id, c.name as category_name,
            s.id as subcategory_id, s.name as subcategory_name,
            COALESCE(SUM(e.amount), 0) as total
     FROM categories c
     JOIN subcategories s ON s.category_id = c.id
     LEFT JOIN expenses e ON e.subcategory_id = s.id AND e.project_id = ?
     GROUP BY c.id, s.id
     ORDER BY c.id, s.id`,
    [projectId]
  );
  return buildCategorySummary(rows);
}

// --- Participants ---

export async function getParticipants(projectId: number): Promise<Participant[]> {
  return db.getAllAsync<Participant>(
    'SELECT * FROM participants WHERE project_id = ? ORDER BY id',
    [projectId]
  );
}

export async function addParticipant(projectId: number, name: string): Promise<number> {
  return (await db.runAsync(
    'INSERT INTO participants (project_id, name) VALUES (?, ?)',
    [projectId, name]
  )).lastInsertRowId;
}

export async function removeParticipant(id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE expenses SET participant_id = NULL WHERE participant_id = ?', [id]);
    await db.runAsync('DELETE FROM participants WHERE id = ?', [id]);
  });
}

export async function syncProjectParticipants(
  projectId: number,
  incoming: { id?: number; name: string }[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const original = await db.getAllAsync<Participant>(
      'SELECT * FROM participants WHERE project_id = ? ORDER BY id',
      [projectId]
    );
    const keptIds = new Set(incoming.filter((p) => p.id !== undefined).map((p) => p.id!));
    for (const orig of original) {
      if (!keptIds.has(orig.id)) {
        await db.runAsync('UPDATE expenses SET participant_id = NULL WHERE participant_id = ?', [orig.id]);
        await db.runAsync('DELETE FROM participants WHERE id = ?', [orig.id]);
      }
    }
    const originalIds = new Set(original.map((p) => p.id));
    for (const p of incoming) {
      if (p.id === undefined || !originalIds.has(p.id)) {
        await db.runAsync('INSERT INTO participants (project_id, name) VALUES (?, ?)', [projectId, p.name]);
      }
    }
  });
}

export async function getParticipantSummary(projectId: number): Promise<ParticipantSummary[]> {
  return db.getAllAsync<ParticipantSummary>(
    `SELECT p.id as participant_id, p.name as participant_name, COALESCE(SUM(e.amount), 0) as total
     FROM participants p
     LEFT JOIN expenses e ON e.participant_id = p.id AND e.project_id = ?
     WHERE p.project_id = ?
     GROUP BY p.id
     HAVING total > 0`,
    [projectId, projectId]
  );
}
