'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function QueueRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#F0F4F8' }}>
      <div style={{ fontSize: '14px', color: 'rgba(240, 244, 248, 0.5)' }}>Loading Patient Queue…</div>
    </div>
  );
}
