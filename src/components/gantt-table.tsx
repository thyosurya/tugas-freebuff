"use client";

import { clamp, createsCycle, type Task } from "@/lib/task";

type Props = {
  tasks: Task[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

const CELL = "bg-transparent outline-none";

export default function GanttTable({
  tasks,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onAdd,
}: Props) {
  return (
    <div>
      {tasks.map((t, i) => {
        const sel = t.id === selectedId;
        return (
          <div
            key={t.id}
            onPointerDown={() => onSelect(t.id)}
            className={`group/row flex h-[30px] items-center gap-2 border-b border-neutral-200 px-2 ${
              sel ? "bg-neutral-100" : "hover:bg-neutral-50"
            }`}
          >
            <span className="w-[18px] shrink-0 font-mono text-[10px] text-neutral-400 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>

            <input
              value={t.name}
              onChange={(e) => onChange(t.id, { name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAdd();
                }
              }}
              placeholder="Tugas baru"
              aria-label="Nama tugas"
              className={`min-w-0 flex-1 text-[12px] ${CELL} placeholder:text-neutral-300`}
            />

            <input
              type="date"
              value={t.start}
              aria-label="Tanggal mulai"
              onChange={(e) => {
                if (e.target.value) onChange(t.id, { start: e.target.value });
              }}
              className="w-[94px] shrink-0 font-mono text-[10px] text-neutral-600"
            />
            <input
              type="date"
              value={t.end}
              aria-label="Tanggal selesai"
              onChange={(e) => {
                if (e.target.value) onChange(t.id, { end: e.target.value });
              }}
              className="w-[94px] shrink-0 font-mono text-[10px] text-neutral-600"
            />

            <select
              value={t.dep ?? ""}
              aria-label="Dependensi"
              onChange={(e) =>
                onChange(t.id, { dep: e.target.value ? e.target.value : null })
              }
              className="hidden w-[42px] shrink-0 appearance-none bg-transparent font-mono text-[10px] text-neutral-500 outline-none lg:block"
            >
              <option value="">—</option>
              {tasks.map((o, oi) =>
                o.id === t.id || createsCycle(tasks, t.id, o.id) ? null : (
                  <option key={o.id} value={o.id}>
                    #{oi + 1}
                  </option>
                ),
              )}
            </select>

            <div className="flex w-[40px] shrink-0 items-center justify-end">
              <input
                type="number"
                min={0}
                max={100}
                value={t.progress}
                aria-label="Progres"
                onChange={(e) =>
                  onChange(t.id, {
                    progress: clamp(Number(e.target.value) || 0, 0, 100),
                  })
                }
                className={`w-[28px] text-right font-mono text-[10px] tabular-nums ${CELL}`}
              />
              <span className="font-mono text-[9px] text-neutral-400">%</span>
            </div>

            <button
              type="button"
              onClick={() => onDelete(t.id)}
              title="Hapus tugas"
              className={`h-5 w-5 shrink-0 text-[13px] leading-none text-neutral-300 transition-opacity hover:text-neutral-900 ${
                sel ? "opacity-100" : "opacity-0 group-hover/row:opacity-100"
              }`}
            >
              ×
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className="flex h-[30px] w-full items-center gap-2 border-b border-neutral-200 px-2 text-left text-[11px] text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
      >
        <span className="w-[18px] text-center">+</span> Tugas baru
      </button>
    </div>
  );
}
