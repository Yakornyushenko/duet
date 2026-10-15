import { dataCacheKey, loadWithCache, updateCachedData } from '@/lib/dataCache';
import { supabase } from '@/lib/supabase';
import { EntityIcon } from '@/types/domain';

export type NoteItem = { id: string; text: string; done: boolean };
export type Note = {
  id: string; couple_id: string; kind: 'text' | 'checklist'; title: string; body: string;
  items: NoteItem[]; icon: EntityIcon; pinned: boolean; deleted_at: string | null; version: number;
  updated_by: string | null; updated_at: string;
};

export function noteContent(note: Note) {
  return JSON.stringify([note.title, note.body, note.items, note.icon, note.pinned, note.deleted_at]);
}

const notesCacheKey = (coupleId: string) => dataCacheKey('notes', coupleId);

// Preserve edits typed during the request, but adopt server-normalized fields.
export function reconcileSavedNote(current: Note, snapshot: Note, result: Note): Note {
  if (noteContent(current) === noteContent(snapshot)) return result;
  return { ...current, version: result.version, updated_at: result.updated_at, updated_by: result.updated_by,
    deleted_at: current.deleted_at === snapshot.deleted_at ? result.deleted_at : current.deleted_at };
}

export async function listNotes(coupleId: string, signal: AbortSignal): Promise<Note[]> {
  return loadWithCache(notesCacheKey(coupleId), async () => {
    if (!supabase) throw new Error('Supabase не настроен');
    const { data, error } = await supabase.from('notes').select('*')
      .eq('couple_id', coupleId).order('updated_at', { ascending: false }).abortSignal(signal);
    if (error) throw error;
    return data as Note[];
  }, signal);
}

export async function saveNote(note: Note): Promise<Note> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.rpc('save_shared_note', {
    p_couple_id: note.couple_id, p_id: note.id || null, p_version: note.version, p_kind: note.kind,
    p_title: note.title, p_body: note.body, p_items: note.items,
    p_pinned: note.pinned, p_icon: note.icon, p_deleted: note.deleted_at !== null,
  });
  if (error) throw error;
  const saved = data as Note;
  await updateCachedData<Note[]>(notesCacheKey(note.couple_id), (current) => [
    saved,
    ...current.filter((item) => item.id !== saved.id),
  ]);
  return saved;
}

type SaveLatestNoteOptions = {
  getCurrent: () => Note;
  getSaved: () => Note;
  acceptSaved: (saved: Note, current: Note) => void;
  persist?: (note: Note) => Promise<Note>;
};

export async function saveLatestNote({
  getCurrent,
  getSaved,
  acceptSaved,
  persist = saveNote,
}: SaveLatestNoteOptions): Promise<void> {
  while (!getSaved().id || noteContent(getCurrent()) !== noteContent(getSaved())) {
    const snapshot = { ...getCurrent(), version: getSaved().version };
    const result = await persist(snapshot);
    const current = { ...reconcileSavedNote(getCurrent(), snapshot, result), id: result.id };
    acceptSaved(result, current);
  }
}

export async function emptyNotesTrash(coupleId: string, notes: Note[]): Promise<string[]> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.rpc('empty_notes_trash', {
    p_couple_id: coupleId,
    p_notes: notes.filter((note) => note.deleted_at).map(({ id, version }) => ({ id, version })),
  });
  if (error) throw error;
  const deletedIds = data as string[];
  await updateCachedData<Note[]>(notesCacheKey(coupleId), (current) =>
    current.filter((note) => !deletedIds.includes(note.id)));
  return deletedIds;
}
