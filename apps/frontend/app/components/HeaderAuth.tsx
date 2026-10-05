'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { LayoutDashboard } from 'lucide-react';
import { getToken } from '../lib/auth';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('auth-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('auth-change', callback);
  };
}

function getSnapshot(): string | null {
  try {
    return getToken();
  } catch {
    return null;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

export default function HeaderAuth() {
  const token = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isLoggedIn = Boolean(token);

  return (
    <div className="flex items-center gap-3">
      {isLoggedIn ? (
        <Link
          href="/dashboard"
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 shadow-sm"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Vai alla Dashboard</span>
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Accedi
          </Link>
          <Link
            href="/register"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Registrati
          </Link>
        </>
      )}
    </div>
  );
}
