'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import { InventoryItem, InventoryCategory, Unit, SyncStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { SyncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  minThreshold: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Minimum threshold must be a valid number'),
  description: z.string().optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

export default function AddInventoryPage() {
  const router = useRouter();
  const { farm } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [savedItems, setSavedItems] = useState<number>(0);
  const [lastSavedItem, setLastSavedItem] = useState<InventoryItem | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    mode: 'onChange',
  });

  const onSubmitLocal = async (data: ItemFormData) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      return;
    }

    try {
      const minThreshold = parseFloat(data.minThreshold);

      const item: InventoryItem = {
        id: uuidv4(),
        farmId: farm.id,
        name: data.name.trim(),
        category: data.category as InventoryCategory,
        unit: data.unit as Unit,
        minThreshold,
        description: data.description?.trim(),
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to local database
      await db.inventoryItems.add(item);
      setLastSavedItem(item);
      setSavedItems(savedItems + 1);
      
      // Reset form and show success
      reset();
      setSuccessMessage(`✓ "${data.name}" ready for sync. Click "Save to Supabase" button (top right) to save it!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error('Error creating item:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create item. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  const handleSyncToSupabase = async () => {
    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      return;
    }

    setSyncStatus('syncing');
    setErrorMessage(null);

    try {
      // Get all pending items for this farm
      const pendingItems = await db.inventoryItems
        .where('farmId')
        .equals(farm.id)
        .filter(item => item.syncStatus === SyncStatus.PENDING)
        .toArray();

      if (pendingItems.length === 0) {
        setErrorMessage('No pending items to sync');
        setSyncStatus('idle');
        return;
      }

      // Sync each item to Supabase
      for (const item of pendingItems) {
        const response = await fetch('/api/sync/inventoryItems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });

        if (!response.ok) {
          throw new Error(`Failed to sync item: ${item.name}`);
        }

        // Update sync status locally
        await db.inventoryItems.update(item.id, {
          syncStatus: SyncStatus.SYNCED,
          updatedAt: new Date().toISOString(),
        });
      }

      setSyncStatus('success');
      setSuccessMessage(`✓ Successfully saved ${pendingItems.length} item(s) to Supabase!`);
      setTimeout(() => {
        setSyncStatus('idle');
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to sync to Supabase';
      setErrorMessage(errorMsg);
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton href="/inventory" />
            <h1 className="text-2xl font-bold">Add Item</h1>
          </div>
          <button
            onClick={handleSyncToSupabase}
            disabled={syncStatus === 'syncing' || savedItems === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              syncStatus === 'syncing'
                ? 'bg-white/30 text-white cursor-not-allowed'
                : savedItems === 0
                ? 'bg-white/20 text-white/70 cursor-not-allowed'
                : syncStatus === 'success'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : syncStatus === 'error'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white text-primary-600 hover:bg-gray-100'
            }`}
          >
            {syncStatus === 'syncing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : syncStatus === 'success' ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Saved!
              </>
            ) : syncStatus === 'error' ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Error
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save ({savedItems})
              </>
            )}
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmitLocal)} className="card space-y-4">
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

          {savedItems > 0 && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs font-semibold">
              Items ready to sync: {savedItems} (click "Save" button in top right to save to Supabase)
            </div>
          )}

          <Input
            label="Item Name *"
            placeholder="e.g., Nitrogen Fertilizer"
            {...register('name')}
            error={errors.name?.message}
          />

          <Select
            label="Category *"
            options={[
              { value: InventoryCategory.SEEDS, label: 'Seeds' },
              { value: InventoryCategory.FERTILIZERS, label: 'Fertilizers' },
              { value: InventoryCategory.PESTICIDES, label: 'Pesticides' },
              { value: InventoryCategory.EQUIPMENT, label: 'Equipment' },
              { value: InventoryCategory.FUEL, label: 'Fuel' },
            ]}
            {...register('category')}
            error={errors.category?.message}
          />

          <Select
            label="Unit *"
            options={[
              { value: Unit.KG, label: 'Kilogram (kg)' },
              { value: Unit.LITRE, label: 'Litre (L)' },
              { value: Unit.PIECE, label: 'Piece' },
              { value: Unit.ACRE, label: 'Acre' },
            ]}
            {...register('unit')}
            error={errors.unit?.message}
          />

          <Input
            label="Min Threshold *"
            type="number"
            step="0.1"
            placeholder="e.g., 10"
            {...register('minThreshold')}
            error={errors.minThreshold?.message}
          />

          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              className="input-field min-h-[80px] resize-none text-sm"
              {...register('description')}
              placeholder="Additional details about this item..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/inventory')}
              className="flex-1 text-sm"
            >
              Back to Inventory
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1 text-sm"
            >
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
