'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import { InventoryItem, InventoryCategory, Unit, SyncStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import { Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
    watch,
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    mode: 'onChange',
  });

  const handleDirectSave = async (data: ItemFormData) => {
    console.log('[InventoryAdd] Saving directly to Supabase:', data);
    setErrorMessage(null);
    setSyncStatus('syncing');

    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      setSyncStatus('error');
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

      console.log('[InventoryAdd] Created item:', item);
      
      // Save to local database
      await db.inventoryItems.add(item);
      console.log('[InventoryAdd] Item saved to local DB');

      // Immediately sync to Supabase
      console.log('[InventoryAdd] Syncing to Supabase...');
      const response = await fetch('/api/sync/inventoryItems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });

      console.log('[InventoryAdd] Sync response status:', response.status);
      const responseData = await response.json();
      console.log('[InventoryAdd] Sync response:', responseData);

      if (!response.ok) {
        const errorMsg = responseData.error || responseData.details || response.statusText;
        throw new Error(errorMsg);
      }

      // Update sync status to SYNCED
      await db.inventoryItems.update(item.id, {
        syncStatus: SyncStatus.SYNCED,
        updatedAt: new Date().toISOString(),
      });

      console.log('[InventoryAdd] Item successfully saved to Supabase');
      
      setSyncStatus('success');
      setSuccessMessage(`✓ "${data.name}" saved successfully to Supabase!`);
      
      // Reset form
      reset();
      
      // Clear success after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('[InventoryAdd] Error:', error);
      setSyncStatus('error');
      
      let errorMsg = error instanceof Error ? error.message : 'Failed to save item';
      
      // Check if it's a Supabase configuration issue
      if (errorMsg.includes('credentials') || errorMsg.includes('not configured')) {
        errorMsg = '⚠️ Supabase not configured. Check SUPABASE_SETUP.md for setup instructions.';
      } else if (errorMsg.includes('not found') || errorMsg.includes("doesn't exist")) {
        errorMsg = `⚠️ ${errorMsg} Please create the tables in Supabase first. See SUPABASE_SETUP.md`;
      }
      
      setErrorMessage(errorMsg);
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BackButton href="/inventory" />
          <h1 className="text-xl font-bold flex-1">Add Item</h1>
        </div>
        {successMessage && (
          <div className="mt-2 p-2 bg-green-500 rounded text-sm">
            {successMessage}
          </div>
        )}
      </header>

      <main className="p-4 max-w-2xl mx-auto mb-28">
        {errorMessage && (
          <div className="card bg-red-50 border border-red-200 p-3 mb-4">
            <div className="font-semibold mb-1 text-red-700">Error saving:</div>
            <div className="text-red-600 text-sm break-words">{errorMessage}</div>
          </div>
        )}

        <form className="card space-y-4">
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
              className="input-field min-h-[80px] resize-none"
              {...register('description')}
              placeholder="Additional details about this item..."
            />
          </div>
        </form>
      </main>

      {/* Fixed bottom buttons - always visible */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-2xl mx-auto flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/inventory')}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit(handleDirectSave)}
            disabled={!isValid || syncStatus === 'syncing'}
            className="flex-1"
          >
            {syncStatus === 'syncing' ? 'Saving...' : syncStatus === 'success' ? 'Saved!' : 'Save Item'}
          </Button>
        </div>
      </div>
    </div>
  );
}
