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
import { syncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';

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
  const [savedItems, setSavedItems] = useState<number>(0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ItemFormData) => {
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

      await db.inventoryItems.add(item);
      await syncService.markForSync(farm.id, 'inventoryItems', item.id, 'create', item);

      // Reset form and show success
      reset();
      setSavedItems(savedItems + 1);
      setSuccessMessage(`✓ "${data.name}" saved successfully! Add another item or use the Save button on Inventory to sync to Supabase.`);
      
      // Clear success message after 4 seconds
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      console.error('Error creating item:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create item. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/inventory" />
          <h1 className="text-2xl font-bold">Add Item</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
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
              Items saved locally: {savedItems} (pending sync)
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
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
