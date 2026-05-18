import { useEffect, useRef, useCallback, useState } from 'react';

interface UseSessionTimeoutProps {
  onWarning: () => void;
  onLogout: () => void;
  warningTime?: number; // Time in ms before logout to show warning (default: 1 minute)
  logoutTime?: number; // Time in ms of inactivity before logout (default: 10 minutes)
  isAuthenticated: boolean;
}

export function useSessionTimeout({
  onWarning,
  onLogout,
  warningTime = 60000, // 1 minute in milliseconds
  logoutTime = 600000, // 10 minutes in milliseconds
  isAuthenticated,
}: UseSessionTimeoutProps) {
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isWarningShown, setIsWarningShown] = useState(false);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // Start the inactivity timers
  const startTimers = useCallback(() => {
    clearTimers();

    // Set warning timer (9 minutes for 10-minute timeout)
    const warningDelay = logoutTime - warningTime;
    warningTimerRef.current = setTimeout(() => {
      setIsWarningShown(true);
      onWarning();
    }, warningDelay);

    // Set logout timer (10 minutes)
    logoutTimerRef.current = setTimeout(() => {
      setIsWarningShown(false);
      onLogout();
    }, logoutTime);
  }, [clearTimers, onWarning, onLogout, logoutTime, warningTime]);

  // Reset timers on activity
  const resetTimers = useCallback(() => {
    // If warning is shown and user is active, hide it
    if (isWarningShown) {
      setIsWarningShown(false);
    }
    startTimers();
  }, [startTimers, isWarningShown]);

  // Throttled activity handler to prevent excessive resets
  const lastActivityRef = useRef<number>(Date.now());
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Only reset if at least 1 second has passed since last activity
    if (now - lastActivityRef.current > 1000) {
      lastActivityRef.current = now;
      resetTimers();
    }
  }, [resetTimers]);

  // Setup event listeners for activity tracking
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      setIsWarningShown(false);
      return;
    }

    // Start timers when component mounts or user becomes authenticated
    startTimers();

    // Activity events to track
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup function
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [isAuthenticated, startTimers, handleActivity, clearTimers]);

  // Public method to manually reset timers (e.g., when user clicks "Stay Logged In")
  const extendSession = useCallback(() => {
    setIsWarningShown(false);
    resetTimers();
  }, [resetTimers]);

  return {
    isWarningShown,
    extendSession,
  };
}
