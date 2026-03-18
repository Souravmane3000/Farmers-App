'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/database';
import { FieldUsageLog, ApplicationMethod, SyncStatus, StockType, StockLog } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { syncService } from '@/lib/sync/syncService';
import { alertEngine } from '@/lib/alerts/alertEngine';
import { dbHelpers } from '@/lib/db/database';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const usageSchema = z.object({
  plotId: z.string().min(1, 'Plot is required'),
  cropId: z.string().min(1, 'Crop is required'),
  itemId: z.string().min(1, 'Item is required'),
  quantityUsed: z.string().min(1, 'Quantity is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Quantity must be greater than 0'),
  usageDate: z.string().min(1, 'Date is required'),
  usageTime: z.string().min(1, 'Time is required'),
  applicationMethod: z.nativeEnum(ApplicationMethod),
  rainProbability: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 100;
  }, 'Rain probability must be between 0 and 100'),
  weatherCondition: z.string().optional(),
  temperature: z.string().optional(),
  notes: z.string().optional(),
});

type UsageFormData = z.infer<typeof usageSchema>;

export default function AddUsagePage() {
  const router = useRouter();
  const { farm } = useAuth();
  const [plots, setPlots] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [rainAlert, setRainAlert] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UsageFormData>({
    resolver: zodResolver(usageSchema),
    mode: 'onChange',
    defaultValues: {
      usageDate: format(new Date(), 'yyyy-MM-dd'),
      usageTime: format(new Date(), 'HH:mm'),
      rainProbability: '0',
      applicationMethod: ApplicationMethod.SPRAY,
    },
  });

  const watchedRainProbability = watch('rainProbability');
  const watchedPlotId = watch('plotId');
  const watchedItemId = watch('itemId');

  useEffect(() => {
    if (farm) {
      loadData();
    }
  }, [farm]);

  useEffect(() => {
    if (watchedRainProbability !== undefined && watchedRainProbability !== '') {
      const probability = parseFloat(watchedRainProbability);
      if (!isNaN(probability)) {
        const alert = alertEngine.checkRainProbabilityAlert(probability);
        setRainAlert(alert);
      }
    }
  }, [watchedRainProbability]);

  useEffect(() => {
    if (watchedPlotId) {
      loadCropsForPlot(watchedPlotId);
    }
  }, [watchedPlotId]);

  useEffect(() => {
    if (watchedItemId) {
      loadStockForItem(watchedItemId);
    }
  }, [watchedItemId]);

  const loadData = async () => {
    if (!farm) return;
    try {
      setLoadingData(true);

      const plotsData = await db.plots.where('farmId').equals(farm.id).toArray();
      setPlots(plotsData);

      const itemsData = await db.inventoryItems.where('farmId').equals(farm.id).toArray();
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Failed to load plots and items');
    } finally {
      setLoadingData(false);
    }
  };

  const loadCropsForPlot = async (plotId: string) => {
    if (!farm) return;
    try {
      const cropsData = await db.crops
        .where('[farmId+plotId]')
        .equals([farm.id, plotId])
        .toArray();
      setCrops(cropsData);

      // Auto-select crop if only one
      if (cropsData.length === 1) {
        setValue('cropId', cropsData[0].id);
      }
    } catch (error) {
      console.error('Error loading crops:', error);
    }
  };

  const loadStockForItem = async (itemId: string) => {
    if (!farm) return;
    try {
      const stock = await dbHelpers.getCurrentStock(itemId, farm.id);
      setAvailableStock(stock);
    } catch (error) {
      console.error('Error loading stock:', error);
      setAvailableStock(0);
    }
  };

  const onSubmit = async (data: UsageFormData) => {
    setErrorMessage(null);
    if (!farm) {
      setErrorMessage('Farm not found. Please login again.');
      return;
    }
    
    try {
      const quantityUsed = parseFloat(data.quantityUsed);
      if (isNaN(quantityUsed) || quantityUsed <= 0) {
        setErrorMessage('Invalid quantity. Please enter a positive number.');
        return;
      }

      if (quantityUsed > availableStock) {
        setErrorMessage(`Insufficient stock! Available: ${availableStock}. Requested: ${quantityUsed}`);
        return;
      }

      const rainProbability = parseFloat(data.rainProbability) || 0;
      const temperature = data.temperature ? parseFloat(data.temperature) : undefined;

      const usageLog: FieldUsageLog = {
        id: uuidv4(),
        farmId: farm.id,
        plotId: data.plotId,
        cropId: data.cropId,
        itemId: data.itemId,
        quantityUsed,
        usageDate: data.usageDate,
        usageTime: data.usageTime,
        applicationMethod: data.applicationMethod,
        rainProbability,
        weatherCondition: data.weatherCondition || undefined,
        temperature,
        notes: data.notes?.trim() || undefined,
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save usage log to local DB
      await db.fieldUsageLogs.add(usageLog);

      // Auto-deduct stock
      const stockLog: StockLog = {
        id: uuidv4(),
        farmId: farm.id,
        itemId: data.itemId,
        type: StockType.OUT,
        quantity: quantityUsed,
        date: data.usageDate,
        notes: `Used in field: ${data.notes || 'Field application'}`,
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.stockLogs.add(stockLog);

      // Mark for sync with Supabase
      await syncService.markForSync(farm.id, 'fieldUsageLogs', usageLog.id, 'create', usageLog);
      await syncService.markForSync(farm.id, 'stockLogs', stockLog.id, 'create', stockLog);

      // Check alerts
      await alertEngine.checkAllAlerts(farm.id);

      // Success - redirect
      router.push('/');
      
    } catch (error) {
      console.error('Error saving field usage:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save field usage. Please try again.';
      setErrorMessage(errorMsg);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <h1 className="text-2xl font-bold">Add Field Usage</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {errorMessage}
            </div>
          )}

          {loadingData ? (
            <div className="card text-center py-8">
              <p className="text-gray-600">Loading plots and items...</p>
            </div>
          ) : (
            <>
              {/* Rain Alert */}
              {rainAlert && (
                <div className={`card ${rainAlert.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border-2`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`w-6 h-6 ${rainAlert.priority === 'high' ? 'text-red-600' : 'text-yellow-600'} flex-shrink-0 mt-0.5`} />
                    <div>
                      <h3 className="font-semibold text-lg">{rainAlert.title}</h3>
                      <p className="text-sm mt-1">{rainAlert.message}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plot Selection */}
              <Select
                label="Plot / Location *"
                options={plots.length > 0 ? plots.map(p => ({ value: p.id, label: p.name })) : []}
                {...register('plotId')}
                error={errors.plotId?.message}
              />

              {plots.length === 0 && (
                <p className="text-yellow-700 bg-yellow-50 p-3 rounded">
                  No plots found. Please add a plot first.
                </p>
              )}

              {/* Crop Selection */}
              {watchedPlotId && (
                <Select
                  label="Crop Being Treated *"
                  options={crops.map(c => ({
                    value: c.id,
                    label: `${c.name}${c.variety ? ` - ${c.variety}` : ''}`
                  }))}
                  {...register('cropId')}
                  error={errors.cropId?.message}
                />
              )}

              {/* Item Selection */}
              <div>
                <Select
                  label="Item Used *"
                  options={items.length > 0 ? items.map(i => ({ value: i.id, label: i.name })) : []}
                  {...register('itemId')}
                  error={errors.itemId?.message}
                />
                {items.length === 0 && (
                  <p className="text-yellow-700 bg-yellow-50 p-3 rounded mt-2">
                    No inventory items found. Please add items first.
                  </p>
                )}
                {watchedItemId && availableStock >= 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Available stock: <span className="font-semibold">{availableStock}</span>
                  </p>
                )}
              </div>

              {/* Quantity */}
              <Input
                label="Quantity Used *"
                type="number"
                step="0.01"
                placeholder="e.g., 2.5"
                {...register('quantityUsed')}
                error={errors.quantityUsed?.message}
              />

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Date *"
                  type="date"
                  {...register('usageDate')}
                  error={errors.usageDate?.message}
                />
                <Input
                  label="Time *"
                  type="time"
                  {...register('usageTime')}
                  error={errors.usageTime?.message}
                />
              </div>

              {/* Application Method */}
              <Select
                label="Application Method *"
                options={[
                  { value: ApplicationMethod.SPRAY, label: 'Spray' },
                  { value: ApplicationMethod.SPREAD, label: 'Spread' },
                  { value: ApplicationMethod.DRIP, label: 'Drip' },
                  { value: ApplicationMethod.BROADCAST, label: 'Broadcast' },
                  { value: ApplicationMethod.INJECTION, label: 'Injection' },
                ]}
                {...register('applicationMethod')}
                error={errors.applicationMethod?.message}
              />

              {/* Weather */}
              <div className="card bg-blue-50">
                <h3 className="font-semibold mb-4">Weather Conditions</h3>
                <div className="space-y-4">
                  <Input
                    label="Rain Probability (%)"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    {...register('rainProbability')}
                    error={errors.rainProbability?.message}
                  />
                  <Input
                    label="Weather Condition (e.g., Sunny, Cloudy, Rainy)"
                    type="text"
                    {...register('weatherCondition')}
                    error={errors.weatherCondition?.message}
                  />
                  <Input
                    label="Temperature (°C)"
                    type="number"
                    placeholder="e.g., 25"
                    {...register('temperature')}
                    error={errors.temperature?.message}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Notes (Optional)</label>
                <textarea
                  className="input-field min-h-[100px] resize-none"
                  {...register('notes')}
                  placeholder="Additional notes about this application..."
                />
              </div>

              {/* Submit Button */}
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
                  disabled={isSubmitting || loadingData}
                  className="flex-1"
                >
                  {isSubmitting ? 'Saving...' : 'Save Usage'}
                </Button>
              </div>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
