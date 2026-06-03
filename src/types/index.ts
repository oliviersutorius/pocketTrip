export interface Category {
  id: number;
  name: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  initial_budget: number;
  currency: string;
  created_at: string;
}

export interface Participant {
  id: number;
  project_id: number;
  name: string;
}

export interface Expense {
  id: number;
  project_id: number;
  subcategory_id: number;
  participant_id: number | null;
  amount: number;
  currency: string;
  date: string;
  comment: string | null;
  created_at: string;
}

export interface ExpenseWithDetails extends Expense {
  category_name: string;
  subcategory_name: string;
  participant_name: string | null;
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  total: number;
  subcategories: SubcategorySummary[];
}

export interface SubcategorySummary {
  subcategory_id: number;
  subcategory_name: string;
  total: number;
}

export interface ParticipantSummary {
  participant_id: number;
  participant_name: string;
  total: number;
}
