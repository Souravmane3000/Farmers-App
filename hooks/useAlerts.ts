'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { alertService } from '@/lib/services/alertService';
import { Alert, AlertType, AlertPriority } from '@/types';

export function useAlerts() {
  const { farm } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!farm) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await alertService.getByFarm(farm.id);
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setIsLoading(false);
    }
  }, [farm]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markAsRead = useCallback(async (id: string) => {
    await alertService.markAsRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!farm) return;
    await alertService.markAllAsRead(farm.id);
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, [farm]);

  const dismiss = useCallback(async (id: string) => {
    await alertService.delete(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const urgentCount = alerts.filter((a) => !a.isRead && a.priority === AlertPriority.URGENT).length;

  return {
    alerts,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    unreadCount,
    urgentCount,
    refetch: fetchAlerts,
  };
}

export function useUnreadAlerts() {
  const { farm } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!farm) return;

    const fetchCount = async () => {
      const { unread } = await alertService.count(farm.id);
      setCount(unread);
    };

    fetchCount();

    const interval = setInterval(fetchCount, 30000); 
    return () => clearInterval(interval);
  }, [farm]);

  return count;
}

export function useAlertsByType(type: AlertType) {
  const { farm } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!farm) return;

    const fetchAlerts = async () => {
      setIsLoading(true);
      try {
        const data = await alertService.getByType(farm.id, type);
        setAlerts(data);
      } catch (err) {
        console.error('Error fetching alerts by type:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, [farm, type]);

  return { alerts, isLoading };
}