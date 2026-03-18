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
import { Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';

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
  const [loadingPlots, setLoadingPlots] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
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

  const handleDirectSave = async (data: CropFormData) => {
    console.log('[CropAdd] Saving directly to Supabase:', data);
    setErrorMessage(null);
    setSyncStatus('syncing');

    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      setSyncStatus('error');
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

      console.log('[CropAdd] Created crop:', crop);
      
      // Save to local database
      await db.crops.add(crop);
      console.log('[CropAdd] Crop saved to local DB');

      // Immediately sync to Supabase
      console.log('[CropAdd] Syncing to Supabase...');
      const response = await fetch('/api/sync/crops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crop),
      });

      if (!response.ok) {
        throw new Error(`Failed to save to Supabase: ${response.statusText}`);
      }

      // Update sync status to SYNCED
      await db.crops.update(crop.id, {
        syncStatus: SyncStatus.SYNCED,
        updatedAt: new Date().toISOString(),
      });

      console.log('[CropAdd] Crop successfully saved to Supabase');
      
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
      console.error('[CropAdd] Error:', error);
      setSyncStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Failed to save crop';
      setErrorMessage(errorMsg);
      
      setTimeout(() => setSyncStatus('idle'), 3000);
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
            type="button"
            onClick={handleSubmit(handleDirectSave)}
            disabled={!isValid || syncStatus === 'syncing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
              syncStatus === 'syncing'
                ? 'bg-white/30 text-white cursor-not-allowed animate-pulse'
                : !isValid
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
                <Loader className="w-5 h-5 animate-spin" />
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
                Save
              </>
            )}
          </button>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form className="card space-y-6">
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

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/crops')}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
