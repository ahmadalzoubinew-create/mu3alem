'use client';
import { useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useRouter } from 'next/navigation';

const TIMEOUT = 30 * 60 * 1000; // 30 minutes
const LAST_ACTIVE_KEY = 'mu3alem_last_active';
const PIN_LOCKED_KEY = 'mu3alem_pin_locked';

export function useAutoLogout() {
  const router = useRouter();

  const updateActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  }, []);

  const lockApp = useCallback(() => {
    localStorage.setItem(PIN_LOCKED_KEY, 'true');
    router.push('/pin');
  }, [router]);

  useEffect(() => {
    // Check if already locked
    const isLocked = localStorage.getItem(PIN_LOCKED_KEY);
    if (isLocked === 'true') {
      router.push('/pin');
      return;
    }

    // Check last activity
    const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive);
      if (elapsed > TIMEOUT) {
        lockApp();
        return;
      }
    }

    // Update activity on any interaction
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }));

    // Check every minute
    const interval = setInterval(() => {
      const last = localStorage.getItem(LAST_ACTIVE_KEY);
      if (last) {
        const elapsed = Date.now() - parseInt(last);
        if (elapsed > TIMEOUT) lockApp();
      }
    }, 60 * 1000);

    updateActivity();

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [lockApp, updateActivity, router]);
}