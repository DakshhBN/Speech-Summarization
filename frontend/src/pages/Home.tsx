import axios from "axios";
import { Check, Pencil, Trash2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import {
  deleteNote,
  listNotes,
  renameNote,
  uploadNote,
  type NoteListItem,
} from "../lib/api";

const ALLOWED_EXTENSIONS = ["wav", "mp3", "mp4", "flac", "ogg", "opus", "m4a", "aac", "webm", "amr"];
const MAX_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `unsupported file type: .${ext}`;
  }
  if (file.size > MAX_BYTES) {
    return "file is larger than 10MB";
  }
  return null;
}

export default function Home() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      const data = await listNotes();
      setNotes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleFile(file: File) {
    const error = validateFile(file);
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setProgress(0);
    try {
      await uploadNote(file, setProgress);
      await refresh();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setUploadError(err.response?.data?.detail ?? "upload failed, try again");
      } else {
        setUploadError("upload failed, try again");
      }
    } finally {
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function startEdit(note: NoteListItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(note.id);
    setEditValue(note.original_filename);
  }

  async function saveEdit(e: React.MouseEvent | React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!editingId || !editValue.trim()) return;
    try {
      await renameNote(editingId, editValue.trim());
      setEditingId(null);
      await refresh();
    } catch {
      setUploadError("couldn't rename that note, try again");
    }
  }

  function cancelEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this note? This can't be undone.")) return;
    setDeletingId(id);
    try {
      await deleteNote(id);
      await refresh();
    } catch {
      setUploadError("couldn't delete that note, try again");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <div className="fade-up">
        <h1 className="text-4xl font-semibold tracking-tight mb-2">
          Turn audio into <span className="gradient-text">insight</span>
        </h1>
        <p className="text-slate-400 mb-10">
          Upload a recording and get a clean transcript plus an AI summary in minutes.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`fade-up glass rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? "border-violet-400/50 shadow-[0_0_40px_-10px_rgba(139,92,246,0.5)] scale-[1.01]"
            : "hover:border-white/20"
        }`}
        style={{ animationDelay: "0.05s" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-gradient-to-br from-violet-500/20 to-cyan-400/20 ${dragActive ? "" : "float"}`}>
          <UploadCloud className="w-6 h-6 text-violet-300" />
        </div>
        <p className="text-slate-200 font-medium">Drag & drop an audio file, or click to browse</p>
        <p className="text-slate-500 text-sm mt-1.5">wav, mp3, m4a, aac, ogg, flac... up to 10MB</p>
      </div>

      {progress !== null && (
        <div className="mt-4 fade-up">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full shimmer rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-1.5">uploading... {progress}%</p>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 fade-up bg-rose-500/10 border border-rose-500/25 text-rose-300 rounded-xl px-4 py-3 text-sm">
          {uploadError}
        </div>
      )}

      <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mt-12 mb-4">
        Past uploads
      </h2>

      {loading ? (
        <p className="text-slate-500">loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-slate-500">nothing uploaded yet</p>
      ) : (
        <ul className="space-y-2.5">
          {notes.map((note, i) => (
            <li
              key={note.id}
              className="fade-up"
              style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s` }}
            >
              <Link
                to={`/notes/${note.id}`}
                className="group glass flex items-center justify-between gap-4 rounded-xl px-4 py-3.5 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-200"
              >
                {editingId === note.id ? (
                  <form onSubmit={saveEdit} className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.preventDefault()}
                      className="flex-1 min-w-0 bg-black/30 border border-violet-400/40 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-violet-400"
                    />
                    <button
                      onClick={saveEdit}
                      className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-500/15 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-slate-100">{note.original_filename}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={note.status} />
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-1">
                        <button
                          onClick={(e) => startEdit(note, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(note.id, e)}
                          disabled={deletingId === note.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
