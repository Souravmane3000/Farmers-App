'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react';
import { db } from '@/lib/db/database';
import { Plot } from '@/types';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';

export default function PlotsPage() {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlots();
  }, []);

  const loadPlots = async () => {
    try {
      const farmId = 'farm_1'; // Placeholder - get from auth
      const plotsData = await db.plots.where('farmId').equals(farmId).toArray();
      setPlots(plotsData);
    } catch (error) {
      console.error('Error loading plots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (plotId: string) => {
    if (!confirm('Are you sure you want to delete this plot?')) return;

    try {
      await db.plots.delete(plotId);
      loadPlots();
    } catch (error) {
      console.error('Error deleting plot:', error);
      alert('Failed to delete plot');
    }
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
            <h1 className="text-2xl font-bold">Plots</h1>
          </div>
          <Link href="/plots/add">
            <Button variant="secondary" size="sm" icon={<Plus className="w-5 h-5" />}>
              Add Plot
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {plots.length === 0 ? (
          <div className="card text-center py-12">
            <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Plots Yet</h2>
            <p className="text-gray-600 mb-6">Create your first plot to get started</p>
            <Link href="/plots/add">
              <Button variant="primary" icon={<Plus className="w-5 h-5" />}>
                Add Your First Plot
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {plots.map((plot) => (
              <div key={plot.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-6 h-6 text-primary-600" />
                      <h3 className="text-xl font-bold">{plot.name}</h3>
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <p>Size: {plot.sizeAcres} acres</p>
                      {plot.currentCropId && (
                        <p>Current Crop: {plot.currentCropId}</p>
                      )}
                      {plot.notes && (
                        <p className="text-sm">{plot.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/plots/${plot.id}/edit`}>
                      <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                        <Edit className="w-5 h-5" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(plot.id)}
                      className="p-2 text-danger-600 hover:bg-danger-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link href={`/plots/${plot.id}`}>
                    <Button variant="secondary" size="sm" className="w-full">
                      View Details & History
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
