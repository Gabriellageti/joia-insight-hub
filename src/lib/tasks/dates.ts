export function parseTaskDate(value?: string | null): Date | null {
  if (!value) return null;

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    const [, year, month, day] = isoMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brMatch) {
    const [, day, month, year] = brMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  return null;
}

export function isSameTaskDay(value: string | undefined, date: Date): boolean {
  const parsed = parseTaskDate(value);
  return Boolean(parsed && parsed.getFullYear() === date.getFullYear() && parsed.getMonth() === date.getMonth() && parsed.getDate() === date.getDate());
}
