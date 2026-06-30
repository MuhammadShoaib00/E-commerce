import { apiClient } from './client';
import type { PaginatedResponse, Product, ProductQueryParams } from '@/types';

export const productsApi = {
  list: (params?: ProductQueryParams) =>
    apiClient.get('/products', { params }) as unknown as Promise<PaginatedResponse<Product>>,

  getById: (id: string) =>
    apiClient.get(`/products/${id}`) as unknown as Promise<Product>,

  getRelated: (id: string) =>
    apiClient.get(`/products/${id}/related`) as unknown as Promise<Product[]>,
};
