import { supabase } from '@/lib/supabase';

export type QuestionPreferences = {
  enabled: boolean; push_enabled: boolean; intimate: boolean; adult_confirmed: boolean; introduced: boolean;
};
export type DailyQuestion = {
  id: string; day: string; body: string; intimate: boolean; revealed: boolean; skipped: boolean; cancelled: boolean;
  answered_count: number; answers: { user_id: string; name: string; body: string }[];
};
export type DailyQuestionState = {
  preferences: QuestionPreferences; time: string; timezone: string; today: string;
  active: boolean; intimate_active: boolean; questions: DailyQuestion[]; has_more: boolean;
};

export async function questionRequest<T = void>(method: string, args?: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.rpc(method, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const loadDailyQuestions = () => questionRequest<DailyQuestionState>('daily_question_state');
export const loadQuestionHistory = (before: string) => questionRequest<{ questions: DailyQuestion[]; has_more: boolean }>('daily_question_history', { p_before: before });
