import { apiClient } from './client';
import type { AuthResponse, User } from '@/types';

export const authApi = {
  signup: (data: { email: string; name: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/signup', data) as unknown as Promise<AuthResponse>,

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data) as unknown as Promise<AuthResponse>,

  me: () =>
    apiClient.get<User>('/auth/me') as unknown as Promise<User>,

  logout: () =>
    apiClient.post('/auth/logout') as unknown as Promise<{ success: boolean }>,
};
