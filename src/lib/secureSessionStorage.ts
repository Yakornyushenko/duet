export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

type Manifest = { generation: string; count: number } | { deleted: true };

// Each chunk is <= 1600 UTF-8 bytes. A new generation is committed only after
// every chunk is written and verified; interruptions preserve the old session.
export function createSecureSessionStorage(secure: KeyValueStorage, legacy: KeyValueStorage, randomId: () => string): KeyValueStorage {
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  };
  const manifestKey = (key: string) => `duet.secure.${key}`;
  const readManifest = async (key: string): Promise<Manifest | null> => {
    const raw = await secure.getItem(manifestKey(key));
    if (raw === null) return null;
    const value = JSON.parse(raw);
    if (value.deleted === true) return { deleted: true };
    if (typeof value.generation !== 'string' || !/^[a-zA-Z0-9-]+$/.test(value.generation)
      || !Number.isInteger(value.count) || value.count < 1 || value.count > 256) {
      throw new Error('Повреждено защищённое хранилище сессии');
    }
    return value;
  };
  const cleanup = async (key: string, manifest: Manifest | null) => {
    if (!manifest || 'deleted' in manifest) return;
    for (let i = 0; i < manifest.count; i++) {
      await secure.removeItem(`${manifestKey(key)}.${manifest.generation}.${i}`).catch(() => undefined);
    }
  };
  const write = async (key: string, value: string) => {
    if (value.length > 102400) throw new Error('Сессия слишком большая');
    const previous = await readManifest(key);
    const generation = randomId();
    const characters = Array.from(value);
    const count = Math.max(1, Math.ceil(characters.length / 400));
    const next = { generation, count };
    try {
      for (let i = 0; i < count; i++) {
        const chunkKey = `${manifestKey(key)}.${generation}.${i}`;
        const chunk = characters.slice(i * 400, (i + 1) * 400).join('');
        await secure.setItem(chunkKey, chunk);
        if (await secure.getItem(chunkKey) !== chunk) throw new Error('Не удалось проверить сохранение сессии');
      }
      await secure.setItem(manifestKey(key), JSON.stringify(next));
    } catch (error) {
      await cleanup(key, next);
      throw error;
    }
    await legacy.removeItem(key);
    await cleanup(key, previous);
  };
  return {
    getItem: (key) => serialize(async () => {
      const manifest = await readManifest(key);
      if (manifest) {
        // Never resurrect a legacy token after logout or a completed migration.
        await legacy.removeItem(key);
        if ('deleted' in manifest) return null;
        let value = '';
        for (let i = 0; i < manifest.count; i++) {
          const chunk = await secure.getItem(`${manifestKey(key)}.${manifest.generation}.${i}`);
          if (chunk === null) throw new Error('Не удалось прочитать защищённую сессию');
          value += chunk;
        }
        return value;
      }
      const value = await legacy.getItem(key);
      if (value !== null) await write(key, value);
      return value;
    }),
    setItem: (key, value) => serialize(() => write(key, value)),
    removeItem: (key) => serialize(async () => {
      const previous = await readManifest(key);
      await secure.setItem(manifestKey(key), JSON.stringify({ deleted: true }));
      await legacy.removeItem(key);
      await cleanup(key, previous);
    }),
  };
}
