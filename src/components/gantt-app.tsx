"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GanttChart from "@/components/gantt-chart";
import GanttTable from "@/components/gantt-table";
import { addDays, diffDays, formatFull, todayISO } from "@/lib/dates";
import {
  STORAGE_KEY,
  clamp,
  loadProject,
  sanitizeProject,
  sampleProject,
  type Project,
  type Task,
  uid,
} from "@/lib/task";

const ZOOMS = [14, 20, 32, 48, 64];

const btn =
  "border border-neutral-300 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-neutral-600 transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white";
const btnSolid =
  "border border-neutral-900 bg-neutral-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-neutral-900";

export default function GanttApp() {
  // lazy init: komponen ini hanya di-mount di browser (ssr: false)
  const [project, setProject] = useState<Project>(loadProject);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(2);

  const dayWidth = ZOOMS[zoom];
  const chartScrollRef = useRef<HTMLDivElement | null>(null);
  const tableBodyRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  const tasks = project.tasks;

  // rentang waktu: mencakup semua tugas + hari ini, dipad
  const { start, totalDays } = useMemo(() => {
    const today = todayISO();
    let min = today;
    let max = today;
    for (const t of tasks) {
      if (t.start < min) min = t.start;
      if (t.end > max) max = t.end;
    }
    const s = addDays(min, -3);
    const e = addDays(max, 14);
    return { start: s, totalDays: Math.max(diffDays(s, e) + 1, 45) };
  }, [tasks]);

  const scrollToToday = useCallback(
    (smooth: boolean) => {
      const el = chartScrollRef.current;
      if (!el) return;
      const idx = diffDays(start, todayISO());
      el.scrollTo({
        left: Math.max(0, idx * dayWidth - el.clientWidth / 2.5),
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [start, dayWidth],
  );

  useEffect(() => {
    scrollToToday(false);
  }, [scrollToToday]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setProject((p) => ({
      ...p,
      tasks: p.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch };
        // jaga agar start <= end
        if (next.start > next.end) {
          if (patch.start) next.end = patch.start;
          else next.start = next.end;
        }
        return next;
      }),
    }));
  }, []);

  const addTask = useCallback(() => {
    const startD = todayISO();
    const t: Task = {
      id: uid(),
      name: "Tugas baru",
      start: startD,
      end: addDays(startD, 2),
      progress: 0,
      dep: null,
    };
    setProject((p) => ({ ...p, tasks: [...p.tasks, t] }));
    setSelectedId(t.id);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setProject((p) => ({
      ...p,
      tasks: p.tasks
        .filter((t) => t.id !== id)
        .map((t) => (t.dep === id ? { ...t, dep: null } : t)),
    }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^\w-]+/g, "-").toLowerCase() || "gantt"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project]);

  const importJSON = useCallback((file: File) => {
    file.text().then((txt) => {
      try {
        const parsed = sanitizeProject(JSON.parse(txt));
        if (parsed) {
          setProject(parsed);
          setSelectedId(null);
        }
      } catch {
        // file bukan JSON valid — abaikan
      }
    });
  }, []);

  const onScrollTop = useCallback((top: number) => {
    if (tableBodyRef.current) tableBodyRef.current.scrollTop = top;
  }, []);

  const meta = useMemo(() => {
    const done = tasks.filter((t) => t.progress >= 100).length;
    return `${tasks.length} tugas · ${done} selesai · ${formatFull(start)} – ${formatFull(addDays(start, totalDays - 1))}`;
  }, [tasks, start, totalDays]);

  return (
    <div className="flex h-dvh flex-col bg-white text-neutral-900">
      {/* toolbar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-900 px-4">
        <span className="text-[11px] font-medium tracking-[0.35em] uppercase">
          Gantt
        </span>
        <div className="h-4 w-px bg-neutral-300" />
        <input
          value={project.name}
          onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
          aria-label="Nama proyek"
          className="w-44 border-b border-transparent bg-transparent text-[13px] font-medium outline-none hover:border-neutral-300 focus:border-neutral-900"
        />
        <span className="hidden font-mono text-[10px] text-neutral-400 md:inline">
          {meta}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" className={btnSolid} onClick={addTask}>
            + Tugas
          </button>
          <div className="h-4 w-px bg-neutral-300" />
          <button
            type="button"
            className={btn}
            onClick={() => setZoom((z) => clamp(z - 1, 0, ZOOMS.length - 1))}
            disabled={zoom === 0}
            title="Perkecil"
          >
            −
          </button>
          <span className="w-10 text-center font-mono text-[10px] text-neutral-500 tabular-nums">
            {dayWidth}px
          </span>
          <button
            type="button"
            className={btn}
            onClick={() => setZoom((z) => clamp(z + 1, 0, ZOOMS.length - 1))}
            disabled={zoom === ZOOMS.length - 1}
            title="Perbesar"
          >
            +
          </button>
          <button type="button" className={btn} onClick={() => scrollToToday(true)}>
            Hari ini
          </button>
          <div className="h-4 w-px bg-neutral-300" />
          <button type="button" className={btn} onClick={() => setProject(sampleProject())}>
            Contoh
          </button>
          <button type="button" className={btn} onClick={exportJSON}>
            Ekspor
          </button>
          <button type="button" className={btn} onClick={() => fileRef.current?.click()}>
            Impor
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        {/* panel kiri */}
        <div className="flex w-[440px] shrink-0 flex-col border-r border-neutral-900 lg:w-[470px]">
          <div className="flex h-[49px] shrink-0 items-end gap-2 border-b border-neutral-900 px-2 pb-2 text-[9px] tracking-[0.14em] text-neutral-500 uppercase">
            <span className="w-[18px] shrink-0">No</span>
            <span className="min-w-0 flex-1">Tugas</span>
            <span className="w-[94px] shrink-0">Mulai</span>
            <span className="w-[94px] shrink-0">Selesai</span>
            <span className="hidden w-[42px] shrink-0 lg:block">Dep</span>
            <span className="w-[40px] shrink-0 text-right">Prog</span>
            <span className="w-5 shrink-0" />
          </div>
          <div ref={tableBodyRef} className="min-h-0 flex-1 overflow-hidden">
            <GanttTable
              tasks={tasks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={updateTask}
              onDelete={deleteTask}
              onAdd={addTask}
            />
          </div>
        </div>

        {/* panel kanan: chart */}
        <GanttChart
          tasks={tasks}
          start={start}
          totalDays={totalDays}
          dayWidth={dayWidth}
          selectedId={selectedId}
          scrollRef={chartScrollRef}
          onSelect={setSelectedId}
          onChange={updateTask}
          onScrollTop={onScrollTop}
        />
      </div>

      {/* footer hint */}
      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-neutral-200 px-4 font-mono text-[9px] tracking-[0.1em] text-neutral-400 uppercase">
        <span>geser bar · tarik tepi untuk ubah durasi · tarik garis di tengah bar untuk progres</span>
        <span className="ml-auto">data tersimpan di browser ini</span>
      </footer>
    </div>
  );
}
