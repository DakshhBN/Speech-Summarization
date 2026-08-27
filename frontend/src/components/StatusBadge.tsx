import type { NoteStatus } from "../lib/api";

const STYLES: Record<NoteStatus, string> = {
  uploaded: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  transcribing: "bg-amber-400/15 text-amber-300 border-amber-400/20",
  summarizing: "bg-cyan-400/15 text-cyan-300 border-cyan-400/20",
  done: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
  failed: "bg-rose-400/15 text-rose-300 border-rose-400/20",
};

const DOT_STYLES: Record<NoteStatus, string> = {
  uploaded: "bg-slate-400",
  transcribing: "bg-amber-400",
  summarizing: "bg-cyan-400",
  done: "bg-emerald-400",
  failed: "bg-rose-400",
};

const LABELS: Record<NoteStatus, string> = {
  uploaded: "uploaded",
  transcribing: "transcribing",
  summarizing: "summarizing",
  done: "done",
  failed: "failed",
};

const ACTIVE = new Set<NoteStatus>(["uploaded", "transcribing", "summarizing"]);

export function StatusBadge({ status }: { status: NoteStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STYLES[status]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${DOT_STYLES[status]} ${ACTIVE.has(status) ? "pulse-dot" : ""}`}
      />
      {LABELS[status]}
    </span>
  );
}
