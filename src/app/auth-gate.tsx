'use client';

import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated and not already on an auth page
        if (pathname !== '/login' && pathname !== '/signup') {
          router.push('/login');
        }
      } else {
         // If user is logged in and tries to access login/signup, redirect to home
         if (pathname === '/login' || pathname === '/signup') {
            router.push('/');
        }
      }
    }
  }, [user, loading, router, pathname]);

  if (loading || (!user && pathname !== '/login' && pathname !== '/signup')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
