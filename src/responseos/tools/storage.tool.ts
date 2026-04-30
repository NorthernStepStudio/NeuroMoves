import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStorageTools, type ToolContract } from '@nss/response-os';

const TOOL_STORAGE_PREFIX = 'responseos:tool:';

export function createNeuromovesStorageTools(): ToolContract[] {
  return createStorageTools({
    async get(key) {
      const raw = await AsyncStorage.getItem(resolveKey(key));
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return raw;
      }
    },
    async set(key, value) {
      await AsyncStorage.setItem(resolveKey(key), JSON.stringify(value));
    },
  });
}

function resolveKey(key: string): string {
  return `${TOOL_STORAGE_PREFIX}${key}`;
}
