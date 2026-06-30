'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, ArrowLeft, Minus, Plus } from 'lucide-react';
import { productsApi } from '@/lib/api/products';
import { useCart } from '@/features/cart/hooks/useCart';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ProductMedia } from '@/features/catalog/ProductMedia';
import { RelatedProducts } from '@/features/catalog/RelatedProducts';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id),
  });

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product, qty);
      toast(`Added ${qty} × "${product.name}" to cart`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add to cart', 'error');
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-neutral-500">Product not found.</p>
        <Link href="/products" className="mt-4 inline-block text-primary-600 hover:underline">
          ← Back to products
        </Link>
      </div>
    );
  }

  const outOfStock = product.stockQuantity === 0;
  const maxQty = Math.min(product.stockQuantity, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to products
      </Link>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Media: image + interactive 3D preview */}
          <ProductMedia imageUrl={product.imageUrl} name={product.name} />

          {/* Details */}
          <div className="p-8 flex flex-col gap-5">
            {product.category && (
              <Badge variant="neutral">{product.category.name}</Badge>
            )}

            <div>
              <h1 className="text-2xl font-bold text-neutral-900 leading-snug">{product.name}</h1>
              <p className="text-3xl font-extrabold text-neutral-900 mt-3">
                {formatCurrency(product.price)}
              </p>
            </div>

            {product.description && (
              <p className="text-neutral-600 text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Stock */}
            <div>
              {outOfStock ? (
                <Badge variant="danger">Out of Stock</Badge>
              ) : product.stockQuantity <= 5 ? (
                <span className="text-sm font-medium text-warning">
                  Only {product.stockQuantity} left in stock
                </span>
              ) : (
                <span className="text-sm text-green-600 font-medium">In Stock</span>
              )}
            </div>

            {/* Quantity */}
            {!outOfStock && (
              <div>
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                    disabled={qty <= 1}
                    aria-label="Decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold text-neutral-900">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                    className="w-9 h-9 rounded-lg border border-neutral-300 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                    disabled={qty >= maxQty}
                    aria-label="Increase"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <Button
              size="lg"
              leftIcon={<ShoppingCart className="w-5 h-5" />}
              isLoading={adding}
              disabled={outOfStock}
              onClick={handleAddToCart}
              className="mt-2"
            >
              {outOfStock ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>

      <RelatedProducts productId={id} />
    </div>
  );
}
