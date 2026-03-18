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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ItemFormData) => {
    setErrorMessage(null);
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

      router.push('/inventory');
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
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
