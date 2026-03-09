import { useEffect, useRef, useCallback } from 'react';

interface AutoRefreshOptions {
  intervalMs?: number;      // Default: 10 minutes (600000ms)
  idleThresholdMs?: number; // Default: 1 minute (60000ms)
}

/**
 * Hook to auto-refresh the page after a specified interval,
 * but only if the user has been idle for a certain threshold.
 */
export function useAutoRefresh(options: AutoRefreshOptions = {}) {
  const { 
    intervalMs = 10 * 60 * 1000,  // 10 minutes
    idleThresholdMs = 60 * 1000    // 1 minute idle before refresh allowed
  } = options;

  const lastActivityRef = useRef<number>(Date.now());
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Track user activity
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Set up the refresh interval
    intervalIdRef.current = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      
      // Only reload if user has been idle for the threshold
      if (timeSinceLastActivity >= idleThresholdMs) {
        console.log('[AutoRefresh] Refreshing page after idle period...');
        window.location.reload();
      } else {
        console.log('[AutoRefresh] Skipping refresh - user recently active');
      }
    }, intervalMs);

    return () => {
      // Cleanup
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [intervalMs, idleThresholdMs, updateActivity]);
}
