export const DAY_MS = 86_400_000;

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export const MONTHS_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// 0 = Minggu ... 6 = Sabtu
export const WEEKDAYS_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function parseISO(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function toISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function todayISO(): string {
  const n = new Date();
  return toISO(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function addDays(iso: string, n: number): string {
  return toISO(parseISO(iso) + n * DAY_MS);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseISO(to) - parseISO(from)) / DAY_MS);
}

/** 0 = Minggu ... 6 = Sabtu */
export function weekdayIndex(iso: string): number {
  return new Date(parseISO(iso)).getUTCDay();
}

export function formatShort(iso: string): string {
  const d = new Date(parseISO(iso));
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function formatFull(iso: string): string {
  const d = new Date(parseISO(iso));
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
