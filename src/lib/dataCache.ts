import AsyncStorage from '@react-native-async-storage/async-storage';

const cachePrefix = 'duet:data:v1:';

type CacheEnvelope<T> = {
  savedAt: string;
  data: T;
};

export function dataCacheKey(...parts: string[]): string {
  return `${cachePrefix}${parts.map(encodeURIComponent).join(':')}`;
}

export async function readCachedData<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return undefined;
    return (JSON.parse(raw) as CacheEnvelope<T>).data;
  } catch (error) {
    console.warn('Не удалось прочитать сохранённые данные', error);
    return undefined;
  }
}

export async function writeCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { savedAt: new Date().toISOString(), data };
    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch (error) {
    console.warn('Не удалось сохранить резервную копию данных', error);
  }
}

export async function updateCachedData<T>(key: string, update: (current: T) => T): Promise<void> {
  const current = await readCachedData<T>(key);
  if (current !== undefined) await writeCachedData(key, update(current));
}

export async function removeCachedData(key: string): Promise<void> {
  await AsyncStorage.removeItem(key).catch((error) => {
    console.warn('Не удалось удалить сохранённые данные', error);
  });
}

export async function clearDataCache(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith(cachePrefix));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.warn('Не удалось очистить сохранённые данные', error);
  }
}

function canUseCachedData(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return false;
  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : 0;
  return !status || status === 408 || status === 429 || status >= 500;
}

export async function loadWithCache<T>(
  key: string,
  load: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const data = await load();
    await writeCachedData(key, data);
    return data;
  } catch (error) {
    if (!canUseCachedData(error, signal)) throw error;
    const cached = await readCachedData<T>(key);
    if (cached === undefined) throw error;
    console.warn('Не удалось обновить данные, используются сохранённые данные', error);
    return cached;
  }
}
