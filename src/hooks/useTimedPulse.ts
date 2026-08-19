import { useEffect, useState } from 'react';

/**
 * True for `durationMs` after `ready` becomes true (page visit / remount / reload).
 * Stays false until the next remount.
 */
export function useTimedPulse(durationMs = 5000, ready = true): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ready) {
      setActive(false);
      return;
    }
    setActive(true);
    const id = window.setTimeout(() => setActive(false), durationMs);
    return () => window.clearTimeout(id);
  }, [durationMs, ready]);

  return active;
}
