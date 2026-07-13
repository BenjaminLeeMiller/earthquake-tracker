function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Epoch ms -> "YYYY-MM-DDTHH:mm" in the browser's local timezone — the
 * value format <input type="datetime-local"> both expects and produces.
 */
export function msToDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Inverse of msToDatetimeLocalValue. A datetime-local value has no
 * timezone/offset, so JS parses it as local time by spec — the same
 * convention msToDatetimeLocalValue formats with, making this a true
 * round-trip. Returns null for an empty or unparseable value (e.g. the
 * input was cleared).
 */
export function datetimeLocalValueToMs(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}
