import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyValueMemoryStore } from '@nss/response-os';

export class AsyncStorageMemoryStore extends KeyValueMemoryStore {
  constructor(namespace: string) {
    super({
      namespace,
      adapter: {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        getAllKeys: () => AsyncStorage.getAllKeys(),
        removeItem: async (key: string) => {
          try {
            await AsyncStorage.removeItem(key);
            return true;
          } catch {
            return false;
          }
        },
      },
    });
  }
}
