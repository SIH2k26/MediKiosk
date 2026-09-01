'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QueueRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-dark text-ink-primary">
      <div className="text-sm text-ink-muted">Loading Patient Queue…</div>
    </div>
  );
}