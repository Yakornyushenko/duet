import { supabase } from '@/lib/supabase';

export type NoteItem = { id: string; text: string; done: boolean };
export type Note = {
  id: string; couple_id: string; kind: 'text' | 'checklist'; title: string; body: string;
  items: NoteItem[]; pinned: boolean; deleted_at: string | null; version: number;
  updated_by: string | null; updated_at: string;
};

export function noteContent(note: Note) {
  return JSON.stringify([note.title, note.body, note.items, note.pinned, note.deleted_at]);
}

// Preserve edits typed during the request, but adopt server-normalized fields.
export function reconcileSavedNote(current: Note, snapshot: Note, result: Note): Note {
  if (noteContent(current) === noteContent(snapshot)) return result;
  return { ...current, version: result.version, updated_at: result.updated_at, updated_by: result.updated_by,
    deleted_at: current.deleted_at === snapshot.deleted_at ? result.deleted_at : current.deleted_at };
}

export async function listNotes(coupleId: string, signal: AbortSignal): Promise<Note[]> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.from('notes').select('*')
    .eq('couple_id', coupleId).order('updated_at', { ascending: false }).abortSignal(signal);
  if (error) throw error;
  return data as Note[];
}

export async function saveNote(note: Note): Promise<Note> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.rpc('save_shared_note', {
    p_couple_id: note.couple_id, p_id: note.id || null, p_version: note.version, p_kind: note.kind,
    p_title: note.title, p_body: note.body, p_items: note.items,
    p_pinned: note.pinned, p_deleted: note.deleted_at !== null,
  });
  if (error) throw error;
  return data as Note;
}

export async function emptyNotesTrash(coupleId: string, notes: Note[]): Promise<string[]> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.rpc('empty_notes_trash', {
    p_couple_id: coupleId,
    p_notes: notes.filter((note) => note.deleted_at).map(({ id, version }) => ({ id, version })),
  });
  if (error) throw error;
  return data as string[];
}
