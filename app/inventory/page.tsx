'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { db, dbHelpers } from '@/lib/db/database';
import { CurrentStock, InventoryItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import { SyncService } from '@/lib/sync/syncService';

export default function InventoryPage() {
  const { farm } = useAuth();
  const [stocks, setStocks] = useState<CurrentStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    if (farm) {
      loadInventory();
      loadPendingSyncCount();
    }
  }, [farm]);

  const loadInventory = async () => {
    if (!farm) return;
    try {
      const stocksData = await dbHelpers.getAllCurrentStocks(farm.id);
      setStocks(stocksData);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingSyncCount = async () => {
    if (!farm) return;
    try {
      const pendingSyncs = await db.syncQueue.where('farmId').equals(farm.id).toArray();
      setPendingSyncCount(pendingSyncs.length);
    } catch (error) {
      console.error('Error loading pending syncs:', error);
    }
  };

  const handleSync = async () => {
    if (!farm) return;
    
    setSyncStatus('syncing');
    setSyncMessage('');
    
    try {
      const syncService = new SyncService();
      await syncService.sync(farm.id);
      
      // Wait a bit for the UI to reflect changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload sync count
      await loadPendingSyncCount();
      
      setSyncStatus('success');
      setSyncMessage('✓ All data saved to Supabase successfully!');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      setSyncMessage(`Error: ${error instanceof Error ? error.message : 'Failed to sync data'}`);
      
      // Reset error message after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 5000);
    }
  };

  const filteredStocks = filter === 'low' 
    ? stocks.filter(s => s.isLowStock)
    : stocks;

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
            <h1 className="text-2xl font-bold">Inventory</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncStatus === 'syncing' || pendingSyncCount === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                syncStatus === 'syncing'
                  ? 'bg-white/30 text-white cursor-not-allowed'
                  : pendingSyncCount === 0
                  ? 'bg-white/20 text-white/70 cursor-not-allowed'
                  : syncStatus === 'success'
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : syncStatus === 'error'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white text-primary-600 hover:bg-gray-100'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  Save ({pendingSyncCount})
                </>
              )}
            </button>
            <Link href="/inventory/add">
              <Button variant="secondary" size="sm" icon={<Plus className="w-5 h-5" />}>
                Add Item
              </Button>
            </Link>
          </div>
        </div>
        {syncMessage && (
          <div className={`mt-2 text-sm ${syncStatus === 'error' ? 'text-red-100' : 'text-green-100'}`}>
            {syncMessage}
          </div>
        )}
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link href="/inventory/stock-in">
            <div className="card bg-green-50 border-2 border-green-200 text-center py-4">
              <ArrowUp className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <span className="font-semibold text-green-800">Stock In</span>
            </div>
          </Link>
          <Link href="/inventory/stock-out">
            <div className="card bg-red-50 border-2 border-red-200 text-center py-4">
              <ArrowDown className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <span className="font-semibold text-red-800">Stock Out</span>
            </div>
          </Link>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
              filter === 'low' ? 'bg-danger-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
            Low Stock ({stocks.filter(s => s.isLowStock).length})
          </button>
        </div>

        {/* Inventory List */}
        {filteredStocks.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {filter === 'low' ? 'No Low Stock Items' : 'No Inventory Items'}
            </h2>
            <p className="text-gray-600 mb-6">
              {filter === 'low' 
                ? 'All items are well stocked!' 
                : 'Add your first inventory item to get started'}
            </p>
            {filter === 'all' && (
              <Link href="/inventory/add">
                <Button variant="primary" icon={<Plus className="w-5 h-5" />}>
                  Add Item
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredStocks.map((stock) => (
              <div
                key={stock.itemId}
                className={`card ${stock.isLowStock ? 'border-2 border-danger-300 bg-danger-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className={`w-6 h-6 ${stock.isLowStock ? 'text-danger-600' : 'text-primary-600'}`} />
                      <h3 className="text-xl font-bold">{stock.itemName}</h3>
                      {stock.isLowStock && (
                        <AlertTriangle className="w-5 h-5 text-danger-600" />
                      )}
                    </div>
                    <div className="space-y-1 text-gray-600">
                      <p>
                        <span className="font-semibold">Current Stock:</span>{' '}
                        {stock.currentQuantity} {stock.unit}
                      </p>
                      <p>
                        <span className="font-semibold">Min Threshold:</span>{' '}
                        {stock.minThreshold} {stock.unit}
                      </p>
                      <p className="capitalize">
                        <span className="font-semibold">Category:</span> {stock.category}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Link href={`/inventory/${stock.itemId}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      View Details
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
