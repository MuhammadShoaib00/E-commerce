import { apiClient } from './client';
import type { Order } from '@/types';

export interface CheckoutPayload {
  street?: string;
  city?: string;
  country?: string;
  /** Stripe PaymentIntent id (omitted in mock mode). */
  paymentIntentId?: string;
}

export const ordersApi = {
  checkout: (payload?: CheckoutPayload) =>
    apiClient.post('/orders/checkout', payload ?? {}) as unknown as Promise<Order>,

  list: () =>
    apiClient.get('/orders') as unknown as Promise<Order[]>,

  getById: (id: string) =>
    apiClient.get(`/orders/${id}`) as unknown as Promise<Order>,
};
