import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccountService, AuthResponse, ChildProfile, ParentAccount } from '../services/AccountService';

interface AuthContextValue {
  initializing: boolean;
  isAuthenticated: boolean;
  token: string | null;
  parent: ParentAccount | null;
  children: ChildProfile[];
  selectedChild: ChildProfile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginMock: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ debugCode?: string; message?: string }>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshChildren: () => Promise<void>;
  addChild: (payload: { name: string; language: string; age_months: number }) => Promise<ChildProfile>;
  updateChild: (childId: number, payload: Partial<{ name: string; language: string; age_months: number }>) => Promise<void>;
  deleteChild: (childId: number) => Promise<void>;
  selectChild: (childId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function pickSelectedChild(children: ChildProfile[], activeChildId: number | null): ChildProfile | null {
  if (!children.length) return null;
  if (activeChildId) {
    const byId = children.find(c => c.id === activeChildId);
    if (byId) return byId;
  }
  return children[0];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [parent, setParent] = useState<ParentAccount | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);

  const applyAuthPayload = useCallback(async (payload: AuthResponse) => {
    await AccountService.persistSession(payload);
    setToken(payload.token);
    setParent(payload.parent);
    setProfiles(payload.children || []);

    const activeId = await AccountService.getActiveChildId();
    const chosen = pickSelectedChild(payload.children || [], activeId);
    setSelectedChild(chosen);
    if (chosen) {
      await AccountService.setActiveChildId(chosen.id);
    }
  }, []);

  const refreshChildren = useCallback(async () => {
    if (!token) return;
    const childrenResponse = await AccountService.listChildren(token);
    setProfiles(childrenResponse);

    const activeId = await AccountService.getActiveChildId();
    const chosen = pickSelectedChild(childrenResponse, activeId);
    setSelectedChild(chosen);
    if (chosen) {
      await AccountService.setActiveChildId(chosen.id);
    }
  }, [token]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const session = await AccountService.getStoredSession();
        if (!session.token || !session.parent) {
          if (mounted) setInitializing(false);
          return;
        }

        // Add a timeout to fetchMe to avoid hanging on splash screen if backend is unreachable
        const fetchPromise = AccountService.fetchMe(session.token);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 5000)
        );

        const me = (await Promise.race([fetchPromise, timeoutPromise])) as any;

        if (!mounted) return;

        setToken(session.token);
        setParent(me.parent);
        setProfiles(me.children || []);

        const chosen = pickSelectedChild(me.children || [], session.activeChildId);
        setSelectedChild(chosen);
        if (chosen) {
          await AccountService.setActiveChildId(chosen.id);
        }
      } catch (e) {
        console.log('[AuthContext] Initialization failed:', e);
        if (mounted) {
          await AccountService.clearSession();
          setToken(null);
          setParent(null);
          setProfiles([]);
        }
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await AccountService.login({ email, password });
    await applyAuthPayload(result);
  }, [applyAuthPayload]);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    const result = await AccountService.signup({ email, password, name });
    await applyAuthPayload(result);
  }, [applyAuthPayload]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const result = await AccountService.loginWithGoogle(idToken);
    await applyAuthPayload(result);
  }, [applyAuthPayload]);

  const loginMock = useCallback(async () => {
    const result = await AccountService.loginMock();
    await applyAuthPayload(result);
  }, [applyAuthPayload]);

  const requestPasswordReset = useCallback(async (email: string) => {
    const result = await AccountService.requestPasswordReset(email);
    return { debugCode: result.debug_code, message: result.message };
  }, []);

  const confirmPasswordReset = useCallback(async (email: string, code: string, newPassword: string) => {
    const result = await AccountService.confirmPasswordReset({
      email,
      code,
      new_password: newPassword
    });
    await applyAuthPayload(result);
  }, [applyAuthPayload]);

  const logout = useCallback(async () => {
    const sessionToken = token;
    setToken(null);
    setParent(null);
    setProfiles([]);
    setSelectedChild(null);
    await AccountService.clearSession();
    if (sessionToken) {
      await AccountService.logout(sessionToken);
    }
  }, [token]);

  const addChild = useCallback(async (payload: { name: string; language: string; age_months: number }) => {
    if (!token) throw new Error('Not authenticated');
    const child = await AccountService.createChild(token, payload);
    const next = [...profiles, child];
    setProfiles(next);

    if (!selectedChild) {
      await AccountService.setActiveChildId(child.id);
      setSelectedChild(child);
    }
    await refreshChildren();
    return child;
  }, [profiles, refreshChildren, selectedChild, token]);

  const updateChild = useCallback(async (
    childId: number,
    payload: Partial<{ name: string; language: string; age_months: number }>
  ) => {
    if (!token) throw new Error('Not authenticated');
    await AccountService.updateChild(token, childId, payload);
    await refreshChildren();
  }, [refreshChildren, token]);

  const deleteChild = useCallback(async (childId: number) => {
    if (!token) throw new Error('Not authenticated');
    await AccountService.deleteChild(token, childId);
    await refreshChildren();
  }, [refreshChildren, token]);

  const selectChild = useCallback(async (childId: number) => {
    const target = profiles.find(c => c.id === childId) || null;
    if (!target) throw new Error('Child profile not found');
    await AccountService.setActiveChildId(target.id);
    setSelectedChild(target);
  }, [profiles]);

  const value = useMemo<AuthContextValue>(() => ({
    initializing,
    isAuthenticated: Boolean(token && parent),
    token,
    parent,
    children: profiles,
    selectedChild,
    login,
    signup,
    loginWithGoogle,
    loginMock,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    refreshChildren,
    addChild,
    updateChild,
    deleteChild,
    selectChild
  }), [
    addChild,
    confirmPasswordReset,
    deleteChild,
    initializing,
    login,
    loginWithGoogle,
    logout,
    parent,
    profiles,
    refreshChildren,
    requestPasswordReset,
    selectedChild,
    selectChild,
    signup,
    token,
    updateChild
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
