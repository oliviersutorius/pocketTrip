export function parseAmount(s: string): number | null {
  const normalized = s.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = parseFloat(normalized);
  if (isNaN(n) || n > 1_000_000) return null;
  return n;
}
