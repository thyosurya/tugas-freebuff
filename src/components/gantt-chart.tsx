"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MONTHS_SHORT,
  WEEKDAYS_SHORT,
  addDays,
  diffDays,
  formatShort,
  todayISO,
  weekdayIndex,
} from "@/lib/dates";
import { clamp, type Task } from "@/lib/task";

export const ROW_H = 30;
const BAR_H = 18;

type DragMode = "move" | "start" | "end" | "progress";

type Drag = {
  id: string;
  mode: DragMode;
  startX: number;
  origStart: string;
  origEnd: string;
  origProgress: number;
  barW: number;
};

type Props = {
  tasks: Task[];
  start: string;
  totalDays: number;
  dayWidth: number;
  selectedId: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Task>) => void;
  onScrollTop: (top: number) => void;
};

export default function GanttChart({
  tasks,
  start,
  totalDays,
  dayWidth,
  selectedId,
  scrollRef,
  onSelect,
  onChange,
  onScrollTop,
}: Props) {
  const dragRef = useRef<Drag | null>(null);
  const [dragging, setDragging] = useState(false);
  const today = todayISO();

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDays(start, i)),
    [start, totalDays],
  );

  const months = useMemo(() => {
    const out: { label: string; days: number }[] = [];
    for (const iso of days) {
      const d = new Date(`${iso}T00:00:00Z`);
      const label = `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      const last = out[out.length - 1];
      if (last && last.label === label) last.days += 1;
      else out.push({ label, days: 1 });
    }
    return out;
  }, [days]);

  const weekendCols = useMemo(
    () => days.flatMap((iso, i) => (weekdayIndex(iso) >= 6 ? [{ iso, i }] : [])),
    [days],
  );

  const monthStarts = useMemo(
    () => days.flatMap((iso, i) => (iso.slice(8) === "01" ? [{ iso, i }] : [])),
    [days],
  );

  const rowOf = useMemo(() => new Map(tasks.map((t, i) => [t.id, i])), [tasks]);

  const contentW = totalDays * dayWidth;
  const rowsH = Math.max(tasks.length * ROW_H, 120);
  const todayIdx = diffDays(start, today);

  // --- drag / resize / progress via pointer events (no deps) ---
  useEffect(() => {
    function move(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const delta = Math.round(dx / dayWidth);
      if (d.mode === "move") {
        onChange(d.id, {
          start: addDays(d.origStart, delta),
          end: addDays(d.origEnd, delta),
        });
      } else if (d.mode === "start") {
        const s = addDays(d.origStart, delta);
        onChange(d.id, { start: s <= d.origEnd ? s : d.origEnd });
      } else if (d.mode === "end") {
        const en = addDays(d.origEnd, delta);
        onChange(d.id, { end: en >= d.origStart ? en : d.origStart });
      } else {
        const pct = clamp(
          Math.round(d.origProgress + (dx / Math.max(d.barW, 1)) * 100),
          0,
          100,
        );
        onChange(d.id, { progress: pct });
      }
    }
    function up() {
      if (dragRef.current) setDragging(false);
      dragRef.current = null;
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dayWidth, onChange]);

  const beginDrag = (e: React.PointerEvent, t: Task, mode: DragMode, barW: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(t.id);
    setDragging(true);
    dragRef.current = {
      id: t.id,
      mode,
      startX: e.clientX,
      origStart: t.start,
      origEnd: t.end,
      origProgress: t.progress,
      barW,
    };
  };

  return (
    <div
      ref={scrollRef}
      onScroll={(e) => onScrollTop(e.currentTarget.scrollTop)}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
className={`relative min-w-0 flex-1 overflow-auto bg-white ${dragging ? "select-none" : ""}`}
    >
      <div className="flex min-h-full flex-col" style={{ width: contentW }}>
        {/* header: bulan + hari */}
        <div className="sticky top-0 z-30 bg-white">
          <div className="flex h-[22px]">
            {months.map((m) => (
              <div
                key={m.label}
                style={{ width: m.days * dayWidth }}
                className="shrink-0 truncate border-l border-neutral-900 px-1.5 text-[9px] uppercase tracking-[0.14em] leading-[22px] text-neutral-500 first:border-l-0"
              >
                {m.label}
              </div>
            ))}
          </div>
          <div className="flex h-[26px] border-b border-neutral-900">
            {days.map((iso) => {
              const w = weekdayIndex(iso);
              const isToday = iso === today;
              return (
                <div
                  key={iso}
                  style={{ width: dayWidth }}
                  className={`flex shrink-0 items-center justify-center border-l font-mono text-[9px] ${
                    w === 1 ? "border-neutral-300" : "border-neutral-100"
                  } ${
                    isToday
                      ? "bg-neutral-900 text-white"
                      : w >= 6
                        ? "text-neutral-400"
                        : "text-neutral-500"
                  }`}
                >
                  {dayWidth >= 32
                    ? `${WEEKDAYS_SHORT[w]} ${Number(iso.slice(8))}`
                    : Number(iso.slice(8))}
                </div>
              );
            })}
          </div>
        </div>

        {/* area baris */}
        <div
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) onSelect(null);
          }}
          className="relative flex-1"
          style={{
            height: rowsH,
            backgroundImage: `repeating-linear-gradient(to right, #ececec 0 1px, transparent 1px ${dayWidth}px)`,
          }}
        >
          {/* weekend */}
          {weekendCols.map(({ iso }) => (
            <div
              key={`we-${iso}`}
              className="absolute inset-y-0 z-0 bg-neutral-50"
              style={{ left: diffDays(start, iso) * dayWidth, width: dayWidth }}
            />
          ))}
          {/* batas bulan */}
          {monthStarts.map(({ iso }) => (
            <div
              key={`ms-${iso}`}
              className="absolute inset-y-0 z-0 w-px bg-neutral-300"
              style={{ left: diffDays(start, iso) * dayWidth }}
            />
          ))}
          {/* garis hari ini */}
          {todayIdx >= 0 && todayIdx < totalDays && (
            <div
              className="absolute inset-y-0 z-[3] w-px bg-neutral-900"
              style={{ left: todayIdx * dayWidth }}
            />
          )}

          {/* panah dependensi */}
          <svg
            className="pointer-events-none absolute inset-0 z-[5]"
            width={contentW}
            height={rowsH}
          >
            <defs>
              <marker id="arw" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto">
                <path d="M0 0 L6 3 L0 6 Z" fill="#a1a1aa" />
              </marker>
              <marker id="arwS" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto">
                <path d="M0 0 L6 3 L0 6 Z" fill="#111" />
              </marker>
            </defs>
            {tasks.map((t, i) => {
              if (!t.dep) return null;
              const pi = rowOf.get(t.dep);
              const pred = tasks.find((x) => x.id === t.dep);
              if (pi === undefined || !pred) return null;
              const x1 = (diffDays(start, pred.end) + 1) * dayWidth;
              const y1 = pi * ROW_H + ROW_H / 2;
              const x2 = diffDays(start, t.start) * dayWidth;
              const y2 = i * ROW_H + ROW_H / 2;
              const midX = Math.max(x1 + 8, x2 - 8);
              const active = selectedId === t.id || selectedId === pred.id;
              return (
                <path
                  key={`dep-${t.id}`}
                  d={`M${x1} ${y1} H${midX} V${y2} H${x2 - 5}`}
                  fill="none"
                  stroke={active ? "#111" : "#a1a1aa"}
                  strokeWidth={1}
                  markerEnd={active ? "url(#arwS)" : "url(#arw)"}
                />
              );
            })}
          </svg>

          {/* bar tugas */}
          {tasks.map((t, i) => {
            const x1 = diffDays(start, t.start) * dayWidth;
            const barW = Math.max(
              (diffDays(start, t.end) + 1) * dayWidth - x1,
              4,
            );
            const sel = t.id === selectedId;
            const pct = clamp(t.progress, 0, 100);
            const inside = barW >= 92;
            return (
              <div
                key={t.id}
                onPointerDown={(e) => beginDrag(e, t, "move", barW)}
                title={`${t.name} · ${formatShort(t.start)} – ${formatShort(t.end)} · ${pct}%`}
                style={{ left: x1, width: barW, top: i * ROW_H + (ROW_H - BAR_H) / 2, height: BAR_H }}
                className={`group absolute z-20 cursor-grab touch-none border active:cursor-grabbing ${
                  sel
                    ? "border-neutral-900 ring-1 ring-neutral-900"
                    : "border-neutral-700 hover:border-neutral-900"
                } bg-neutral-200`}
              >
                {/* isi progres */}
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 bg-neutral-900"
                  style={{ width: `${pct}%` }}
                />
                {/* label */}
                {inside ? (
                  <span
                    className={`pointer-events-none absolute inset-y-0 left-1.5 flex items-center truncate pr-1 text-[10px] leading-none ${
                      pct > 8 ? "text-white" : "text-neutral-800"
                    }`}
                    style={{ right: 4 }}
                  >
                    {t.name}
                  </span>
                ) : (
                  <span
                    className="pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-1.5 text-[10px] leading-none text-neutral-500"
                    style={{ left: "100%" }}
                  >
                    {t.name}
                  </span>
                )}
                {/* handle kiri */}
                <div
                  onPointerDown={(e) => beginDrag(e, t, "start", barW)}
                  className={`absolute inset-y-0 left-0 z-10 w-1.5 touch-none cursor-ew-resize bg-neutral-900/10 opacity-0 group-hover:opacity-100 ${sel ? "opacity-40" : ""}`}
                />
                {/* handle kanan */}
                <div
                  onPointerDown={(e) => beginDrag(e, t, "end", barW)}
                  className={`absolute inset-y-0 right-0 z-10 w-1.5 touch-none cursor-ew-resize bg-neutral-900/10 opacity-0 group-hover:opacity-100 ${sel ? "opacity-40" : ""}`}
                />
                {/* grip progres */}
                <div
                  onPointerDown={(e) => beginDrag(e, t, "progress", barW)}
                  style={{ left: `${pct}%` }}
                  className="absolute -inset-y-[3px] z-20 w-2 -translate-x-1/2 cursor-ew-resize touch-none"
                >
                  <div className="mx-auto h-full w-px bg-neutral-900 opacity-0 group-hover:opacity-100" />
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-10 text-center text-[11px] tracking-[0.1em] text-neutral-300 uppercase">
              Belum ada tugas — tambah tugas pertama
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
