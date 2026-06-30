import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // Send the httpOnly auth cookie with every request (same-origin via the Next
  // rewrite proxy). The JWT is never stored in JS-readable storage.
  withCredentials: true,
});

// Unwrap { data } envelope; redirect to login on 401
apiClient.interceptors.response.use(
  (response) => {
    // Backend wraps all responses in { data, statusCode }
    return response.data?.data !== undefined ? response.data.data : response.data;
  },
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      if (!window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
    }
    const message =
      error.response?.data?.message ??
      error.response?.data ??
      error.message ??
      'Something went wrong';
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);
