'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function SignInButton() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <span className="text-slate-400">
        Loading...
      </span>
    );
  }

  if (user) {
    return (
      <Link
        href="/dashboard"
        className="text-slate-600 hover:text-slate-900 transition-colors"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/sign-in"
      className="text-slate-600 hover:text-slate-900 transition-colors"
    >
      Sign In
    </Link>
  );
}
