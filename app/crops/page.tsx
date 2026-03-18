'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Leaf, Edit, Trash2, Calendar } from 'lucide-react';
import { db } from '@/lib/db/database';
import { Crop, Plot, CropStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { syncService } from '@/lib/sync/syncService';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';

export default function CropsPage() {
  const { farm } = useAuth();
  const [crops, setCrops] = useState<(Crop & { plotName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farm) {
      loadCrops();
    }
  }, [farm]);

  const loadCrops = async () => {
    if (!farm) return;
    try {
      const cropsData = await db.crops.where('farmId').equals(farm.id).toArray();
      
      // Enrich with plot names
      const enrichedCrops = await Promise.all(
        cropsData.map(async (crop) => {
          const plot = await db.plots.get(crop.plotId);
          return { ...crop, plotName: plot?.name };
        })
      );
      
      setCrops(enrichedCrops);
    } catch (error) {
      console.error('Error loading crops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cropId: string, cropName: string) => {
    if (!confirm(`Delete crop "${cropName}"? This cannot be undone.`)) return;

    try {
      await db.crops.delete(cropId);
      
      // Mark for sync with Supabase
      if (farm) {
        await syncService.markForSync(farm.id, 'crops', cropId, 'delete', {});
      }
      
      loadCrops();
    } catch (error) {
      console.error('Error deleting crop:', error);
      alert('Failed to delete crop');
    }
  };

  const getStatusColor = (status: CropStatus) => {
    switch (status) {
      case CropStatus.PLANTED:
        return 'bg-blue-100 text-blue-800';
      case CropStatus.GROWING:
        return 'bg-green-100 text-green-800';
      case CropStatus.HARVESTED:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDaysRemaining = (harvestDate?: string) => {
    if (!harvestDate) return null;
    const today = new Date();
    const harvest = new Date(harvestDate);
    const days = Math.ceil((harvest.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton href="/" />
            <h1 className="text-2xl font-bold">Crops</h1>
          </div>
          <Link href="/crops/add">
            <Button variant="secondary" size="sm" icon={<Plus className="w-5 h-5" />}>
              Add Crop
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {crops.length === 0 ? (
          <div className="card text-center py-12">
            <Leaf className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Crops Yet</h2>
            <p className="text-gray-600 mb-6">Create your first crop to get started</p>
            <Link href="/crops/add">
              <Button variant="primary" icon={<Plus className="w-5 h-5" />}>
                Plant Your First Crop
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {crops.map((crop) => {
              const daysRemaining = calculateDaysRemaining(crop.expectedHarvestDate);
              
              return (
                <div key={crop.id} className="card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Leaf className="w-6 h-6 text-primary-600" />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold">{crop.name}</h3>
                          {crop.variety && (
                            <p className="text-sm text-gray-600">Variety: {crop.variety}</p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(crop.status)}`}>
                          {crop.status.charAt(0).toUpperCase() + crop.status.slice(1)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-4">
                        <div>
                          <p className="text-gray-600">Plot</p>
                          <p className="font-semibold">{crop.plotName || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Planted</p>
                          <p className="font-semibold text-sm">{formatDate(crop.plantingDate)}</p>
                        </div>
                        {crop.expectedHarvestDate && (
                          <div>
                            <p className="text-gray-600">Expected Harvest</p>
                            <p className="font-semibold text-sm">{formatDate(crop.expectedHarvestDate)}</p>
                          </div>
                        )}
                        {daysRemaining !== null && daysRemaining > 0 && (
                          <div>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Calendar className="w-4 h-4" /> Days Left
                            </p>
                            <p className="font-semibold text-sm">{daysRemaining} days</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/crops/${crop.id}/edit`}>
                        <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                          <Edit className="w-5 h-5" />
                        </button>
                      </Link>
                      <button
                        onClick={() => handleDelete(crop.id, crop.name)}
                        className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
