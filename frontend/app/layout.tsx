import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Body text — Inter. Headings — Fraunces (a soft modern serif) for a premium feel.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ShopFlow — Premium E-Commerce',
  description: 'A professional storefront for premium products, deals, and fast checkout.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--background)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
