import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// Body text — Inter. Headings — Fraunces (a soft modern serif) for a premium feel.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// Variable font (full weight axis) so font-bold/extrabold/black headings render
// real weights rather than faux-bold.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
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
