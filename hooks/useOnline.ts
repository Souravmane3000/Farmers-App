'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useOnline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useOnlineStatus() {
  const isOnline = useOnline();
  
  return {
    isOnline,
    isOffline: !isOnline,
  };
}

export function useOnlineCallback(
  callback: () => void | Promise<void>,
  deps: React.DependencyList = []
) {
  const isOnline = useOnline();
  const pendingCallbackRef = useRef<(() => void | Promise<void>) | null>(null);

  useEffect(() => {
    if (isOnline && pendingCallbackRef.current) {
      pendingCallbackRef.current();
      pendingCallbackRef.current = null;
    }
  }, [isOnline]);

  const execute = useCallback(async () => {
    if (isOnline) {
      await callback();
    } else {
      pendingCallbackRef.current = callback;
    }
  }, [isOnline, ...deps]);

  return execute;
}