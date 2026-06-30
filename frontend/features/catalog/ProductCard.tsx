'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '@/features/cart/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { Badge } from '@/components/ui/Badge';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addItem(product, 1);
      toast(`"${product.name}" added to cart`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  const outOfStock = product.stockQuantity === 0;
  const lowStock = product.stockQuantity > 0 && product.stockQuantity <= 5;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200/70 bg-white p-3 shadow-[var(--shadow-card)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[var(--shadow-elevated)]">
      <Link
        href={`/products/${product._id}`}
        className="relative mb-4 block aspect-square overflow-hidden rounded-[calc(var(--radius-2xl)-0.5rem)] bg-neutral-50"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Wishlist */}
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-neutral-500 opacity-0 shadow-sm backdrop-blur transition duration-300 hover:text-primary-600 group-hover:opacity-100">
          <Heart className="h-[18px] w-[18px]" />
        </span>

        {lowStock && (
          <span className="absolute left-3 top-3 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-accent)]">
            Only {product.stockQuantity} left
          </span>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <Badge variant="danger">Out of Stock</Badge>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            {product.category.name}
          </span>
        )}
        <Link href={`/products/${product._id}`}>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-primary-700">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="font-display text-xl font-semibold text-neutral-900">
            {formatCurrency(product.price)}
          </span>
          <button
            onClick={handleAdd}
            disabled={outOfStock || adding}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-sm font-semibold text-white transition duration-300 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Add ${product.name} to cart`}
          >
            {adding ? (
              <span className="text-xs font-bold">···</span>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
