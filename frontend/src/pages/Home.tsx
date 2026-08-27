import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { StatusBadge } from "../components/StatusBadge";
import { listNotes, uploadNote, type NoteListItem } from "../lib/api";

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-1">Audio Notes</h1>
      <p className="text-slate-400 mb-8">Upload an audio file to get a transcript and summary.</p>

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
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragActive ? "border-blue-400 bg-blue-500/5" : "border-slate-700 hover:border-slate-500"
        }`}
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
        <p className="text-slate-300">Drag & drop an audio file here, or click to browse</p>
        <p className="text-slate-500 text-sm mt-1">wav, mp3, m4a, aac, ogg, flac... up to 10MB</p>
      </div>

      {progress !== null && (
        <div className="mt-4">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-1">uploading... {progress}%</p>
        </div>
      )}

      {uploadError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm">
          {uploadError}
        </div>
      )}

      <h2 className="text-lg font-medium mt-10 mb-3">Past uploads</h2>

      {loading ? (
        <p className="text-slate-500">loading...</p>
      ) : notes.length === 0 ? (
        <p className="text-slate-500">nothing uploaded yet</p>
      ) : (
        <ul className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                to={`/notes/${note.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/60 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate">{note.original_filename}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
                <StatusBadge status={note.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
