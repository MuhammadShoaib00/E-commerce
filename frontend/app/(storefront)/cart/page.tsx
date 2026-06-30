'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Trash2, Minus, Plus, ShoppingBag, LogIn } from 'lucide-react';
import { useCart } from '@/features/cart/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/lib/utils/formatCurrency';

export default function CartPage() {
  const { items, total, itemCount, isLoading, isGuest, updateItem, removeItem } = useCart();
  const { toast } = useToast();

  const change = async (productId: string, quantity: number) => {
    try {
      await updateItem(productId, quantity);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update item', 'error');
    }
  };

  const drop = async (productId: string) => {
    try {
      await removeItem(productId);
      toast('Item removed from cart', 'info');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove item', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          title="Your cart is empty"
          description="Add some products to get started."
          action={{ label: 'Browse products', onClick: () => (window.location.href = '/products') }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-6">Your Cart</h1>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Items */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100">
          {items.map((item) => {
            const product = item.productId;
            const lineTotal = product.price * item.quantity;

            return (
              <div key={product._id} className="flex gap-4 p-4">
                <div className="relative w-20 h-20 rounded-xl bg-neutral-50 overflow-hidden shrink-0">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <Link href={`/products/${product._id}`} className="text-sm font-semibold text-neutral-900 hover:text-primary-600 line-clamp-1">
                    {product.name}
                  </Link>
                  <p className="text-sm text-neutral-500">{formatCurrency(product.price)} each</p>

                  <div className="flex items-center gap-2 mt-auto">
                    <button
                      onClick={() => change(product._id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-7 h-7 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                      aria-label="Decrease"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => change(product._id, item.quantity + 1)}
                      disabled={item.quantity >= product.stockQuantity}
                      className="w-7 h-7 rounded-md border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                      aria-label="Increase"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => drop(product._id)}
                      className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-neutral-900">{formatCurrency(lineTotal)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="w-full lg:w-72 bg-white rounded-2xl border border-neutral-200 p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-neutral-900">Order Summary</h2>
          <div className="flex justify-between text-sm text-neutral-600">
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="border-t border-neutral-100 pt-4 flex justify-between font-bold text-neutral-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>

          {isGuest ? (
            <>
              <Link href="/auth/login?redirect=/checkout">
                <Button className="w-full" size="lg" leftIcon={<LogIn className="w-4 h-4" />}>
                  Sign in to checkout
                </Button>
              </Link>
              <p className="text-center text-xs text-neutral-500">
                Your cart is saved for 4 hours and will move to your account when you sign in.
              </p>
            </>
          ) : (
            <Link href="/checkout">
              <Button className="w-full" size="lg">
                Proceed to Checkout
              </Button>
            </Link>
          )}

          <Link href="/products" className="text-center text-sm text-primary-600 hover:underline">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
