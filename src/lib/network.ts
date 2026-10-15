export const networkTimeoutMs = 12_000;

export class RequestTimeoutError extends Error {
  constructor() {
    super('Сервер не ответил вовремя. Проверьте подключение и попробуйте ещё раз.');
    this.name = 'TimeoutError';
  }
}

export const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const sourceSignal = init?.signal;
  let timedOut = false;
  const abortFromSource = () => controller.abort();

  if (sourceSignal?.aborted) {
    controller.abort();
  } else {
    sourceSignal?.addEventListener('abort', abortFromSource, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, networkTimeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
    sourceSignal?.removeEventListener('abort', abortFromSource);
  }
};

export async function withTimeout<T>(operation: Promise<T>, timeoutMs = networkTimeoutMs): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new RequestTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
