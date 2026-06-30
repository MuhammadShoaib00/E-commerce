'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, PackageSearch, SlidersHorizontal } from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { categoriesApi } from '@/lib/api/categories';
import { ProductCard } from '@/features/catalog/ProductCard';
import { ProductFilters } from '@/features/catalog/ProductFilters';
import { Pagination } from '@/components/ui/Pagination';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ProductQueryParams } from '@/types';

export default function ProductsPage() {
  const [filters, setFilters] = useState<ProductQueryParams>({
    sort: 'newest',
    page: 1,
    limit: 12,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
    placeholderData: (prev) => prev,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: Infinity,
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
      <div className="mb-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-primary-600">
              ShopFlow catalog
            </p>
            <h1 className="text-3xl font-black text-neutral-950 sm:text-4xl">All Products</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
              Browse backend-powered inventory with live categories, pricing, stock, and sorting.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:items-center">
            <div className="rounded-xl bg-neutral-50 px-4 py-3">
              <span className="block text-xs font-semibold uppercase text-neutral-500">Showing</span>
              <strong className="mt-1 block text-lg font-black text-neutral-950">
                {data?.items.length ?? 0}
              </strong>
            </div>
            <div className="rounded-xl bg-primary-50 px-4 py-3">
              <span className="block text-xs font-semibold uppercase text-primary-700">Total</span>
              <strong className="mt-1 block text-lg font-black text-primary-700">
                {data?.total ?? 0}
              </strong>
            </div>
          </div>
        </div>
        {data && (
          <p className="mt-5 text-sm text-neutral-500">
            {data.total} product{data.total !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-neutral-900 lg:hidden">
            <SlidersHorizontal className="h-4 w-4 text-primary-600" />
            Refine products
          </div>
          <ProductFilters
            filters={filters}
            categories={categories}
            onChange={setFilters}
          />
        </aside>

        <div className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="min-h-[360px] animate-pulse rounded-2xl border border-neutral-200 p-4">
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
          ) : isError ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary-600">
                <AlertCircle className="h-8 w-8" />
              </span>
              <h2 className="mt-5 text-xl font-black text-neutral-950">Backend products are not reachable</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-neutral-500">
                The storefront is configured for the Nest API at{' '}
                <span className="font-semibold text-neutral-700">
                  {process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'}
                </span>
                . Start the backend and refresh this page.
              </p>
              <p className="mt-2 max-w-md text-xs text-neutral-400">
                {error instanceof Error ? error.message : 'Unable to load products.'}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,101,255,0.25)] transition hover:bg-primary-700"
              >
                Try again <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : !data?.items.length ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <EmptyState
                icon={<PackageSearch className="h-10 w-10" />}
                title="No products found"
                description="Try adjusting your filters or search term."
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {data.totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    page={filters.page ?? 1}
                    totalPages={data.totalPages}
                    onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
