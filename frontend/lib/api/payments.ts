import { apiClient } from './client';

export interface PaymentIntentResponse {
  clientSecret: string;
  amount: number;
  currency: string;
  mode: 'stripe' | 'mock';
}

export const paymentsApi = {
  /** Create a PaymentIntent for the current cart (amount computed server-side). */
  createIntent: () =>
    apiClient.post('/payments/intent') as unknown as Promise<PaymentIntentResponse>,
};
