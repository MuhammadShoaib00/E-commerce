import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type PaymentMode = 'stripe' | 'mock';

export interface PaymentIntentResult {
  clientSecret: string;
  amount: number;
  currency: string;
  mode: PaymentMode;
}

/**
 * Wraps Stripe (test mode) with a graceful mock fallback.
 *
 * When STRIPE_SECRET_KEY is set we create real test-mode PaymentIntents and
 * verify them server-side before an order is created. When it's absent the app
 * still works end-to-end via a mock so it runs out-of-the-box for reviewers.
 *
 * Amounts are integer minor units (cents) — the same unit prices are stored in.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  private readonly currency: string;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('stripeSecretKey');
    this.currency = (this.config.get<string>('currency') ?? 'usd').toLowerCase();
    this.stripe = key ? new Stripe(key) : null;
    if (!this.stripe) {
      this.logger.warn('STRIPE_SECRET_KEY not set — using MOCK payments.');
    }
  }

  get enabled(): boolean {
    return this.stripe !== null;
  }

  /** Create a PaymentIntent for the given (server-computed) amount in cents. */
  async createPaymentIntent(amount: number, userId: string): Promise<PaymentIntentResult> {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Cart total must be greater than zero');
    }
    if (!this.stripe) {
      return { clientSecret: `mock_secret_${Date.now()}`, amount, currency: this.currency, mode: 'mock' };
    }
    const intent = await this.stripe.paymentIntents.create({
      amount,
      currency: this.currency,
      automatic_payment_methods: { enabled: true },
      metadata: { userId },
    });
    return {
      clientSecret: intent.client_secret as string,
      amount,
      currency: this.currency,
      mode: 'stripe',
    };
  }

  /**
   * Verify a payment server-side and return the reference to store on the order.
   * In mock mode it always succeeds. In Stripe mode it requires a succeeded
   * PaymentIntent whose amount and owner match the order being created.
   */
  async verifyPayment(
    paymentIntentId: string | undefined,
    expectedAmount: number,
    userId: string,
  ): Promise<string> {
    if (!this.stripe) {
      return `mock_${Date.now()}_${userId.slice(-6)}`;
    }
    if (!paymentIntentId) {
      throw new BadRequestException('Missing payment confirmation');
    }
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== 'succeeded') {
      throw new BadRequestException(`Payment not completed (status: ${intent.status})`);
    }
    if (intent.amount !== expectedAmount) {
      throw new BadRequestException('Payment amount does not match the order total');
    }
    if (intent.metadata?.userId && intent.metadata.userId !== userId) {
      throw new BadRequestException('Payment does not belong to this account');
    }
    return intent.id;
  }

  /**
   * Best-effort refund of a charge — used when order creation fails *after* a
   * successful payment, so we never keep money for an order that wasn't created.
   * No-op in mock mode; never throws (failures are logged for manual follow-up).
   */
  async refundPayment(paymentRef: string): Promise<void> {
    if (!this.stripe || !paymentRef || paymentRef.startsWith('mock_')) return;
    try {
      await this.stripe.refunds.create({ payment_intent: paymentRef });
      this.logger.warn(`Refunded ${paymentRef} after a post-payment checkout failure`);
    } catch (e) {
      this.logger.error(
        `CRITICAL: failed to refund ${paymentRef} — needs manual refund`,
        e instanceof Error ? e.stack : String(e),
      );
    }
  }
}
