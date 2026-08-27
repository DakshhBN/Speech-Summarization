import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { getNote, type NoteDetail as NoteDetailType } from "../lib/api";

const TERMINAL_STATUSES = new Set(["done", "failed"]);

export default function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<NoteDetailType | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    async function poll() {
      try {
        const data = await getNote(id!);
        if (cancelled) return;
        setNote(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(interval);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      }
    }

    poll();
    interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-14 fade-up">
        <p className="text-slate-400">note not found.</p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-sm mt-3">
          <ArrowLeft className="w-3.5 h-3.5" /> back to notes
        </Link>
      </div>
    );
  }

  if (!note) {
    return <div className="max-w-3xl mx-auto px-6 py-14 text-slate-500">loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <Link
        to="/"
        className="fade-up inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> back to notes
      </Link>

      <div className="fade-up flex items-center justify-between gap-4 mb-6" style={{ animationDelay: "0.05s" }}>
        <h1 className="text-2xl font-semibold tracking-tight truncate">{note.original_filename}</h1>
        <StatusBadge status={note.status} />
      </div>

      {note.playback_url && (
        <div className="fade-up glass rounded-xl p-3 mb-6" style={{ animationDelay: "0.1s" }}>
          <audio controls src={note.playback_url} className="w-full" />
        </div>
      )}

      {note.status === "failed" && note.error_message && (
        <div className="fade-up bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-xl px-4 py-3 text-sm mb-6">
          {note.error_message}
        </div>
      )}

      {(note.status === "uploaded" || note.status === "transcribing" || note.status === "summarizing") && (
        <div className="fade-up flex items-center gap-2 text-slate-400 text-sm mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 pulse-dot" />
          processing your audio, this page updates automatically...
        </div>
      )}

      {note.summary && (
        <section className="fade-up glass rounded-xl p-5 mb-5" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xs font-medium text-amber-300 uppercase tracking-wide mb-2.5">Summary</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-200">{note.summary}</p>
        </section>
      )}

      {note.transcript && (
        <section className="fade-up glass rounded-xl p-5" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-xs font-medium text-orange-300 uppercase tracking-wide mb-2.5">
            Full transcript
          </h2>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-400 text-sm">
            {note.transcript}
          </p>
        </section>
      )}
    </div>
  );
}
