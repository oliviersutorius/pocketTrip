export function parseAmount(s: string): number | null {
  const normalized = s.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}
