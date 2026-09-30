const UTC_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UTC_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// Date.parse normalizes impossible calendar dates such as 2026-02-31.
// Compare the parsed UTC fields with the input before accepting a boundary.
export function parseUtcDate(value: string): number | null {
  if (!UTC_DATE.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export function parseUtcInstant(value: string): number | null {
  if (!UTC_INSTANT.test(value)) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString().slice(0, 19) === value.slice(0, 19) ? timestamp : null;
}

export function parseUtcWindowBoundary(value: string, endOfDay: boolean): number | null {
  const date = parseUtcDate(value);
  if (date !== null) return endOfDay ? date + DAY_MS - 1 : date;
  return parseUtcInstant(value);
}

export function nextUtcMonthStart(monthStart: number): number {
  const next = new Date(monthStart);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.getTime();
}
