import { loadStripe, type Stripe } from '@stripe/stripe-js';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

/** True when a Stripe publishable key is configured (otherwise the app mocks payments). */
export const stripeEnabled = !!publishableKey;

let stripePromise: Promise<Stripe | null> | null = null;

/** Lazily load Stripe.js once. Returns null when no key is configured. */
export function getStripe(): Promise<Stripe | null> | null {
  if (!publishableKey) return null;
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}
