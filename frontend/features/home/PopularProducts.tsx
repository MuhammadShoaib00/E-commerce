'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { recommendationsApi } from '@/lib/api/recommendations';
import { ProductCard } from '@/features/catalog/ProductCard';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Home-page "Popular Products" row - real products pulled from the API
 * (top-sellers / personalized recommendations), rendered with the shared,
 * fully-functional ProductCard (working add-to-cart + links to detail pages).
 */
export function PopularProducts() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['home-popular'],
    queryFn: recommendationsApi.get,
  });

  if (isLoading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[360px] animate-pulse rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 aspect-[4/3] rounded-xl bg-neutral-100" />
            <div className="h-4 w-20 rounded bg-neutral-100" />
            <div className="mt-4 h-5 w-4/5 rounded bg-neutral-100" />
            <div className="mt-3 h-4 w-32 rounded bg-neutral-100" />
            <div className="mt-10 flex items-center justify-between">
              <div className="h-6 w-24 rounded bg-neutral-100" />
              <div className="h-11 w-11 rounded-full bg-neutral-100" />
            </div>
          </div>
        ))}
        <span className="sr-only">
          <Spinner size="sm" />
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white px-6 py-10 text-center shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-50 text-primary-600">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-lg font-black text-neutral-950">Products are not loading</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
          Start the backend API on port 4000, then refresh to load products from the catalog.
        </p>
        <Link
          href="/products"
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary-600 transition hover:text-primary-700"
        >
          Open catalog <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-12 text-center shadow-sm">
        <h3 className="text-lg font-black text-neutral-950">No products available yet</h3>
        <p className="mt-2 text-sm text-neutral-500">
          Add products in the admin panel or run the backend seed script.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {data.slice(0, 4).map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
