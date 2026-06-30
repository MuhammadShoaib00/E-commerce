'use client';

import { useQuery } from '@tanstack/react-query';
import { productsApi } from '@/lib/api/products';
import { ProductCard } from './ProductCard';

/**
 * Content-based "related products" for the detail page (same category, newest
 * first — served by GET /products/:id/related). Renders nothing when empty.
 */
export function RelatedProducts({ productId }: { productId: string }) {
  const { data } = useQuery({
    queryKey: ['related', productId],
    queryFn: () => productsApi.getRelated(productId),
  });

  if (!data?.length) return null;

  return (
    <section className="mt-12">
      <h2 className="mb-5 text-xl font-bold text-neutral-900">You might also like</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  );
}
