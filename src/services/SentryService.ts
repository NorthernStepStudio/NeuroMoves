import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

type SentryModule = typeof import('@sentry/react-native');

const noopSentry = {
  init: (_options?: unknown) => undefined,
  wrap: <T,>(component: T): T => component,
};

function loadSentry(): Pick<SentryModule, 'init' | 'wrap'> {
  if (Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return noopSentry;
  }

  // Keep native Sentry out of Expo Go, where its native module is not available.
  const loadNativeModule = require as (moduleName: string) => SentryModule;
  return loadNativeModule('@sentry/react-native');
}

export const Sentry = loadSentry();
