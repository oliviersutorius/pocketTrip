export function prepareParticipantName(
  input: string,
  existing: { name: string }[],
): string | null {
  const trimmed = input.trim().slice(0, 100);
  if (!trimmed) return null;
  const alreadyExists = existing.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (alreadyExists) return null;
  return trimmed;
}
