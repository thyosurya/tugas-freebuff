import { addDays, diffDays, todayISO } from "./dates";

export type Task = {
  id: string;
  name: string;
  /** ISO yyyy-mm-dd, inklusif */
  start: string;
  /** ISO yyyy-mm-dd, inklusif */
  end: string;
  /** 0..100 */
  progress: number;
  /** id tugas pendahulunya (finish-to-start), null = tanpa dependensi */
  dep: string | null;
};

export type Project = {
  name: string;
  tasks: Task[];
};

export const STORAGE_KEY = "gantt-maker.v1";

export function uid(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function durationDays(t: Task): number {
  return diffDays(t.start, t.end) + 1;
}

/** true bila menyetel dep akan membentuk siklus */
export function createsCycle(tasks: Task[], taskId: string, depId: string | null | undefined): boolean {
  if (!depId) return false;
  let cur: string | null | undefined = depId;
  let guard = 0;
  while (cur && guard++ < 500) {
    if (cur === taskId) return true;
    cur = tasks.find((t) => t.id === cur)?.dep ?? null;
  }
  return false;
}

export function sampleProject(): Project {
  const t = todayISO();
  const d = (n: number) => addDays(t, n);
  return {
    name: "Peluncuran Situs",
    tasks: [
      { id: "s1", name: "Riset & briefing", start: d(-6), end: d(-1), progress: 100, dep: null },
      { id: "s2", name: "Wireframe", start: d(0), end: d(4), progress: 80, dep: "s1" },
      { id: "s3", name: "Desain UI", start: d(5), end: d(12), progress: 35, dep: "s2" },
      { id: "s4", name: "Setup infrastruktur", start: d(1), end: d(6), progress: 60, dep: "s1" },
      { id: "s5", name: "Integrasi API", start: d(9), end: d(16), progress: 0, dep: "s4" },
      { id: "s6", name: "QA & perbaikan", start: d(17), end: d(21), progress: 0, dep: "s3" },
      { id: "s7", name: "Rilis publik", start: d(22), end: d(22), progress: 0, dep: "s6" },
    ],
  };
}

export function loadProject(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sampleProject();
    const parsed: unknown = JSON.parse(raw);
    return sanitizeProject(parsed) ?? sampleProject();
  } catch {
    return sampleProject();
  }
}

export function saveProject(p: Project): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // storage penuh/di-block — abaikan, app tetap jalan in-memory
  }
}

/** Validasi data impor JSON apa pun menjadi Project yang aman dirender */
export function sanitizeProject(raw: unknown): Project | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.tasks)) return null;

  const tasks: Task[] = [];
  const ids = new Set<string>();

  for (const item of obj.tasks) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.start !== "string" || typeof r.end !== "string") continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.start) || !/^\d{4}-\d{2}-\d{2}$/.test(r.end)) continue;

    let id = typeof r.id === "string" && r.id.length > 0 ? r.id : uid();
    while (ids.has(id)) id = uid();
    ids.add(id);

    tasks.push({
      id,
      name: typeof r.name === "string" && r.name.trim().length > 0 ? r.name : "Tugas",
      start: r.start,
      end: r.end < r.start ? r.start : r.end,
      progress: clamp(typeof r.progress === "number" ? Math.round(r.progress) : 0, 0, 100),
      dep: typeof r.dep === "string" ? r.dep : null,
    });
  }

  const cleaned = tasks.map((t) => {
    let dep = t.dep && ids.has(t.dep) && t.dep !== t.id ? t.dep : null;
    if (createsCycle(tasks, t.id, dep)) dep = null;
    return { ...t, dep };
  });

  return {
    name: typeof obj.name === "string" && obj.name.trim().length > 0 ? obj.name : "Proyek tanpa nama",
    tasks: cleaned,
  };
}
