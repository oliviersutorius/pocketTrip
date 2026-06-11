import { parseAmount } from './validation';

export function validateExpense(
  amount: string,
  categoryId: number | null,
  subcategoryId: number | null,
): Record<string, string> {
  const e: Record<string, string> = {};
  const a = parseAmount(amount);
  if (a === null || a <= 0) e.amount = 'Montant invalide';
  if (!categoryId) e.category = 'Choisissez une catégorie';
  if (!subcategoryId) e.subcategory = 'Choisissez une sous-catégorie';
  return e;
}
