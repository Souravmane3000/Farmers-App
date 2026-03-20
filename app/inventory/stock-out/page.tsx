'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db, dbHelpers } from '@/lib/db/database';
import { StockLog, StockType, InventoryItem, SyncStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { syncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';

const stockOutSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Quantity must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type StockOutFormData = z.infer<typeof stockOutSchema>;

export default function StockOutPage() {
  const router = useRouter();
  const { farm } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<StockOutFormData>({
    resolver: zodResolver(stockOutSchema),
    mode: 'onChange',
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const watchedItemId = watch('itemId');

  useEffect(() => {
    if (farm) {
      loadItems();
    }
  }, [farm]);

  useEffect(() => {
    if (watchedItemId) {
      setSelectedItemId(watchedItemId);
    }
  }, [watchedItemId]);

  const loadItems = async () => {
    if (!farm) return;
    try {
      const itemsData = await db.inventoryItems.where('farmId').equals(farm.id).toArray();
      setItems(itemsData);
      
      const stockMap: Record<string, number> = {};
      for (const item of itemsData) {
        stockMap[item.id] = await dbHelpers.getCurrentStock(item.id, farm.id);
      }
      setStockData(stockMap);
    } catch (error) {
      console.error('Error loading items:', error);
      setErrorMessage('Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  };

  const onSubmit = async (data: StockOutFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      return;
    }

    try {
      const quantity = parseFloat(data.quantity);
      const currentStock = stockData[data.itemId] || 0;
      
      if (quantity > currentStock) {
        setErrorMessage(`Insufficient stock. Available: ${currentStock}`);
        return;
      }

      const stockLog: StockLog = {
        id: uuidv4(),
        farmId: farm.id,
        itemId: data.itemId,
        type: StockType.OUT,
        quantity,
        date: data.date,
        notes: data.notes?.trim(),
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.stockLogs.add(stockLog);
      await syncService.markForSync(farm.id, 'stockLogs', stockLog.id, 'create', stockLog);
      
      const item = items.find(i => i.id === data.itemId);
      setSuccessMessage(`Removed ${quantity} ${item?.unit || 'units'} from "${item?.name || 'item'}"`);
      
      await loadItems();
      setValue('itemId', '');
      setValue('quantity', '');
      setValue('notes', '');
      setValue('date', new Date().toISOString().split('T')[0]);
      
    } catch (error) {
      console.error('Error recording stock out:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to record stock out. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  if (loadingItems) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <BackButton href="/inventory" />
          <h1 className="text-xl font-bold flex-1">Stock Out</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto pb-32">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-3">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">No inventory items found.</p>
              <Button variant="primary" onClick={() => router.push('/inventory/add')}>
                Add Item First
              </Button>
            </div>
          ) : (
            <>
              <Select
                label="Item *"
                options={items.map((item) => ({ 
                  value: item.id, 
                  label: `${item.name} (Available: ${stockData[item.id] || 0} ${item.unit})`
                }))}
                {...register('itemId')}
                error={errors.itemId?.message}
              />

              {selectedItemId && (
                <div className="p-3 bg-red-50 rounded-lg text-sm">
                  <span className="text-gray-600">Available Stock: </span>
                  <span className="font-bold text-red-800">
                    {stockData[selectedItemId] || 0} {items.find(i => i.id === selectedItemId)?.unit}
                  </span>
                </div>
              )}

              <Input
                label="Quantity *"
                type="number"
                step="0.1"
                placeholder="e.g., 10"
                {...register('quantity')}
                error={errors.quantity?.message}
              />

              <Input
                label="Date *"
                type="date"
                {...register('date')}
                error={errors.date?.message}
              />

              <div>
                <label className="label">Reason (Optional)</label>
                <textarea
                  className="input-field min-h-[60px] resize-none text-sm"
                  {...register('notes')}
                  placeholder="Why is stock being removed? (used, damaged, etc.)"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : 'Save Stock Out'}
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
