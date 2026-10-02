// Browser preview has no native keychain. Do not persist browser sessions.
import type { KeyValueStorage } from './secureSessionStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
const values = new Map<string, string>();
export const authStorage: KeyValueStorage = {
  async getItem(key) {
    await AsyncStorage.removeItem(key);
    return values.get(key) ?? null;
  },
  async setItem(key, value) { values.set(key, value); },
  async removeItem(key) { values.delete(key); await AsyncStorage.removeItem(key); },
};
