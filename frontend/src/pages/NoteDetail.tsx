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
      <div className="max-w-3xl mx-auto px-4 py-10">
        <p className="text-slate-400">note not found.</p>
        <Link to="/" className="text-blue-400 hover:underline text-sm">
          back to notes
        </Link>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-slate-500">loading...</div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/" className="text-blue-400 hover:underline text-sm">
        &larr; back to notes
      </Link>

      <div className="flex items-center justify-between mt-4 mb-6">
        <h1 className="text-xl font-semibold truncate">{note.original_filename}</h1>
        <StatusBadge status={note.status} />
      </div>

      {note.playback_url && (
        <audio controls src={note.playback_url} className="w-full mb-6" />
      )}

      {note.status === "failed" && note.error_message && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm mb-6">
          {note.error_message}
        </div>
      )}

      {(note.status === "uploaded" || note.status === "transcribing" || note.status === "summarizing") && (
        <p className="text-slate-400 text-sm mb-6">
          processing your audio, this page updates automatically...
        </p>
      )}

      {note.summary && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">Summary</h2>
          <p className="whitespace-pre-wrap leading-relaxed">{note.summary}</p>
        </section>
      )}

      {note.transcript && (
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
            Full transcript
          </h2>
          <p className="whitespace-pre-wrap leading-relaxed text-slate-300 text-sm">
            {note.transcript}
          </p>
        </section>
      )}
    </div>
  );
}
