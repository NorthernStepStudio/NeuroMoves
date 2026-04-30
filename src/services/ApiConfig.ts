import { Platform } from 'react-native';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

type AppEnvironment = 'development' | 'staging' | 'production';

function resolveAppEnvironment(): AppEnvironment {
  const raw = (process.env.EXPO_PUBLIC_APP_ENV || 'development').trim().toLowerCase();
  if (raw === 'staging' || raw === 'production') return raw;
  return 'development';
}

function resolveEnvSpecificBaseUrl(env: AppEnvironment): string | null {
  if (env === 'development') {
    return process.env.EXPO_PUBLIC_API_BASE_URL_DEV?.trim() || null;
  }
  if (env === 'staging') {
    return process.env.EXPO_PUBLIC_API_BASE_URL_STAGING?.trim() || null;
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL_PROD?.trim() || null;
}

export function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (configured) return normalizeBaseUrl(configured);

  const env = resolveAppEnvironment();
  const envSpecific = resolveEnvSpecificBaseUrl(env);
  if (envSpecific) return normalizeBaseUrl(envSpecific);

  if (env !== 'development') {
    console.warn(
      `[ApiConfig] EXPO_PUBLIC_APP_ENV=${env} but no env URL configured. Falling back to local development URL.`
    );
  }

  const fallback =
    Platform.OS === 'android'
      ? 'http://10.0.2.2:5000/api'
      : 'http://localhost:5000/api';

  return normalizeBaseUrl(fallback);
}

export const API_BASE_URL = resolveApiBaseUrl();
