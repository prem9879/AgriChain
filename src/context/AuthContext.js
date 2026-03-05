/**
 * AGRI-मित्र Authentication Context
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Manages JWT-based authentication state across the app.
 * Provides login, register, logout, profile update functionality.
 * Token is persisted in AsyncStorage and attached to API requests.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.203.179.61:8000';

const TOKEN_KEY = '@agrimitra_auth_token';
const USER_KEY = '@agrimitra_auth_user';

const AuthContext = createContext(null);

// ─── Authenticated API client ────────────────────────────────────────────────

const authApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════════════════════

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Set auth header whenever token changes ────────────────────────────
  useEffect(() => {
    if (token) {
      authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete authApi.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ─── Restore session on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          // Validate token in background
          authApi.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          try {
            const { data } = await authApi.get('/auth/me');
            setUser(data);
            await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
          } catch {
            // Token expired — clear session
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // Storage error — start fresh
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Persist helpers ───────────────────────────────────────────────────
  const saveSession = useCallback(async (tokenValue, userData) => {
    setToken(tokenValue);
    setUser(userData);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, tokenValue),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
    ]);
  }, []);

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════════════════════════════════════

  const register = useCallback(async (formData) => {
    const { data } = await authApi.post('/auth/register', formData);
    await saveSession(data.access_token, data.user);
    return data;
  }, [saveSession]);

  const login = useCallback(async (phone, password, options = {}) => {
    // --- Instant demo login (no backend needed) ---
    if (options.skipBackend && options.demoUser && options.demoToken) {
      console.log('[Auth] instant demo login:', options.demoUser.full_name);
      await saveSession(options.demoToken, options.demoUser);
      return { access_token: options.demoToken, user: options.demoUser };
    }

    console.log('[Auth] login attempt:', phone, BASE_URL);

    // Pre-check connectivity before hitting the server
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected || netState.isInternetReachable === false) {
        const offlineErr = new Error('No internet connection. Check your WiFi or mobile data.');
        offlineErr.code = 'NO_INTERNET';
        offlineErr._friendlyMessage = offlineErr.message;
        throw offlineErr;
      }
    } catch (netErr) {
      if (netErr.code === 'NO_INTERNET') throw netErr;
      // NetInfo itself failed — proceed with login attempt anyway
    }

    try {
      const { data } = await authApi.post('/auth/login', { phone, password });
      console.log('[Auth] login success:', data.user?.full_name);
      await saveSession(data.access_token, data.user);
      return data;
    } catch (err) {
      console.log('[Auth] login error:', err.message, err.code, err?.response?.status);
      // Enrich error with friendly message
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        err._friendlyMessage = 'Cannot reach the server. Ensure backend is running and device is on the same network.';
      } else if (err.code === 'ECONNABORTED') {
        err._friendlyMessage = 'Server timeout — is backend running?';
      }
      throw err;
    }
  }, [saveSession]);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async (updates) => {
    const { data } = await authApi.put('/auth/me', updates);
    setUser(data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    return data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await authApi.put('/auth/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await authApi.get('/auth/me');
    setUser(data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    return data;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export default AuthContext;
