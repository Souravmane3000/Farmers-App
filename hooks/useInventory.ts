'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  inventoryService, 
  CreateInventoryItemDTO, 
  CreateStockLogDTO, 
  StockWithItem 
} from '@/lib/services/inventoryService';
import { InventoryItem, StockLog, InventoryCategory, Unit } from '@/types';

export function useInventory() {
  const { farm } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!farm) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await inventoryService.getByFarm(farm.id);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
    } finally {
      setIsLoading(false);
    }
  }, [farm]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(async (data: Omit<CreateInventoryItemDTO, 'farmId'>) => {
    if (!farm) throw new Error('No farm selected');
    return inventoryService.createItem({ ...data, farmId: farm.id });
  }, [farm]);

  const updateItem = useCallback(async (id: string, data: Partial<CreateInventoryItemDTO>) => {
    return inventoryService.updateItem(id, data);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    return inventoryService.deleteItem(id);
  }, []);

  const getStock = useCallback(async (itemId: string) => {
    if (!farm) return 0;
    return inventoryService.getCurrentStock(itemId, farm.id);
  }, [farm]);

  const getAllStocks = useCallback(async () => {
    if (!farm) return [];
    return inventoryService.getAllCurrentStocks(farm.id);
  }, [farm]);

  return {
    items,
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    getStock,
    getAllStocks,
    refetch: fetchItems,
  };
}

export function useStock(itemId: string | null) {
  const { farm } = useAuth();
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!itemId || !farm) {
      setCurrentStock(0);
      setLogs([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const stock = await inventoryService.getCurrentStock(itemId, farm.id);
        const stockLogs = await inventoryService.getStockLogs(itemId);
        setCurrentStock(stock);
        setLogs(stockLogs.reverse());
      } catch (err) {
        console.error('Error fetching stock data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [itemId, farm]);

  const stockIn = useCallback(async (
    quantity: number,
    date: string,
    options?: {
      batchNumber?: string;
      expiryDate?: string;
      purchasePrice?: number;
      supplierId?: string;
      notes?: string;
    }
  ) => {
    if (!farm || !itemId) throw new Error('No farm or item selected');
    
    const result = await inventoryService.stockIn(farm.id, itemId, quantity, date, options);
    const newStock = await inventoryService.getCurrentStock(itemId, farm.id);
    setCurrentStock(newStock);
    return result;
  }, [farm, itemId]);

  const stockOut = useCallback(async (quantity: number, date: string, notes?: string) => {
    if (!farm || !itemId) throw new Error('No farm or item selected');
    
    const result = await inventoryService.stockOut(farm.id, itemId, quantity, date, notes);
    const newStock = await inventoryService.getCurrentStock(itemId, farm.id);
    setCurrentStock(newStock);
    return result;
  }, [farm, itemId]);

  return {
    currentStock,
    logs,
    isLoading,
    stockIn,
    stockOut,
  };
}

export interface LowStockItem {
  itemId: string;
  itemName: string;
  category: InventoryCategory;
  unit: Unit;
  currentQuantity: number;
  minThreshold: number;
  isLowStock: boolean;
}

export function useLowStock() {
  const { farm } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!farm) return;

    const fetchLowStock = async () => {
      setIsLoading(true);
      try {
        const stocks = await inventoryService.getLowStockItems(farm.id);
        setLowStockItems(stocks);
      } catch (err) {
        console.error('Error fetching low stock items:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLowStock();
  }, [farm]);

  return { lowStockItems, isLoading };
}