'use client';

// =============================================================================
// Kiosk inactivity watcher
// =============================================================================
// - Shows a warning overlay after WARN_AFTER_MS without any user interaction.
// - After RESET_AFTER_MS the current session is marked ABANDONED, local state
//   is cleared, and the kiosk resets to the language selection screen.
// - Sends a heartbeat every 30s so the server can expire stale sessions too.
// Mounted globally in the root layout; inactive on the home screen.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../lib/api-client';
import { makeT } from '../lib/i18n';

const WARN_AFTER_MS = 60_000;
const RESET_AFTER_MS = 90_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;

export default function IdleWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const isActive = pathname !== '/'; // No session on the language screen

  const resetKiosk = useCallback(async () => {
    try {
      const stored = sessionStorage.getItem('mk_session');
      if (stored) {
        const session = JSON.parse(stored);
        await api.abandonSession(session.id);
      }
    } catch {
      // Best effort — the server-side expiry job is the safety net
    }
    sessionStorage.clear();
    setShowWarning(false);
    router.replace('/');
  }, [router]);

  // Track user activity
  useEffect(() => {
    if (!isActive) return;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      setShowWarning(false);
    };
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, markActivity));
  }, [isActive]);

  // Idle timer
  useEffect(() => {
    if (!isActive) return;
    lastActivityRef.current = Date.now();
    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= RESET_AFTER_MS) {
        void resetKiosk();
      } else if (idleMs >= WARN_AFTER_MS) {
        setShowWarning(true);
        setSecondsLeft(Math.ceil((RESET_AFTER_MS - idleMs) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, resetKiosk]);

  // Server heartbeat
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      try {
        const stored = sessionStorage.getItem('mk_session');
        if (stored) {
          const session = JSON.parse(stored);
          void api.heartbeat(session.id).catch(() => undefined);
        }
      } catch {
        // Ignore malformed storage
      }
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive || !showWarning) return null;

  const lang = typeof window !== 'undefined' ? sessionStorage.getItem('mk_lang') || 'hi' : 'hi';
  const t = makeT(lang);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '2.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">⏰</div>
        <h2 className="text-heading" style={{ marginBottom: '0.75rem' }}>
          {t('Are you still there?', 'क्या आप अभी भी यहां हैं?')}
        </h2>
        <p className="text-body text-secondary" style={{ marginBottom: '1.5rem' }}>
          {t(
            `This kiosk will reset in ${secondsLeft} seconds due to inactivity.`,
            `निष्क्रियता के कारण यह कियोस्क ${secondsLeft} सेकंड में रीसेट हो जाएगा।`
          )}
        </p>
        <button
          className="btn btn-primary btn-xl"
          style={{ width: '100%', minHeight: '64px' }}
          onClick={() => {
            lastActivityRef.current = Date.now();
            setShowWarning(false);
          }}
        >
          ✋ {t("I'm still here", 'मैं यहीं हूं')}
        </button>
      </div>
    </div>
  );
}
