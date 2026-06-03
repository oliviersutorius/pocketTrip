import * as SQLite from 'expo-sqlite';
import type { Category, Subcategory, Project, Participant, Expense, ExpenseWithDetails, CategorySummary, ParticipantSummary } from '../types';

const db = SQLite.openDatabaseSync('mytravel.db');

const SEED_DATA: { category: string; subcategories: string[] }[] = [
  { category: 'Transports', subcategories: ['Avion', 'Voiture', 'Essence', 'Péage', 'Parking', 'Bus/Métro/Tramway', 'Train'] },
  { category: 'Nourriture', subcategories: ['Restaurant', 'Sur le pouce', 'Supérette'] },
  { category: 'Visites', subcategories: ['Stade', 'Musée', 'Autres'] },
  { category: 'Shopping', subcategories: ['Perso', 'Cadeaux'] },
  { category: 'Logement', subcategories: ['Hôtel', 'Air BNB', "Appart'Hôtel"] },
];

export function initDatabase(): void {
  db.execSync(`
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

    CREATE INDEX IF NOT EXISTS idx_expenses_project_date ON expenses(project_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_expenses_subcategory  ON expenses(subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_participants_project  ON participants(project_id);
  `);

  const columns = db.getAllSync<{ name: string }>('PRAGMA table_info(expenses)');
  if (!columns.some((c) => c.name === 'comment')) {
    db.execSync('ALTER TABLE expenses ADD COLUMN comment TEXT');
  }
  if (!columns.some((c) => c.name === 'participant_id')) {
    db.execSync('ALTER TABLE expenses ADD COLUMN participant_id INTEGER');
  }

  db.withTransactionSync(() => {
    for (const item of SEED_DATA) {
      const existing = db.getFirstSync<{ id: number }>(
        'SELECT id FROM categories WHERE name = ?',
        [item.category]
      );
      const categoryId = existing
        ? existing.id
        : db.runSync('INSERT INTO categories (name) VALUES (?)', [item.category]).lastInsertRowId;

      for (const sub of item.subcategories) {
        const subExists = db.getFirstSync(
          'SELECT id FROM subcategories WHERE category_id = ? AND name = ?',
          [categoryId, sub]
        );
        if (!subExists) {
          db.runSync('INSERT INTO subcategories (category_id, name) VALUES (?, ?)', [categoryId, sub]);
        }
      }
    }
  });
}

// --- Categories ---

export function getCategories(): Category[] {
  return db.getAllSync<Category>('SELECT * FROM categories ORDER BY id');
}

export function getSubcategories(categoryId: number): Subcategory[] {
  return db.getAllSync<Subcategory>(
    'SELECT * FROM subcategories WHERE category_id = ? ORDER BY id',
    [categoryId]
  );
}

export function getAllSubcategories(): Subcategory[] {
  return db.getAllSync<Subcategory>('SELECT * FROM subcategories ORDER BY category_id, id');
}

// --- Projects ---

export function getProjects(): Project[] {
  return db.getAllSync<Project>('SELECT * FROM projects ORDER BY created_at DESC');
}

export function getProject(id: number): Project | null {
  return db.getFirstSync<Project>('SELECT * FROM projects WHERE id = ?', [id]) ?? null;
}

export function createProject(data: Omit<Project, 'id' | 'created_at'>): number {
  const result = db.runSync(
    'INSERT INTO projects (name, start_date, end_date, initial_budget, currency, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [data.name, data.start_date, data.end_date, data.initial_budget, data.currency, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export function updateProject(id: number, data: Omit<Project, 'id' | 'created_at'>): void {
  db.runSync(
    'UPDATE projects SET name = ?, start_date = ?, end_date = ?, initial_budget = ?, currency = ? WHERE id = ?',
    [data.name, data.start_date, data.end_date, data.initial_budget, data.currency, id]
  );
}

export function deleteProject(id: number): void {
  db.runSync('DELETE FROM projects WHERE id = ?', [id]);
}

// --- Expenses ---

export function getExpenses(projectId: number): ExpenseWithDetails[] {
  return db.getAllSync<ExpenseWithDetails>(
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

export function createExpense(data: Omit<Expense, 'id' | 'created_at'>): number {
  const result = db.runSync(
    'INSERT INTO expenses (project_id, subcategory_id, participant_id, amount, currency, date, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [data.project_id, data.subcategory_id, data.participant_id ?? null, data.amount, data.currency, data.date, data.comment ?? null, new Date().toISOString()]
  );
  return result.lastInsertRowId;
}

export function getExpense(id: number): Expense | null {
  return db.getFirstSync<Expense>('SELECT * FROM expenses WHERE id = ?', [id]) ?? null;
}

export function updateExpense(id: number, data: Omit<Expense, 'id' | 'project_id' | 'created_at'>): void {
  db.runSync(
    'UPDATE expenses SET subcategory_id = ?, participant_id = ?, amount = ?, currency = ?, date = ?, comment = ? WHERE id = ?',
    [data.subcategory_id, data.participant_id ?? null, data.amount, data.currency, data.date, data.comment ?? null, id]
  );
}

export function deleteExpense(id: number): void {
  db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
}

// --- Summary ---

export function getCategorySummary(projectId: number): CategorySummary[] {
  const rows = db.getAllSync<{
    category_id: number;
    category_name: string;
    subcategory_id: number;
    subcategory_name: string;
    total: number;
  }>(
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

// --- Participants ---

export function getParticipants(projectId: number): Participant[] {
  return db.getAllSync<Participant>(
    'SELECT * FROM participants WHERE project_id = ? ORDER BY id',
    [projectId]
  );
}

export function addParticipant(projectId: number, name: string): number {
  return db.runSync(
    'INSERT INTO participants (project_id, name) VALUES (?, ?)',
    [projectId, name]
  ).lastInsertRowId;
}

export function removeParticipant(id: number): void {
  db.withTransactionSync(() => {
    db.runSync('UPDATE expenses SET participant_id = NULL WHERE participant_id = ?', [id]);
    db.runSync('DELETE FROM participants WHERE id = ?', [id]);
  });
}

export function syncProjectParticipants(
  projectId: number,
  incoming: { id?: number; name: string }[]
): void {
  db.withTransactionSync(() => {
    const original = db.getAllSync<Participant>(
      'SELECT * FROM participants WHERE project_id = ? ORDER BY id',
      [projectId]
    );
    const keptIds = new Set(incoming.filter((p) => p.id !== undefined).map((p) => p.id!));
    for (const orig of original) {
      if (!keptIds.has(orig.id)) {
        db.runSync('UPDATE expenses SET participant_id = NULL WHERE participant_id = ?', [orig.id]);
        db.runSync('DELETE FROM participants WHERE id = ?', [orig.id]);
      }
    }
    const originalIds = new Set(original.map((p) => p.id));
    for (const p of incoming) {
      if (p.id === undefined || !originalIds.has(p.id)) {
        db.runSync('INSERT INTO participants (project_id, name) VALUES (?, ?)', [projectId, p.name]);
      }
    }
  });
}

export function getParticipantSummary(projectId: number): ParticipantSummary[] {
  return db.getAllSync<ParticipantSummary>(
    `SELECT p.id as participant_id, p.name as participant_name, COALESCE(SUM(e.amount), 0) as total
     FROM participants p
     LEFT JOIN expenses e ON e.participant_id = p.id AND e.project_id = ?
     WHERE p.project_id = ?
     GROUP BY p.id
     HAVING total > 0`,
    [projectId, projectId]
  );
}
