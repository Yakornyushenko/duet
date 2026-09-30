import type { Note } from '@/services/notes';

export function isChecklistComplete(note: Pick<Note, 'kind' | 'items'>): boolean {
  return note.kind === 'checklist' && note.items.length > 0 && note.items.every((item) => item.done);
}
