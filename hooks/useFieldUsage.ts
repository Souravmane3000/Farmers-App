'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, dbHelpers } from '@/lib/db/database';
import { FieldUsageLog } from '@/types';
import { fieldUsageService, CreateFieldUsageDTO } from '@/lib/services/fieldUsageService';

export function useFieldUsage() {
  const { farm } = useAuth();
  const [usageLogs, setUsageLogs] = useState<FieldUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!farm) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fieldUsageService.getByFarm(farm.id);
      setUsageLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage logs');
    } finally {
      setIsLoading(false);
    }
  }, [farm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const create = useCallback(async (data: Omit<CreateFieldUsageDTO, 'farmId'>) => {
    if (!farm) throw new Error('No farm selected');
    return fieldUsageService.create({ ...data, farmId: farm.id });
  }, [farm]);

  const getByPlot = useCallback(async (plotId: string) => {
    return fieldUsageService.getByPlot(plotId);
  }, []);

  const getByItem = useCallback(async (itemId: string) => {
    return fieldUsageService.getByItem(itemId);
  }, []);

  const getByDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!farm) return [];
    return fieldUsageService.getByDateRange(farm.id, startDate, endDate);
  }, [farm]);

  return {
    usageLogs,
    isLoading,
    error,
    create,
    getByPlot,
    getByItem,
    getByDateRange,
    refetch: fetchLogs,
  };
}

export function useRecentActivity(limit = 10) {
  const { farm } = useAuth();
  const [activities, setActivities] = useState<FieldUsageLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!farm) return;

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        const logs = await fieldUsageService.getRecent(farm.id, limit);
        setActivities(logs);
      } catch (err) {
        console.error('Error fetching recent activity:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [farm, limit]);

  return { activities, isLoading };
}

export function useDashboardStats() {
  const { farm } = useAuth();
  const [stats, setStats] = useState({
    totalPlots: 0,
    activeCrops: 0,
    lowStockItems: 0,
    pendingSyncs: 0,
    monthlyExpense: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!farm) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [
          plotsCount,
          cropsCount,
          stocks,
          syncs,
        ] = await Promise.all([
          db.plots.where('farmId').equals(farm.id).count(),
          db.crops.where('farmId').equals(farm.id).filter(c => c.status !== 'harvested').count(),
          dbHelpers.getAllCurrentStocks(farm.id),
          db.syncQueue.where('farmId').equals(farm.id).count(),
        ]);

        const lowStock = stocks.filter(s => s.isLowStock).length;

        setStats({
          totalPlots: plotsCount,
          activeCrops: cropsCount,
          lowStockItems: lowStock,
          pendingSyncs: syncs,
          monthlyExpense: 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [farm]);

  return { stats, isLoading };
}