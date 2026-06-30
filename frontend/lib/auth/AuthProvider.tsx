'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { cartApi } from '../api/cart';
import { getStoredGuestItems, clearGuestCartStorage } from '../store/guestCart';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Merge any guest (sessionStorage) cart into the server cart after auth, then
  // clear it. Per-item failures (e.g. stock changed) are ignored so the rest of
  // the cart still merges; checkout re-validates everything anyway.
  const mergeGuestCart = useCallback(async () => {
    const guestItems = getStoredGuestItems();
    if (!guestItems.length) return;
    for (const item of guestItems) {
      try {
        await cartApi.addItem(item.productId._id, item.quantity);
      } catch {
        /* skip lines that can't be merged */
      }
    }
    clearGuestCartStorage();
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  }, [queryClient]);

  // Restore session on mount via the httpOnly cookie (sent automatically).
  // No token is read from JS — /auth/me succeeds only if the cookie is valid.
  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password }); // sets httpOnly cookie
    await mergeGuestCart();
    setUser(res.user);
  }, [mergeGuestCart]);

  const signup = useCallback(async (email: string, name: string, password: string) => {
    const res = await authApi.signup({ email, name, password }); // sets httpOnly cookie
    await mergeGuestCart();
    setUser(res.user);
  }, [mergeGuestCart]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(); // clears the httpOnly cookie server-side
    } catch {
      /* ignore */
    }
    setUser(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAdmin: user?.role === 'admin', login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
