'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, type UseFormGetValues, type UseFormTrigger } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { ShieldCheck, CreditCard, Lock } from 'lucide-react';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { cartApi } from '@/lib/api/cart';
import { ordersApi, type CheckoutPayload } from '@/lib/api/orders';
import { paymentsApi } from '@/lib/api/payments';
import { getStripe, stripeEnabled } from '@/lib/stripe';
import { useCartStore } from '@/lib/store/cartStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/formatCurrency';

const schema = z.object({
  street: z.string().min(5, 'Enter a street address'),
  city: z.string().min(2, 'Enter a city'),
  country: z.string().min(2, 'Enter a country'),
});

type FormValues = z.infer<typeof schema>;

const stripePromise = getStripe();

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setItemCount = useCartStore((s) => s.setItemCount);
  const { toast } = useToast();

  const { data: cart, isLoading } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });

  // Create a PaymentIntent for the cart (only when Stripe is configured).
  const { data: intent } = useQuery({
    queryKey: ['payment-intent'],
    queryFn: paymentsApi.createIntent,
    enabled: stripeEnabled && !!cart?.items.length,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const checkout = useMutation({
    mutationFn: (payload: CheckoutPayload) => ordersApi.checkout(payload),
    onSuccess: (order) => {
      setItemCount(0);
      queryClient.removeQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['payment-intent'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.push(`/orders/${order._id}?success=1`);
    },
    onError: (err: Error) => toast(err.message, 'error'),
  });

  const items = cart?.items ?? [];

  // Redirect an empty cart to /cart — in an effect, never during render.
  useEffect(() => {
    if (!isLoading && items.length === 0) {
      router.replace('/cart');
    }
  }, [isLoading, items.length, router]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!items.length) {
    return null; // redirecting to /cart via the effect above
  }

  const total = cart?.total ?? 0;
  // Use Stripe Elements only once we actually have a real PaymentIntent client secret.
  const useStripeFlow = stripeEnabled && intent?.mode === 'stripe' && !!intent.clientSecret && !!stripePromise;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Checkout</h1>

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-6">
          {/* Shipping */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-base font-semibold text-neutral-900">Shipping Address</h2>
            <div className="flex flex-col gap-4">
              <FormField label="Street address" placeholder="123 Main St" error={errors.street?.message} {...register('street')} />
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City" placeholder="London" error={errors.city?.message} {...register('city')} />
                <FormField label="Country" placeholder="United Kingdom" error={errors.country?.message} {...register('country')} />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-neutral-900">
              <CreditCard className="h-5 w-5 text-primary-600" /> Payment
            </h2>

            {useStripeFlow ? (
              <Elements stripe={stripePromise} options={{ clientSecret: intent!.clientSecret, appearance: { theme: 'stripe' } }}>
                <StripePaymentForm
                  total={total}
                  trigger={trigger}
                  getValues={getValues}
                  isPlacing={checkout.isPending}
                  onConfirmed={(paymentIntentId) => checkout.mutate({ ...getValues(), paymentIntentId })}
                />
              </Elements>
            ) : (
              <form onSubmit={handleSubmit((v) => checkout.mutate(v))} className="flex flex-col gap-4">
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Mock payment mode — no Stripe key configured, so no real charge is made. Set
                    <code className="mx-1 rounded bg-amber-100 px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
                    (and the backend <code className="mx-1 rounded bg-amber-100 px-1">STRIPE_SECRET_KEY</code>) to enable the Stripe test card form.
                  </span>
                </div>
                <Button type="submit" size="lg" className="w-full" isLoading={checkout.isPending}>
                  Place Order · {formatCurrency(total)}
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-5 lg:w-72">
          <h2 className="mb-3 font-semibold text-neutral-900">Order Summary</h2>
          <div className="flex flex-col gap-2 text-sm">
            {items.map((item) => (
              <div key={item.productId._id} className="flex justify-between text-neutral-600">
                <span className="mr-2 line-clamp-1 flex-1">
                  {item.productId.name} × {item.quantity}
                </span>
                <span className="shrink-0">{formatCurrency(item.productId.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-neutral-100 pt-4 font-bold text-neutral-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StripePaymentForm({
  total,
  trigger,
  getValues,
  isPlacing,
  onConfirmed,
}: {
  total: number;
  trigger: UseFormTrigger<FormValues>;
  getValues: UseFormGetValues<FormValues>;
  isPlacing: boolean;
  onConfirmed: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const handlePay = async () => {
    // Don't confirm until the card field has actually mounted.
    if (!stripe || !elements || !ready) {
      toast('Payment form is still loading — please wait a moment', 'error');
      return;
    }
    // Validate shipping first so we don't charge before we have an address.
    if (!(await trigger())) {
      toast('Please complete your shipping address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        toast(error.message ?? 'Payment failed', 'error');
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        onConfirmed(paymentIntent.id);
      } else {
        toast(`Payment ${paymentIntent?.status ?? 'not completed'}`, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // keep getValues referenced for clarity (address is read in onConfirmed via parent)
  void getValues;

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement
        onReady={() => setReady(true)}
        onLoadError={(e) =>
          toast(
            e.error?.message ??
              'Could not load the payment form. Check that your Stripe publishable key matches the secret key.',
            'error',
          )
        }
      />
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Lock className="h-3.5 w-3.5" /> Test mode — use card 4242 4242 4242 4242, any future date & CVC.
      </div>
      <Button
        onClick={handlePay}
        size="lg"
        className="w-full"
        isLoading={submitting || isPlacing}
        disabled={!stripe || !ready}
      >
        {ready ? `Pay ${formatCurrency(total)}` : 'Loading payment…'}
      </Button>
    </div>
  );
}
