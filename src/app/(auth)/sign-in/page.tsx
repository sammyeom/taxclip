'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { signInWithEmail, signInWithGoogle } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get('redirect');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (redirectTo === 'checkout') {
        router.push('/#pricing');
      } else {
        router.push('/upload');
      }
    }
  }, [user, authLoading, router, redirectTo]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await signInWithEmail(email, password);

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (redirectTo === 'checkout') {
      router.push('/#pricing');
    } else {
      router.push('/upload');
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    // Store redirect info for Google OAuth callback
    if (redirectTo) {
      localStorage.setItem('auth_redirect', redirectTo);
    }

    const { error: signInError } = await signInWithGoogle();

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render form if already logged in (will redirect via useEffect)
  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image src="/logo.svg" alt="TaxClip" width={48} height={48} priority />
            <span className="text-2xl font-bold"><span className="text-slate-900">Tax</span><span className="text-cyan-500">Clip</span></span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">
            Welcome back
          </h1>
          <p className="text-base sm:text-lg text-slate-600">
            Sign in to your account
          </p>
        </div>

        {/* Sign In Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 text-sm mb-1">Sign in failed</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-slate-900 border-2 border-slate-300 px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">Or continue with email</span>
            </div>
          </div>

          {/* Email Sign In Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-3 sm:space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ left: '14px' }}>
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-900"
                  style={{ paddingLeft: '44px' }}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ left: '14px' }}>
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-slate-900"
                  style={{ paddingLeft: '44px' }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <Link href={redirectTo ? `/sign-up?redirect=${redirectTo}` : '/sign-up'} className="text-cyan-600 hover:text-cyan-700 font-semibold">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-slate-500">
          By continuing, you agree to TaxClip's{' '}
          <Link href="/terms" className="text-cyan-600 hover:text-cyan-700">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-cyan-600 hover:text-cyan-700">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
