'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

export default function EditCropPage() {
  const router = useRouter();
  const params = useParams();
  const { farm } = useAuth();
  const cropId = params?.id as string;

  const [plots, setPlots] = useState<Plot[]>([]);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CropFormData>({
    resolver: zodResolver(cropSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (farm && cropId) {
      loadData();
    }
  }, [farm, cropId]);

  const loadData = async () => {
    if (!farm || !cropId) return;
    try {
      const cropData = await db.crops.get(cropId);
      if (!cropData || cropData.farmId !== farm.id) {
        setErrorMessage('Crop not found');
        return;
      }

      setCrop(cropData);

      const plotsData = await db.plots.where('farmId').equals(farm.id).toArray();
      setPlots(plotsData);

      // Pre-fill form
      reset({
        plotId: cropData.plotId,
        name: cropData.name,
        variety: cropData.variety,
        plantingDate: cropData.plantingDate,
        expectedHarvestDate: cropData.expectedHarvestDate,
        status: cropData.status,
      });
    } catch (error) {
      console.error('Error loading crop:', error);
      setErrorMessage('Failed to load crop');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CropFormData) => {
    setErrorMessage(null);
    if (!farm || !crop) {
      setErrorMessage('Farm or crop not found. Please login again.');
      return;
    }

    try {
      const updatedCrop: Crop = {
        ...crop,
        plotId: data.plotId,
        name: data.name.trim(),
        variety: data.variety?.trim(),
        plantingDate: data.plantingDate,
        expectedHarvestDate: data.expectedHarvestDate || undefined,
        status: data.status as CropStatus,
        updatedAt: new Date().toISOString(),
      };

      // Update local database
      await db.crops.update(crop.id, updatedCrop);
      
      // Mark for sync with Supabase
      await syncService.markForSync(farm.id, 'crops', crop.id, 'update', updatedCrop);

      // Success - redirect to crops list
      router.push('/crops');
      
    } catch (error) {
      console.error('Error updating crop:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to update crop. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading crop...</div>
      </div>
    );
  }

  if (!crop) {
    return (
      <div className="min-h-screen pb-20 bg-gray-50">
        <header className="bg-primary-600 text-white p-4 shadow-lg">
          <div className="flex items-center gap-4">
            <BackButton href="/crops" />
            <h1 className="text-2xl font-bold">Edit Crop</h1>
          </div>
        </header>
        <main className="p-4 max-w-2xl mx-auto">
          <div className="card p-8 text-center">
            <p className="text-red-700 mb-4">{errorMessage || 'Crop not found'}</p>
            <Button variant="primary" onClick={() => router.push('/crops')}>
              Back to Crops
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/crops" />
          <h1 className="text-2xl font-bold">Edit Crop</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {errorMessage}
            </div>
          )}

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
              {isSubmitting ? 'Updating...' : 'Update Crop'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
