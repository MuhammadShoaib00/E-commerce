'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  ShoppingCart,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCart } from '@/features/cart/hooks/useCart';
import { cn } from '@/lib/utils/cn';
import { Button } from '../ui/Button';

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { itemCount } = useCart();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/products', label: 'Shop' },
    { href: '/products?sort=newest', label: 'New Arrivals' },
    ...(user ? [{ href: '/orders', label: 'My Orders' }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/95 text-white backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-2xl font-black uppercase tracking-[0.04em] text-white">
            <Package className="h-7 w-7 text-primary-500 transition group-hover:rotate-6" />
            <span>
              Shop<span className="text-primary-500">Flow</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {navLinks.map(({ href, label }) => {
              const hrefPath = href.split('?')[0];
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(hrefPath);

              return (
                <Link
                  key={`${href}-${label}`}
                  href={href}
                  className={cn(
                    'relative inline-flex items-center gap-1.5 py-2 text-sm font-bold transition-colors',
                    isActive
                      ? 'text-primary-500 after:absolute after:-bottom-3 after:left-0 after:h-0.5 after:w-full after:bg-primary-500'
                      : 'text-white/88 hover:text-primary-400',
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"
              aria-label="Browse products"
            >
              <Search className="h-6 w-6" />
            </Link>

            {isAdmin && (
              <Link href="/admin/dashboard" className="hidden sm:block">
                <Button variant="outline" size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                  Admin
                </Button>
              </Link>
            )}

            {user ? (
              <>
                <Link
                  href="/cart"
                  className="relative grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"
                  aria-label={`Cart (${itemCount} items)`}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {itemCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>
                <span className="hidden max-w-[120px] truncate text-sm text-white/70 md:block">
                  {user.name}
                </span>
                <button
                  onClick={logout}
                  className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/cart"
                  className="relative grid h-10 w-10 place-items-center rounded-full text-white transition hover:bg-white/10"
                  aria-label={`Cart (${itemCount} items)`}
                >
                  <ShoppingCart className="h-6 w-6" />
                  {itemCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                      {itemCount > 9 ? '9+' : itemCount}
                    </span>
                  )}
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" size="sm" leftIcon={<UserRound className="h-4 w-4" />}>
                    Sign in
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
