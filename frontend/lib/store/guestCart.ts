'use client';

import { create } from 'zustand';
import type { CartItem, Product } from '@/types';

/**
 * Guest (logged-out) cart.
 *
 * Persisted in sessionStorage with a hard 4-hour expiry. sessionStorage already
 * scopes the cart to the browser tab/session; the TTL caps it at 4 hours even
 * within a long-lived session. On login the guest cart is merged into the
 * server-side cart and cleared (see `mergeGuestCartToServer`).
 *
 * Items are stored in the same shape as a populated server cart line
 * ({ productId: Product, quantity }) so the cart UI renders identically for
 * guests and authenticated users. Prices here are only for display — checkout
 * always re-validates and re-prices server-side.
 */

const STORAGE_KEY = 'shopflow_guest_cart';
export const GUEST_CART_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface StoredCart {
  items: CartItem[];
  expiresAt: number;
}

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  if (!items.length) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  // Sliding 4h window: every change refreshes the expiry.
  const data: StoredCart = { items, expiresAt: Date.now() + GUEST_CART_TTL_MS };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Trim a full Product down to the snapshot the cart UI needs. */
function snapshot(product: Product): Product {
  return {
    _id: product._id,
    name: product.name,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    category: product.category,
    stockQuantity: product.stockQuantity,
  };
}

interface GuestCartState {
  items: CartItem[];
  hydrated: boolean;
  /** Load from sessionStorage (call once on mount; drops expired carts). */
  hydrate: () => void;
  /** Add qty of a product, validating the resulting line against stock. Throws on overflow. */
  add: (product: Product, qty: number) => void;
  /** Set an absolute quantity for a line. Throws if it exceeds stock. */
  update: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useGuestCartStore = create<GuestCartState>((set, get) => ({
  items: [],
  hydrated: false,

  hydrate: () => set({ items: readStorage(), hydrated: true }),

  add: (product, qty) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.productId._id === product._id);
    const current = idx >= 0 ? items[idx].quantity : 0;
    const resulting = current + qty;
    if (resulting > product.stockQuantity) {
      throw new Error(
        `Only ${product.stockQuantity} units available` +
          (current ? ` (you already have ${current} in your cart)` : ''),
      );
    }
    if (idx >= 0) {
      items[idx] = { ...items[idx], quantity: resulting, productId: snapshot(product) };
    } else {
      items.push({ productId: snapshot(product), quantity: qty });
    }
    writeStorage(items);
    set({ items });
  },

  update: (productId, qty) => {
    const items = [...get().items];
    const idx = items.findIndex((i) => i.productId._id === productId);
    if (idx < 0) return;
    if (qty < 1) {
      items.splice(idx, 1);
    } else {
      const stock = items[idx].productId.stockQuantity;
      if (qty > stock) throw new Error(`Only ${stock} units available`);
      items[idx] = { ...items[idx], quantity: qty };
    }
    writeStorage(items);
    set({ items });
  },

  remove: (productId) => {
    const items = get().items.filter((i) => i.productId._id !== productId);
    writeStorage(items);
    set({ items });
  },

  clear: () => {
    writeStorage([]);
    set({ items: [] });
  },
}));

/** Compute the order total (in cents) for a set of cart lines. */
export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + (i.productId.price ?? 0) * i.quantity, 0);
}

/** Read the guest cart straight from storage (for non-React contexts, e.g. login merge). */
export function getStoredGuestItems(): CartItem[] {
  return readStorage();
}

/** Wipe guest cart storage (after a successful merge into the server cart). */
export function clearGuestCartStorage() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(STORAGE_KEY);
}
