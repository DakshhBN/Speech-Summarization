import type { NoteStatus } from "../lib/api";

const STYLES: Record<NoteStatus, string> = {
  uploaded: "bg-slate-700 text-slate-200",
  transcribing: "bg-amber-500/20 text-amber-300",
  summarizing: "bg-blue-500/20 text-blue-300",
  done: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
};

const LABELS: Record<NoteStatus, string> = {
  uploaded: "uploaded",
  transcribing: "transcribing",
  summarizing: "summarizing",
  done: "done",
  failed: "failed",
};

export function StatusBadge({ status }: { status: NoteStatus }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
