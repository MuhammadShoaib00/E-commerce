'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star } from 'lucide-react';
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

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]">
      <button className="absolute right-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-500 shadow-sm transition hover:text-primary-600" aria-label={`Save ${product.name}`}>
        <Heart className="h-5 w-5" />
      </button>

      <Link href={`/products/${product._id}`} className="relative mb-4 block aspect-[4/3] overflow-hidden rounded-xl bg-white">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Badge variant="danger">Out of Stock</Badge>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        {product.category && <Badge variant="neutral">{product.category.name}</Badge>}
        <Link href={`/products/${product._id}`}>
          <h3 className="line-clamp-2 text-sm font-extrabold text-neutral-950 transition-colors hover:text-primary-600">
            {product.name}
          </h3>
        </Link>
        <p className="flex items-center gap-1 text-sm text-neutral-500">
          <Star className="h-4 w-4 fill-primary-600 text-primary-600" />
          Premium pick
        </p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-black text-neutral-950">
            {formatCurrency(product.price)}
          </span>
          <button
            onClick={handleAdd}
            disabled={outOfStock || adding}
            className="grid h-11 w-11 place-items-center rounded-full bg-primary-600 text-white shadow-[0_12px_25px_rgba(0,101,255,0.28)] transition hover:-translate-y-0.5 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Add ${product.name} to cart`}
          >
            {adding ? <span className="text-xs font-bold">...</span> : <ShoppingCart className="h-5 w-5" />}
          </button>
        </div>
        {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <p className="text-xs font-medium text-warning">Only {product.stockQuantity} left</p>
        )}
      </div>
    </div>
  );
}
