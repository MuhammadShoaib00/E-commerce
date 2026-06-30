import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Box,
  ChevronRight,
  Gem,
  Headphones,
  Mail,
  Play,
  ShieldCheck,
  Tags,
  Truck,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { PopularProducts } from '@/features/home/PopularProducts';
import { NewsletterForm } from '@/features/home/NewsletterForm';

const heroBenefits = [
  { icon: Gem, title: 'Premium Quality' },
  { icon: Truck, title: 'Fast Delivery' },
  { icon: ShieldCheck, title: '2 Year Warranty' },
];

const serviceHighlights = [
  { icon: Truck, title: 'Fast Delivery', description: 'Quick dispatch on all orders' },
  { icon: ShieldCheck, title: 'Secure Payment', description: '100% secure payment' },
  { icon: BadgeCheck, title: 'Premium Quality', description: 'Best quality products' },
  { icon: Headphones, title: '24/7 Support', description: 'Dedicated support' },
];

const trustCards = [
  { icon: BadgeCheck, title: 'Top Quality', description: 'We ensure the best quality products for you.' },
  { icon: Tags, title: 'Best Prices', description: 'Get the best prices on top quality products.' },
  { icon: Box, title: 'Easy Returns', description: '30 days easy returns and refund policy.' },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-[var(--background)] text-neutral-900">
        <section className="relative isolate overflow-hidden bg-[#0c0a07] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(0,119,255,0.26),transparent_34%),radial-gradient(circle_at_18%_85%,rgba(184,134,47,0.18),transparent_40%),linear-gradient(110deg,#0c0a07_0%,#11100c_54%,#171410_100%)]" />
          <div className="relative mx-auto grid min-h-[610px] max-w-7xl grid-cols-1 items-center gap-10 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:pb-28">
            <div className="shopflow-fade-up z-10 max-w-xl">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-primary-500">
                New Arrival
              </p>
              <h1 className="max-w-[620px] text-5xl font-black leading-[0.98] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                Elevate Your{' '}
                <span className="block bg-gradient-to-r from-[#0b7cff] to-[#0057ff] bg-clip-text text-transparent">
                  Everyday
                </span>
              </h1>
              <p className="mt-7 max-w-md text-lg leading-8 text-white/75">
                Discover premium products designed for performance, style and innovation.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link
                  href="/products"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2493ff] to-[#005eff] px-8 text-sm font-bold text-white shadow-[0_16px_40px_rgba(0,104,255,0.36)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(0,104,255,0.5)]"
                >
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/[0.03] px-6 text-sm font-bold text-white backdrop-blur transition duration-300 hover:border-white/35 hover:bg-white/[0.08]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-white/30">
                    <Play className="h-4 w-4 fill-white" />
                  </span>
                  Explore Catalog
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-12 text-sm font-semibold text-white/85">
                {['01', '02', '03'].map((slide, index) => (
                  <span
                    key={slide}
                    className={index === 0 ? 'relative text-white after:absolute after:-bottom-3 after:left-0 after:h-0.5 after:w-12 after:bg-primary-500' : ''}
                  >
                    {slide}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative min-h-[460px]">
              <div className="shopflow-hero-orbit absolute left-[8%] top-[9%] h-[390px] w-[390px] rounded-full border-2 border-[#61c6ff]/85 shadow-[0_0_35px_rgba(66,170,255,0.82)] sm:h-[470px] sm:w-[470px]" />
              <Image
                src="/shopflow-assets/hero-headphones.png"
                alt="Premium ShopFlow headphones"
                width={495}
                height={455}
                priority
                className="shopflow-float relative z-10 mx-auto mt-0 w-full max-w-[600px] object-contain drop-shadow-[0_34px_60px_rgba(0,0,0,0.45)]"
              />
              <div className="absolute right-0 top-20 z-20 hidden w-28 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] p-4 text-center text-xs font-bold text-white shadow-2xl backdrop-blur-xl lg:block">
                {heroBenefits.map(({ icon: Icon, title }) => (
                  <div key={title} className="border-b border-white/10 py-4 last:border-b-0">
                    <Icon className="mx-auto mb-2 h-7 w-7 text-primary-500" />
                    <span>{title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-20 mx-auto -mt-14 max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.12)] sm:grid-cols-2 lg:grid-cols-4">
            {serviceHighlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-4 border-b border-neutral-100 p-7 last:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b-0">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                  <Icon className="h-7 w-7" />
                </span>
                <span>
                  <strong className="block text-sm font-extrabold text-neutral-950">{title}</strong>
                  <span className="mt-1 block text-sm text-neutral-500">{description}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-3xl font-black tracking-[-0.04em] text-neutral-950">
              Popular Products
            </h2>
            <Link href="/products" className="hidden items-center gap-3 text-sm font-bold text-neutral-950 transition hover:text-primary-600 sm:flex">
              View All Products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <PopularProducts />
        </section>

        <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-8 sm:px-8 lg:grid-cols-[1.9fr_1fr] lg:px-12">
          <div className="relative min-h-[270px] overflow-hidden rounded-2xl bg-[#eef7ff] p-8 shadow-sm">
            <div className="relative z-10 max-w-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-primary-600">
                Limited Time Offer
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.05em] text-neutral-950">
                Summer Sale <br /> Up to <span className="text-primary-600">30%</span> Off
              </h2>
              <div className="mt-5 flex gap-3">
                {[
                  ['03', 'Days'],
                  ['14', 'Hours'],
                  ['25', 'Mins'],
                  ['48', 'Secs'],
                ].map(([value, label]) => (
                  <span key={label} className="rounded-lg bg-white px-4 py-3 text-center shadow-sm">
                    <strong className="block text-lg font-black">{value}</strong>
                    <span className="text-xs text-neutral-500">{label}</span>
                  </span>
                ))}
              </div>
              <Link
                href="/products"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-4 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,101,255,0.25)] transition hover:bg-primary-700"
              >
                Shop the Sale <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <Image
              src="/shopflow-assets/banner-sunglasses.png"
              alt="Blue sunglasses on a rock"
              width={310}
              height={165}
              className="absolute bottom-0 right-0 w-[55%] max-w-[420px] object-contain"
            />
          </div>

          <div className="relative min-h-[270px] overflow-hidden rounded-2xl bg-[#eef5e9] p-8 shadow-sm">
            <div className="relative z-10">
              <p className="text-sm font-extrabold text-green-600">New Collection</p>
              <h2 className="mt-7 max-w-[190px] text-4xl font-black leading-tight tracking-[-0.05em] text-neutral-950">
                Best Picks For You
              </h2>
              <Link
                href="/products"
                className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-4 text-sm font-bold text-neutral-950 shadow-sm transition hover:text-primary-600"
              >
                Explore Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <Image
              src="/shopflow-assets/banner-perfume.png"
              alt="Green premium perfume bottle"
              width={195}
              height={240}
              className="absolute bottom-0 right-2 w-[46%] max-w-[210px] object-contain"
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-5 sm:px-8 lg:px-12">
          <div className="grid overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm md:grid-cols-3">
            {trustCards.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-5 border-b border-neutral-100 p-8 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-primary-100 bg-white text-primary-600 shadow-sm">
                  <Icon className="h-7 w-7" />
                </span>
                <div>
                  <h3 className="font-black text-neutral-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">{description}</p>
                  <Link href="/products" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary-600">
                    Learn More <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-7 sm:px-8 lg:px-12">
          <div className="grid items-center gap-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm lg:grid-cols-[1fr_1.25fr]">
            <div className="flex items-center gap-5">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-600">
                <Mail className="h-8 w-8" />
              </span>
              <div>
                <h2 className="text-2xl font-black tracking-[-0.03em] text-neutral-950">Stay in the Loop</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Subscribe to get updates on new arrivals, offers and more.
                </p>
              </div>
            </div>
            <NewsletterForm />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
