import { supabase } from '@/lib/supabase';

export type DateCompletion = { id: string; event_id: string; happened_on: string };

export async function listDateCompletions(eventId: string, signal: AbortSignal): Promise<DateCompletion[]> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.from('date_completions').select('id,event_id,happened_on')
    .eq('event_id', eventId).order('happened_on', { ascending: false }).abortSignal(signal);
  if (error) throw error;
  return data as DateCompletion[];
}

export async function setDateCompletion(eventId: string, date: string, complete: boolean) {
  if (!supabase) throw new Error('Supabase не настроен');
  const { error } = await supabase.rpc('set_date_completion', { p_event_id: eventId, p_date: date, p_complete: complete });
  if (error) throw error;
}
