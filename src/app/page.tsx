"use client";

import dynamic from "next/dynamic";

// App sepenuhnya client-side (localStorage + drag), jadi render hanya di browser.
const GanttApp = dynamic(() => import("@/components/gantt-app"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center text-[11px] tracking-[0.35em] text-neutral-400 uppercase">
      Gantt
    </div>
  ),
});

export default function Page() {
  return <GanttApp />;
}
