'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { plotService, CreatePlotDTO, UpdatePlotDTO } from '@/lib/services/plotService';
import { Plot } from '@/types';

export function usePlots() {
  const { farm } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlots = useCallback(async () => {
    if (!farm) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await plotService.getByFarm(farm.id);
      setPlots(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch plots');
    } finally {
      setIsLoading(false);
    }
  }, [farm]);

  useEffect(() => {
    fetchPlots();
  }, [fetchPlots]);

  const create = useCallback(async (data: Omit<CreatePlotDTO, 'farmId'>) => {
    if (!farm) throw new Error('No farm selected');
    return plotService.create({ ...data, farmId: farm.id });
  }, [farm]);

  const update = useCallback(async (id: string, data: UpdatePlotDTO) => {
    return plotService.update(id, data);
  }, []);

  const remove = useCallback(async (id: string) => {
    return plotService.delete(id);
  }, []);

  const refetch = useCallback(() => {
    fetchPlots();
  }, [fetchPlots]);

  return {
    plots,
    isLoading,
    error,
    create,
    update,
    remove,
    refetch,
  };
}