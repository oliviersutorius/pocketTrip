import { parseAmount } from './validation';

export function validateProject(
  name: string,
  startDate: Date,
  endDate: Date,
  budget: string,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!name.trim()) e.name = 'Le nom est requis';
  if (name.trim().length > 100) e.name = 'Le nom ne peut pas dépasser 100 caractères';
  if (endDate < startDate) e.endDate = 'La date de fin doit être après la date de début';
  const b = parseAmount(budget);
  if (b === null || b <= 0) e.budget = 'Le budget doit être un nombre positif';
  return e;
}
