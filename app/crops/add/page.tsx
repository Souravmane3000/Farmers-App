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
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [savedCrops, setSavedCrops] = useState<number>(0);
  const [loadingPlots, setLoadingPlots] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
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

  const onSubmitLocal = async (data: CropFormData) => {
    console.log('[CropAdd] Form submitted with data:', data);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (!farm) {
      console.error('[CropAdd] Farm not found');
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

      console.log('[CropAdd] Creating crop:', crop);
      // Save to local database
      await db.crops.add(crop);
      console.log('[CropAdd] Crop added to DB, incrementing counter from', savedCrops, 'to', savedCrops + 1);

      // Reset form and show success (no redirect)
      reset();
      setSavedCrops(prev => {
        console.log('[CropAdd] setSavedCrops called, new count:', prev + 1);
        return prev + 1;
      });
      setSuccessMessage(`✓ "${data.name}" ready for sync. Click "Save (1)" button (top right) to save to Supabase!`);
      console.log('[CropAdd] Form reset, success message shown');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (error) {
      console.error('[CropAdd] Error creating crop:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create crop. Please try again.';
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
      // Get all pending crops for this farm
      const pendingCrops = await db.crops
        .where('farmId')
        .equals(farm.id)
        .filter(crop => crop.syncStatus === SyncStatus.PENDING)
        .toArray();

      if (pendingCrops.length === 0) {
        setErrorMessage('No pending crops to sync');
        setSyncStatus('idle');
        return;
      }

      // Sync each crop to Supabase
      for (const crop of pendingCrops) {
        const response = await fetch('/api/sync/crops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(crop),
        });

        if (!response.ok) {
          throw new Error(`Failed to sync crop: ${crop.name}`);
        }

        // Update sync status locally
        await db.crops.update(crop.id, {
          syncStatus: SyncStatus.SYNCED,
          updatedAt: new Date().toISOString(),
        });
      }

      setSyncStatus('success');
      setSuccessMessage(`✓ Successfully saved ${pendingCrops.length} crop(s) to Supabase!`);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton href="/crops" />
            <h1 className="text-2xl font-bold">Plant New Crop</h1>
          </div>
          <button
            onClick={handleSyncToSupabase}
            disabled={syncStatus === 'syncing' || savedCrops === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              syncStatus === 'syncing'
                ? 'bg-white/30 text-white cursor-not-allowed animate-pulse'
                : savedCrops === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : syncStatus === 'success'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : syncStatus === 'error'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-700 text-white hover:bg-green-800 cursor-pointer shadow-md'
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
                Save ({savedCrops})
              </>
            )}
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmitLocal)} className="card space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {savedCrops > 0 && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs font-semibold">
              Crops ready to sync: {savedCrops} (click "Save" button in top right to save to Supabase)
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
                  onClick={() => router.push('/crops')}
                  className="flex-1"
                >
                  Back to Crops
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Adding...' : 'Add Crop'}
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
