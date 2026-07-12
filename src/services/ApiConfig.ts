import Constants from 'expo-constants';
import { Platform } from 'react-native';

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function extractHostFromUri(uri: string | null | undefined): string | null {
  if (!uri) return null;

  const trimmed = uri.trim();
  if (!trimmed) return null;

  try {
    const normalized = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    const host = new URL(normalized).hostname.trim();
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return null;
    }
    return host;
  } catch {
    const host = trimmed.split(':', 1)[0].trim();
    if (!host || host === 'localhost' || host === '127.0.0.1') {
      return null;
    }
    return host;
  }
}

function resolveLocalDevBaseUrl(): string {
  const expoHost =
    extractHostFromUri(Constants.expoConfig?.hostUri) ??
    extractHostFromUri(Constants.expoGoConfig?.hostUri);

  if (expoHost) {
    if (expoHost.includes('ngrok') || expoHost.includes('expo.direct')) {
      console.warn(
        `[ApiConfig] Tunnel detected in hostUri ('${expoHost}'). Port 5000 is not automatically tunneled by Expo. ` +
        `Please configure EXPO_PUBLIC_API_BASE_URL_DEV in your .env file to direct the app to your backend API.`
      );
    }
    return `http://${expoHost}:5000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://127.0.0.1:5000/api';
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

  return normalizeBaseUrl(resolveLocalDevBaseUrl());
}

export const API_BASE_URL = resolveApiBaseUrl();
