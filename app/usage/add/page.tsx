'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/db/database';
import { FieldUsageLog, ApplicationMethod, SyncStatus, SyncOperation } from '@/types';
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
  quantityUsed: z.number().min(0.01, 'Quantity must be greater than 0'),
  usageDate: z.string().min(1, 'Date is required'),
  usageTime: z.string().min(1, 'Time is required'),
  applicationMethod: z.nativeEnum(ApplicationMethod),
  rainProbability: z.number().min(0).max(100),
  weatherCondition: z.string().optional(),
  temperature: z.number().optional(),
  notes: z.string().optional(),
});

type UsageFormData = z.infer<typeof usageSchema>;

export default function AddUsagePage() {
  const router = useRouter();
  const [plots, setPlots] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedPlot, setSelectedPlot] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [rainAlert, setRainAlert] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UsageFormData>({
    resolver: zodResolver(usageSchema),
    defaultValues: {
      usageDate: format(new Date(), 'yyyy-MM-dd'),
      usageTime: format(new Date(), 'HH:mm'),
      rainProbability: 0,
      applicationMethod: ApplicationMethod.SPRAY,
    },
  });

  const watchedRainProbability = watch('rainProbability');
  const watchedPlotId = watch('plotId');
  const watchedItemId = watch('itemId');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (watchedRainProbability !== undefined) {
      const alert = alertEngine.checkRainProbabilityAlert(watchedRainProbability);
      setRainAlert(alert);
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
    // In a real app, get farmId from auth context
    const farmId = 'farm_1'; // Placeholder

    const plotsData = await db.plots.where('farmId').equals(farmId).toArray();
    setPlots(plotsData);

    const itemsData = await db.inventoryItems.where('farmId').equals(farmId).toArray();
    setItems(itemsData);
  };

  const loadCropsForPlot = async (plotId: string) => {
    const cropsData = await db.crops
      .where('[farmId+plotId]')
      .equals(['farm_1', plotId])
      .toArray();
    setCrops(cropsData);

    // Auto-select crop if only one
    if (cropsData.length === 1) {
      setValue('cropId', cropsData[0].id);
    }
  };

  const loadStockForItem = async (itemId: string) => {
    const stock = await dbHelpers.getCurrentStock(itemId, 'farm_1');
    setAvailableStock(stock);
  };

  const onSubmit = async (data: UsageFormData) => {
    if (data.quantityUsed > availableStock) {
      alert(`Insufficient stock! Available: ${availableStock}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const farmId = 'farm_1'; // Placeholder - get from auth
      const usageLog: FieldUsageLog = {
        id: `usage_${Date.now()}_${Math.random()}`,
        farmId,
        plotId: data.plotId,
        cropId: data.cropId,
        itemId: data.itemId,
        quantityUsed: data.quantityUsed,
        usageDate: data.usageDate,
        usageTime: data.usageTime,
        applicationMethod: data.applicationMethod,
        rainProbability: data.rainProbability,
        weatherCondition: data.weatherCondition,
        temperature: data.temperature,
        notes: data.notes,
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save usage log
      await db.fieldUsageLogs.add(usageLog);

      // Auto-deduct stock
      const stockLog = {
        id: `stock_${Date.now()}_${Math.random()}`,
        farmId,
        itemId: data.itemId,
        type: 'out' as const,
        quantity: data.quantityUsed,
        date: data.usageDate,
        notes: `Used in field: ${data.notes || 'Field application'}`,
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.stockLogs.add(stockLog);

      // Mark for sync
      await syncService.markForSync(
        farmId,
        'fieldUsageLogs',
        usageLog.id,
        'create',
        usageLog
      );

      await syncService.markForSync(
        farmId,
        'stockLogs',
        stockLog.id,
        'create',
        stockLog
      );

      // Check alerts
      await alertEngine.checkAllAlerts(farmId);

      router.push('/usage/history');
    } catch (error) {
      console.error('Error saving usage:', error);
      alert('Failed to save usage. Please try again.');
    } finally {
      setIsSubmitting(false);
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
          {/* Rain Alert */}
          {rainAlert && (
            <div className={`card ${rainAlert.priority === 'high' ? 'bg-danger-50 border-danger-200' : 'bg-warning-50 border-warning-200'} border-2`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-6 h-6 ${rainAlert.priority === 'high' ? 'text-danger-600' : 'text-warning-600'} flex-shrink-0 mt-0.5`} />
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
            options={plots.map(p => ({ value: p.id, label: p.name }))}
            {...register('plotId')}
            error={errors.plotId?.message}
            onChange={(e) => {
              setSelectedPlot(e.target.value);
              register('plotId').onChange(e);
            }}
          />

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
              options={items.map(i => ({ value: i.id, label: i.name }))}
              {...register('itemId')}
              error={errors.itemId?.message}
              onChange={(e) => {
                setSelectedItem(e.target.value);
                register('itemId').onChange(e);
              }}
            />
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
            {...register('quantityUsed', { valueAsNumber: true })}
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
                {...register('rainProbability', { valueAsNumber: true })}
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
                {...register('temperature', { valueAsNumber: true })}
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
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Usage'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
