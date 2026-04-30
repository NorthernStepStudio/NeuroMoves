import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACTIVE_CHILD_ID_KEY,
  AUTH_PARENT_KEY,
  AUTH_TOKEN_KEY,
  CHILDREN_CACHE_KEY
} from '../core/storageKeys';
import { API_BASE_URL } from './ApiConfig';

export interface ParentAccount {
  id: number;
  email: string;
  display_name?: string;
  google_sub?: string | null;
  auth_provider?: 'local' | 'google';
}

export interface ChildProfile {
  id: number;
  name: string;
  language: string;
  age_months?: number;
  created_at?: string;
  parent_id?: number;
}

export interface CompanionSyncPayload {
  journal_entries: Array<{
    id: string;
    text: string;
    photo_uri?: string;
    created_at: string;
  }>;
  avatar_profile: {
    bodyColor: string;
    face: string;
    hat: string;
    accessory: string;
    background: string;
  };
  achievement_unlocks: Record<string, string>;
}

export interface CompanionSyncResponse {
  success: boolean;
  journal_entries: Array<{
    id: string;
    text: string;
    photo_uri?: string;
    created_at: string;
  }>;
  avatar_profile: {
    bodyColor: string;
    face: string;
    hat: string;
    accessory: string;
    background: string;
  };
  achievement_unlocks: Record<string, string>;
  counts?: {
    journal_entries_synced?: number;
    achievement_unlocks_synced?: number;
  };
}

export interface AuthResponse {
  success: boolean;
  token: string;
  parent: ParentAccount;
  children: ChildProfile[];
  error?: string;
}

export interface StoredSession {
  token: string | null;
  parent: ParentAccount | null;
  children: ChildProfile[];
  activeChildId: number | null;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  return payload as T;
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function isMockToken(token: string | null): boolean {
  return !!token && token.startsWith('mock-dev-token');
}

export class AccountService {
  static async getStoredSession(): Promise<StoredSession> {
    const [token, parent, children, activeChildRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_TOKEN_KEY),
      readJson<ParentAccount>(AUTH_PARENT_KEY),
      readJson<ChildProfile[]>(CHILDREN_CACHE_KEY),
      AsyncStorage.getItem(ACTIVE_CHILD_ID_KEY)
    ]);

