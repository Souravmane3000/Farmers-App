'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';
import { db, dbHelpers } from '@/lib/db/database';
import { CurrentStock, InventoryItem, StockLog, StockType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';

export default function InventoryPage() {
  const { farm } = useAuth();
  const [stocks, setStocks] = useState<CurrentStock[]>([]);
  const [stockLogs, setStockLogs] = useState<Record<string, StockLog[]>>({});
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low'>('all');

  useEffect(() => {
    if (farm) {
      loadInventory();
    }
  }, [farm]);

  const loadInventory = async () => {
    if (!farm) return;
    try {
      const stocksData = await dbHelpers.getAllCurrentStocks(farm.id);
      setStocks(stocksData);
      
      const logsData = await db.stockLogs.where('farmId').equals(farm.id).reverse().sortBy('date');
      const logsByItem: Record<string, StockLog[]> = {};
      logsData.forEach(log => {
        if (!logsByItem[log.itemId]) {
          logsByItem[log.itemId] = [];
        }
        logsByItem[log.itemId].push(log);
      });
      setStockLogs(logsByItem);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
        <div className="flex items-center gap-3">
          <BackButton href="/" />
          <h1 className="text-xl font-bold flex-1">Inventory</h1>
          <Link href="/inventory/add">
            <Button variant="secondary" size="sm">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link href="/inventory/stock-in" className="block">
            <div className="card bg-green-50 border-2 border-green-200 text-center py-3 hover:bg-green-100 transition-colors">
              <ArrowUp className="w-6 h-6 mx-auto text-green-600 mb-1" />
              <span className="font-semibold text-green-800 text-sm">Stock In</span>
            </div>
          </Link>
          <Link href="/inventory/stock-out" className="block">
            <div className="card bg-red-50 border-2 border-red-200 text-center py-3 hover:bg-red-100 transition-colors">
              <ArrowDown className="w-6 h-6 mx-auto text-red-600 mb-1" />
              <span className="font-semibold text-red-800 text-sm">Stock Out</span>
            </div>
          </Link>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-lg font-semibold text-sm ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 ${
              filter === 'low' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 border'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Low Stock ({stocks.filter(s => s.isLowStock).length})
          </button>
        </div>

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
                <Button variant="primary">
                  Add Item
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStocks.map((stock) => {
              const isExpanded = expandedItems.has(stock.itemId);
              const logs = stockLogs[stock.itemId] || [];
              
              return (
                <div
                  key={stock.itemId}
                  className={`card p-4 ${stock.isLowStock ? 'border-2 border-red-300 bg-red-50' : ''}`}
                >
                  <button
                    onClick={() => toggleItem(stock.itemId)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Package className={`w-5 h-5 flex-shrink-0 ${stock.isLowStock ? 'text-red-600' : 'text-primary-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">{stock.itemName}</h3>
                          {stock.isLowStock && (
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          <span className="font-medium">
                            {stock.currentQuantity} {stock.unit}
                          </span>
                          <span className="text-gray-400">|</span>
                          <span className="capitalize">{stock.category}</span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-sm mb-3">
                        <span className="text-gray-600">Min Threshold:</span>
                        <span className="font-medium">{stock.minThreshold} {stock.unit}</span>
                      </div>

                      {logs.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-semibold text-gray-700">Recent Activity</p>
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {logs.slice(0, 5).map((log) => (
                              <div 
                                key={log.id} 
                                className={`flex items-center justify-between text-sm p-2 rounded ${
                                  log.type === StockType.IN 
                                    ? 'bg-green-50 text-green-800' 
                                    : 'bg-red-50 text-red-800'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {log.type === StockType.IN ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3" />
                                  )}
                                  <span>{log.type === StockType.IN ? '+' : '-'}{log.quantity} {stock.unit}</span>
                                </div>
                                <span className="text-xs">
                                  {formatDate(log.date)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No activity yet</p>
                      )}

                      <Link href={`/inventory/${stock.itemId}`} className="block mt-3">
                        <Button variant="secondary" size="sm" className="w-full">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
