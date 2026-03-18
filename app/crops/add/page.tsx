'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import { Crop, Plot, SyncStatus, CropStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { syncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';

const cropSchema = z.object({
  plotId: z.string().min(1, 'Plot is required'),
  name: z.string().min(1, 'Crop name is required'),
  variety: z.string().optional(),
  plantingDate: z.string().min(1, 'Planting date is required'),
  expectedHarvestDate: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
});

type CropFormData = z.infer<typeof cropSchema>;

export default function AddCropPage() {
  const router = useRouter();
  const { farm } = useAuth();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingPlots, setLoadingPlots] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CropFormData>({
    resolver: zodResolver(cropSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (farm) {
      loadPlots();
    }
  }, [farm]);

  const loadPlots = async () => {
    if (!farm) return;
    try {
      const plotsData = await db.plots.where('farmId').equals(farm.id).toArray();
      setPlots(plotsData);
    } catch (error) {
      console.error('Error loading plots:', error);
      setErrorMessage('Failed to load plots');
    } finally {
      setLoadingPlots(false);
    }
  };

  const onSubmit = async (data: CropFormData) => {
    setErrorMessage(null);
    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      return;
    }

    try {
      const crop: Crop = {
        id: uuidv4(),
        farmId: farm.id,
        plotId: data.plotId,
        name: data.name.trim(),
        variety: data.variety?.trim(),
        plantingDate: data.plantingDate,
        expectedHarvestDate: data.expectedHarvestDate || undefined,
        status: data.status as CropStatus,
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to local database
      await db.crops.add(crop);
      
      // Mark for sync with Supabase
      await syncService.markForSync(farm.id, 'crops', crop.id, 'create', crop);

      // Success - redirect to crops list
      router.push('/crops');
      
    } catch (error) {
      console.error('Error creating crop:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create crop. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  if (loadingPlots) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading plots...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/crops" />
          <h1 className="text-2xl font-bold">Plant New Crop</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {errorMessage}
            </div>
          )}

          {plots.length === 0 ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded text-blue-700">
              <p className="mb-3">No plots found. Create a plot first to add crops.</p>
              <Link href="/plots/add">
                <Button variant="primary" size="sm">
                  Create Plot
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <Select
                label="Select Plot *"
                options={plots.map((p) => ({ value: p.id, label: p.name }))}
                {...register('plotId')}
                error={errors.plotId?.message}
              />

              <Input
                label="Crop Name *"
                placeholder="e.g., Tomato, Wheat, Rice"
                {...register('name')}
                error={errors.name?.message}
              />

              <Input
                label="Variety (Optional)"
                placeholder="e.g., Roma, Cherry, Beefsteak"
                {...register('variety')}
                error={errors.variety?.message}
              />

              <Input
                label="Planting Date *"
                type="date"
                {...register('plantingDate')}
                error={errors.plantingDate?.message}
              />

              <Input
                label="Expected Harvest Date (Optional)"
                type="date"
                {...register('expectedHarvestDate')}
                error={errors.expectedHarvestDate?.message}
              />

              <Select
                label="Status *"
                options={[
                  { value: CropStatus.PLANTED, label: 'Planted' },
                  { value: CropStatus.GROWING, label: 'Growing' },
                  { value: CropStatus.HARVESTED, label: 'Harvested' },
                ]}
                {...register('status')}
                error={errors.status?.message}
              />

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
                  {isSubmitting ? 'Saving...' : 'Save Crop'}
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
