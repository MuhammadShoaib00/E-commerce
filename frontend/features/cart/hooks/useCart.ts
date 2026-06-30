'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/cart';
import { useCartStore } from '@/lib/store/cartStore';
import { useGuestCartStore, cartTotal } from '@/lib/store/guestCart';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { CartItem, Product } from '@/types';

/**
 * One cart API for the whole storefront, regardless of auth state.
 *
 * - Logged in  → server cart (React Query, persists across sessions/devices).
 * - Logged out → guest cart in sessionStorage (4h TTL, merged on login).
 *
 * All mutators are async and throw on failure so callers can `try/catch` and
 * surface a toast. The cart-badge count is kept in sync from here.
 */
export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const setItemCount = useCartStore((s) => s.setItemCount);
  const [isMutating, setIsMutating] = useState(false);

  // --- guest store ---
  const guest = useGuestCartStore();
  useEffect(() => {
    if (!guest.hydrated) guest.hydrate();
  }, [guest]);

  // --- server cart ---
  const serverQuery = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: !!user,
  });

  const items: CartItem[] = user ? serverQuery.data?.items ?? [] : guest.items;
  const total = user ? serverQuery.data?.total ?? cartTotal(items) : cartTotal(guest.items);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const isLoading = user ? serverQuery.isLoading : !guest.hydrated;

  // Keep the navbar badge in sync.
  useEffect(() => {
    setItemCount(itemCount);
  }, [itemCount, setItemCount]);

  const refreshServer = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    [queryClient],
  );

  const addItem = useCallback(
    async (product: Product, qty = 1) => {
      setIsMutating(true);
      try {
        if (user) {
          await cartApi.addItem(product._id, qty);
          await refreshServer();
        } else {
          guest.add(product, qty);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [user, guest, refreshServer],
  );

  const updateItem = useCallback(
    async (productId: string, qty: number) => {
      setIsMutating(true);
      try {
        if (user) {
          await cartApi.updateItem(productId, qty);
          await refreshServer();
        } else {
          guest.update(productId, qty);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [user, guest, refreshServer],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setIsMutating(true);
      try {
        if (user) {
          await cartApi.removeItem(productId);
          await refreshServer();
        } else {
          guest.remove(productId);
        }
      } finally {
        setIsMutating(false);
      }
    },
    [user, guest, refreshServer],
  );

  const clear = useCallback(async () => {
    if (user) {
      await cartApi.clear();
      await refreshServer();
    } else {
      guest.clear();
    }
  }, [user, guest, refreshServer]);

  return {
    items,
    total,
    itemCount,
    isLoading,
    isMutating,
    isGuest: !user,
    addItem,
    updateItem,
    removeItem,
    clear,
  };
}
