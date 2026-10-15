import { dataCacheKey, loadWithCache, writeCachedData } from '@/lib/dataCache';
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

const questionCacheKey = (coupleId: string, questionId: string) =>
  dataCacheKey('daily-question', coupleId, questionId);

async function cacheQuestions(coupleId: string, questions: DailyQuestion[]): Promise<void> {
  await Promise.all(questions.map((question) =>
    writeCachedData(questionCacheKey(coupleId, question.id), question)));
}

export async function questionRequest<T = void>(
  method: string,
  args?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  if (!supabase) throw new Error('Supabase не настроен');
  const request = supabase.rpc(method, args);
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function loadDailyQuestions(coupleId: string, signal?: AbortSignal): Promise<DailyQuestionState> {
  const state = await loadWithCache(
    dataCacheKey('daily-questions', coupleId),
    () => questionRequest<DailyQuestionState>('daily_question_state', undefined, signal),
    signal,
  );
  await cacheQuestions(coupleId, state.questions);
  return state;
}

export async function loadQuestionHistory(
  coupleId: string,
  before: string,
  signal?: AbortSignal,
): Promise<{ questions: DailyQuestion[]; has_more: boolean }> {
  const page = await loadWithCache(
    dataCacheKey('daily-question-history', coupleId, before),
    () => questionRequest<{ questions: DailyQuestion[]; has_more: boolean }>(
      'daily_question_history',
      { p_before: before },
      signal,
    ),
    signal,
  );
  await cacheQuestions(coupleId, page.questions);
  return page;
}

export function loadDailyQuestionDetail(
  coupleId: string,
  questionId: string,
  signal?: AbortSignal,
): Promise<DailyQuestion | null> {
  return loadWithCache(
    questionCacheKey(coupleId, questionId),
    () => questionRequest<DailyQuestion | null>('daily_question_detail', { p_id: questionId }, signal),
    signal,
  );
}
