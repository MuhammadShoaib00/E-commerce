import { describe, it, expect, beforeEach } from 'vitest';
import { useGuestCartStore, cartTotal, getStoredGuestItems } from './guestCart';
import type { Product } from '@/types';

const product = (over: Partial<Product> = {}): Product => ({
  _id: 'p1',
  name: 'Widget',
  description: 'd',
  price: 1000,
  stockQuantity: 5,
  ...over,
});

describe('guest cart store', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useGuestCartStore.setState({ items: [], hydrated: true });
  });

  it('adds an item and persists it to sessionStorage', () => {
    useGuestCartStore.getState().add(product(), 2);
    const items = useGuestCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    // survives a reload via storage
    expect(getStoredGuestItems()[0].quantity).toBe(2);
  });

  it('accumulates quantity on repeated adds (not overwrite)', () => {
    const p = product();
    useGuestCartStore.getState().add(p, 2);
    useGuestCartStore.getState().add(p, 1);
    expect(useGuestCartStore.getState().items[0].quantity).toBe(3);
  });

  it('rejects exceeding stock cumulatively', () => {
    const p = product({ stockQuantity: 3 });
    useGuestCartStore.getState().add(p, 2);
    expect(() => useGuestCartStore.getState().add(p, 2)).toThrow(/Only 3/);
    // line unchanged after the rejected add
    expect(useGuestCartStore.getState().items[0].quantity).toBe(2);
  });

  it('cartTotal multiplies price by quantity', () => {
    expect(cartTotal([{ productId: product({ price: 1500 }), quantity: 3 }])).toBe(4500);
  });
});
