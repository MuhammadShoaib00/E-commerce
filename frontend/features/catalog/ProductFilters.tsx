'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import type { Category, ProductQueryParams } from '@/types';

interface ProductFiltersProps {
  filters: ProductQueryParams;
  categories: Category[];
  onChange: (filters: ProductQueryParams) => void;
}

export function ProductFilters({ filters, categories, onChange }: ProductFiltersProps) {
  const hasActiveFilters =
    filters.search || filters.category || filters.minPrice || filters.maxPrice;

  const update = (patch: Partial<ProductQueryParams>) =>
    onChange({ ...filters, ...patch, page: 1 });

  const reset = () =>
    onChange({ sort: filters.sort, page: 1, limit: filters.limit });

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Filters</h2>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={reset} leftIcon={<X className="h-3 w-3" />}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Input
          placeholder="Search products..."
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          leftIcon={<Search className="h-4 w-4" />}
        />

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Category
          </label>
          <Select
            value={filters.category ?? ''}
            onChange={(e) => update({ category: e.target.value || undefined })}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Price range
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              min={0}
              value={filters.minPrice !== undefined ? filters.minPrice / 100 : ''}
              onChange={(e) =>
                update({ minPrice: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined })
              }
              className="w-full"
            />
            <span className="shrink-0 text-neutral-400">-</span>
            <Input
              type="number"
              placeholder="Max"
              min={0}
              value={filters.maxPrice !== undefined ? filters.maxPrice / 100 : ''}
              onChange={(e) =>
                update({ maxPrice: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined })
              }
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Sort by
          </label>
          <Select
            value={filters.sort ?? 'newest'}
            onChange={(e) => update({ sort: e.target.value as ProductQueryParams['sort'] })}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