    return {
      token,
      parent,
      children: children || [],
      activeChildId: activeChildRaw ? Number(activeChildRaw) : null
    };
  }

  static async persistSession(auth: AuthResponse): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(AUTH_TOKEN_KEY, auth.token),
      AsyncStorage.setItem(AUTH_PARENT_KEY, JSON.stringify(auth.parent)),
      AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(auth.children || []))
    ]);

    if (auth.children?.length) {
      const firstChildId = auth.children[0].id;
      await AsyncStorage.setItem(ACTIVE_CHILD_ID_KEY, String(firstChildId));
    } else {
      await AsyncStorage.removeItem(ACTIVE_CHILD_ID_KEY);
    }
  }

  static async clearSession(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(AUTH_TOKEN_KEY),
      AsyncStorage.removeItem(AUTH_PARENT_KEY),
      AsyncStorage.removeItem(CHILDREN_CACHE_KEY),
      AsyncStorage.removeItem(ACTIVE_CHILD_ID_KEY)
    ]);
  }

  static async getAccessToken(): Promise<string | null> {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }

  static async getActiveChildId(): Promise<number | null> {
    const raw = await AsyncStorage.getItem(ACTIVE_CHILD_ID_KEY);
    return raw ? Number(raw) : null;
  }

  static async setActiveChildId(childId: number): Promise<void> {
    await AsyncStorage.setItem(ACTIVE_CHILD_ID_KEY, String(childId));
  }

  static async signup(payload: {
    email: string;
    password: string;
    name?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return parseApiResponse<AuthResponse>(response);
  }

  static async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return parseApiResponse<AuthResponse>(response);
  }

  static async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id_token: idToken })
    });
    return parseApiResponse<AuthResponse>(response);
  }

  static async requestPasswordReset(email: string): Promise<{ success: boolean; debug_code?: string; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ email })
    });
    return parseApiResponse<{ success: boolean; debug_code?: string; message?: string }>(response);
  }

  static async confirmPasswordReset(payload: {
    email: string;
    code: string;
    new_password: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    return parseApiResponse<AuthResponse>(response);
  }

  static async fetchMe(token: string): Promise<{ success: boolean; parent: ParentAccount; children: ChildProfile[] }> {
    if (isMockToken(token)) {
      return {
        success: true,
        parent: { id: 999, email: 'dev@reallifesteps.com', display_name: 'Developer Account', auth_provider: 'local' },
        children: [{ id: 101, name: 'Sammy (Mock)', language: 'en', age_months: 36 }]
      };
    }
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: authHeaders(token)
    });
    return parseApiResponse<{ success: boolean; parent: ParentAccount; children: ChildProfile[] }>(response);
  }

  static async logout(token: string): Promise<void> {
    if (isMockToken(token)) return;
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: authHeaders(token)
    }).catch(() => undefined);
  }

  static async listChildren(token: string): Promise<ChildProfile[]> {
    if (isMockToken(token)) {
      return [{ id: 101, name: 'Sammy (Mock', language: 'en', age_months: 36 }];
    }
    const response = await fetch(`${API_BASE_URL}/children`, {
      method: 'GET',
      headers: authHeaders(token)
    });
    const data = await parseApiResponse<{ success: boolean; children: ChildProfile[] }>(response);
    await AsyncStorage.setItem(CHILDREN_CACHE_KEY, JSON.stringify(data.children || []));
    return data.children || [];
  }

  static async createChild(
    token: string,
    payload: { name: string; language: string; age_months: number }
  ): Promise<ChildProfile> {
    if (isMockToken(token)) {
      return { id: 100 + Date.now() % 1000, ...payload };
    }
    const response = await fetch(`${API_BASE_URL}/children`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await parseApiResponse<{ success: boolean; child: ChildProfile }>(response);
    return data.child;
  }

  static async updateChild(
    token: string,
    childId: number,
    payload: Partial<{ name: string; language: string; age_months: number }>
  ): Promise<ChildProfile> {
    const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    });
    const data = await parseApiResponse<{ success: boolean; child: ChildProfile }>(response);
    return data.child;
  }

  static async deleteChild(token: string, childId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/children/${childId}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    await parseApiResponse<{ success: boolean }>(response);
  }

  static async syncCompanionData(
    token: string,
    childId: number,
    payload: CompanionSyncPayload
  ): Promise<CompanionSyncResponse> {
    if (isMockToken(token)) {
      return {
        success: true,
        journal_entries: payload.journal_entries,
        avatar_profile: payload.avatar_profile,
        achievement_unlocks: payload.achievement_unlocks,
        counts: { journal_entries_synced: payload.journal_entries.length, achievement_unlocks_synced: Object.keys(payload.achievement_unlocks).length }
      };
    }
    const response = await fetch(`${API_BASE_URL}/users/${childId}/companion/sync`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(payload)
    });
    return parseApiResponse<CompanionSyncResponse>(response);
  }

  static async fetchCompanionData(token: string, childId: number): Promise<CompanionSyncResponse> {
    if (isMockToken(token)) {
      return {
        success: true,
        journal_entries: [],
        avatar_profile: { bodyColor: '#3b82f6', face: 'default', hat: 'none', accessory: 'none', background: 'garden' },
        achievement_unlocks: {}
      };
    }
    const response = await fetch(`${API_BASE_URL}/users/${childId}/companion`, {
      method: 'GET',
      headers: authHeaders(token)
    });
    return parseApiResponse<CompanionSyncResponse>(response);
  }

  static async deleteJournalEntry(token: string, childId: number, entryId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/users/${childId}/journal/${encodeURIComponent(entryId)}`, {
      method: 'DELETE',
      headers: authHeaders(token)
    });
    await parseApiResponse<{ success: boolean }>(response);
  }

  static async loginMock(): Promise<AuthResponse> {
    return {
      success: true,
      token: 'mock-dev-token-' + Date.now(),
      parent: {
        id: 999,
        email: 'dev@reallifesteps.com',
        display_name: 'Developer Account',
        auth_provider: 'local'
      },
      children: [
        {
          id: 101,
          name: 'Sammy (Mock)',
          language: 'en',
          age_months: 36
        }
      ]
    };
  }
}
