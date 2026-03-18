'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import { StockLog, StockType, InventoryItem, SyncStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { syncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';

const stockInSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Quantity must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  purchasePrice: z.string().optional(),
  notes: z.string().optional(),
});

type StockInFormData = z.infer<typeof stockInSchema>;

export default function StockInPage() {
  const router = useRouter();
  const { farm } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StockInFormData>({
    resolver: zodResolver(stockInSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (farm) {
      loadItems();
    }
  }, [farm]);

  const loadItems = async () => {
    if (!farm) return;
    try {
      const itemsData = await db.inventoryItems.where('farmId').equals(farm.id).toArray();
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading items:', error);
      setErrorMessage('Failed to load items');
    } finally {
      setLoadingItems(false);
    }
  };

  const onSubmit = async (data: StockInFormData) => {
    setErrorMessage(null);
    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      return;
    }

    try {
      const quantity = parseFloat(data.quantity);

      const stockLog: StockLog = {
        id: uuidv4(),
        farmId: farm.id,
        itemId: data.itemId,
        type: StockType.IN,
        quantity,
        date: data.date,
        batchNumber: data.batchNumber?.trim(),
        expiryDate: data.expiryDate,
        purchasePrice: data.purchasePrice ? parseFloat(data.purchasePrice) : undefined,
        notes: data.notes?.trim(),
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.stockLogs.add(stockLog);
      await syncService.markForSync(farm.id, 'stockLogs', stockLog.id, 'create', stockLog);

      router.push('/inventory');
    } catch (error) {
      console.error('Error recording stock in:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to record stock in. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  if (loadingItems) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading items...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-green-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/inventory" />
          <h1 className="text-2xl font-bold">Stock In</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-6 text-gray-600">
              <p>No inventory items. Create one first.</p>
            </div>
          ) : (
            <>
              <Select
                label="Item *"
                options={items.map((item) => ({ value: item.id, label: item.name }))}
                {...register('itemId')}
                error={errors.itemId?.message}
              />

              <Input
                label="Quantity *"
                type="number"
                step="0.1"
                placeholder="e.g., 50"
                {...register('quantity')}
                error={errors.quantity?.message}
              />

              <Input
                label="Date *"
                type="date"
                {...register('date')}
                error={errors.date?.message}
              />

              <Input
                label="Batch Number (Optional)"
                placeholder="e.g., BATCH-001"
                {...register('batchNumber')}
                error={errors.batchNumber?.message}
              />

              <Input
                label="Expiry Date (Optional)"
                type="date"
                {...register('expiryDate')}
                error={errors.expiryDate?.message}
              />

              <Input
                label="Purchase Price (Optional)"
                type="number"
                step="0.01"
                placeholder="e.g., 500"
                {...register('purchasePrice')}
                error={errors.purchasePrice?.message}
              />

              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  className="input-field min-h-[70px] resize-none text-sm"
                  {...register('notes')}
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  className="flex-1 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex-1 text-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Record Stock In'}
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
