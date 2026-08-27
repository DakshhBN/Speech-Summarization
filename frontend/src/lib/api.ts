import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export type NoteStatus = "uploaded" | "transcribing" | "summarizing" | "done" | "failed";

export interface NoteListItem {
  id: string;
  original_filename: string;
  status: NoteStatus;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
}

export interface NoteDetail extends NoteListItem {
  transcript: string | null;
  summary: string | null;
  playback_url: string | null;
}

export async function listNotes(): Promise<NoteListItem[]> {
  const { data } = await api.get<NoteListItem[]>("/notes");
  return data;
}

export async function getNote(id: string): Promise<NoteDetail> {
  const { data } = await api.get<NoteDetail>(`/notes/${id}`);
  return data;
}

export async function uploadNote(
  file: File,
  onProgress: (percent: number) => void,
): Promise<NoteDetail> {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post<NoteDetail>("/notes", form, {
    onUploadProgress: (event) => {
      if (event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}
