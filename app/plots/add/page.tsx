'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import { Plot, SyncStatus } from '@/types';
import { syncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';

const plotSchema = z.object({
  name: z.string().min(1, 'Plot name is required').trim(),
  sizeAcres: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Size must be greater than 0'),
  notes: z.string().optional(),
});

type PlotFormData = z.infer<typeof plotSchema>;

export default function AddPlotPage() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlotFormData>({
    resolver: zodResolver(plotSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: PlotFormData) => {
    setErrorMessage(null);
    try {
      const farmId = 'farm_1'; // Placeholder - get from auth
      const sizeAcres = parseFloat(data.sizeAcres);
      
      if (isNaN(sizeAcres) || sizeAcres <= 0) {
        setErrorMessage('Invalid size value');
        return;
      }

      const plot: Plot = {
        id: uuidv4(),
        farmId,
        name: data.name.trim(),
        sizeAcres,
        notes: data.notes?.trim(),
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to local database first
      await db.plots.add(plot);
      
      // Mark for sync with Supabase
      await syncService.markForSync(farmId, 'plots', plot.id, 'create', plot);

      // Show success message and redirect
      alert('Plot created successfully!');
      router.push('/plots');
    } catch (error) {
      console.error('Error creating plot:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create plot. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/plots" />
          <h1 className="text-2xl font-bold">Add Plot</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {errorMessage}
            </div>
          )}

          <Input
            label="Plot Name *"
            placeholder="e.g., North Field, Grape Block A"
            {...register('name')}
            error={errors.name?.message}
          />

          <Input
            label="Size (Acres) *"
            type="number"
            step="0.01"
            placeholder="e.g., 2.5"
            {...register('sizeAcres')}
            error={errors.sizeAcres?.message}
          />

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              className="input-field min-h-[100px] resize-none"
              {...register('notes')}
              placeholder="Additional information about this plot..."
            />
          </div>

          <div className="flex gap-4">
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
              {isSubmitting ? 'Saving...' : 'Save Plot'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
