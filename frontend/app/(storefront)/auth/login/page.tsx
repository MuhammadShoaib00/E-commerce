'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';

type Mode = 'login' | 'signup';

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}

function AuthContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'login');
  const redirect = searchParams.get('redirect') ?? '/';

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.12)] md:grid-cols-2">
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-10 text-white md:flex">
          <div className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
            <Package className="h-7 w-7" />
            Shop<span className="text-primary-200">Flow</span>
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold leading-tight">
              {mode === 'login' ? 'Welcome back.' : 'Join ShopFlow.'}
            </h2>
            <p className="text-sm text-primary-100">
              Your cart, orders, and personalised picks - all in one place.
            </p>
            <ul className="space-y-3 text-sm">
              <Feature icon={<Truck className="h-4 w-4" />} text="Fast delivery on every order" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} text="Secure checkout and saved orders" />
              <Feature icon={<Sparkles className="h-4 w-4" />} text="Recommendations picked for you" />
            </ul>
          </div>
          <p className="text-xs text-primary-200/80">ShopFlow commerce dashboard.</p>
        </aside>

        <div className="p-8 sm:p-10">
          <div className="mb-8 flex rounded-full bg-neutral-100 p-1 text-sm font-bold">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 rounded-full py-2 transition ${mode === 'login' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-full py-2 transition ${mode === 'signup' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}
            >
              Create account
            </button>
          </div>

          <AuthForm key={mode} mode={mode} redirect={redirect} />

          <p className="mt-6 text-center text-xs leading-5 text-neutral-500">
            Secure access for your saved cart, checkout, and order history.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">{icon}</span>
      {text}
    </li>
  );
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

function AuthForm({ mode, redirect }: { mode: Mode; redirect: string }) {
  const { login, signup } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(mode === 'signup' ? signupSchema : (loginSchema as unknown as typeof signupSchema)),
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        await signup(values.email, values.name, values.password);
      } else {
        await login(values.email, (values as unknown as LoginValues).password);
      }
      router.push(redirect);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Authentication failed', 'error');
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          {mode === 'login' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === 'login' ? 'Welcome back to ShopFlow.' : 'It only takes a moment.'}
        </p>
      </div>

      {mode === 'signup' && (
        <FormField
          label="Full name"
          autoComplete="name"
          placeholder="Jane Doe"
          error={errors.name?.message}
          {...register('name')}
        />
      )}

      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <FormField
        label="Password"
        type="password"
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        placeholder={mode === 'login' ? 'Password' : 'Min. 8 chars, 1 uppercase, 1 number'}
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" isLoading={isLoading} className="mt-1 w-full" size="lg">
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}
