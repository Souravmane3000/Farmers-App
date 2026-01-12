'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Home, 
  PlusCircle, 
  Package, 
  MapPin, 
  Sprout, 
  DollarSign, 
  FileText,
  Bell,
  Wifi,
  WifiOff
} from 'lucide-react';
import { db } from '@/lib/db/database';
import { syncService } from '@/lib/sync/syncService';
import { alertEngine } from '@/lib/alerts/alertEngine';

export default function HomePage() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial data
    loadDashboardData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = async () => {
    // Get pending syncs count
    const syncs = await db.syncQueue.toArray();
    setPendingSyncs(syncs.length);

    // Get unread alerts count
    const alerts = await db.alerts.filter(a => !a.isRead).toArray();
    setUnreadAlerts(alerts.length);
  };

  const menuItems = [
    { icon: PlusCircle, label: 'Add Usage', href: '/usage/add', color: 'bg-primary-500' },
    { icon: Package, label: 'Inventory', href: '/inventory', color: 'bg-blue-500' },
    { icon: MapPin, label: 'Plots', href: '/plots', color: 'bg-green-500' },
    { icon: Sprout, label: 'Crops', href: '/crops', color: 'bg-yellow-500' },
    { icon: DollarSign, label: 'Expenses', href: '/expenses', color: 'bg-purple-500' },
    { icon: FileText, label: 'Reports', href: '/reports', color: 'bg-orange-500' },
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Farm Management</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="w-6 h-6" />
            ) : (
              <WifiOff className="w-6 h-6 opacity-75" />
            )}
            {pendingSyncs > 0 && (
              <span className="bg-warning-500 text-white text-xs px-2 py-1 rounded-full">
                {pendingSyncs}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Status Bar */}
      {(pendingSyncs > 0 || unreadAlerts > 0) && (
        <div className="bg-warning-100 border-b border-warning-300 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {pendingSyncs > 0 && (
                <span className="text-warning-800">
                  {pendingSyncs} item(s) pending sync
                </span>
              )}
              {unreadAlerts > 0 && (
                <Link href="/alerts" className="flex items-center gap-2 text-danger-700">
                  <Bell className="w-4 h-4" />
                  <span>{unreadAlerts} alert(s)</span>
                </Link>
              )}
            </div>
            {!isOnline && (
              <span className="text-warning-800 font-semibold">
                Offline - Will sync when online
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Menu Grid */}
      <main className="p-4">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`icon-btn ${item.color} text-white`}
              >
                <Icon className="w-10 h-10 mb-2" />
                <span className="text-sm font-semibold text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="text-3xl font-bold text-primary-600">0</div>
              <div className="text-sm text-gray-600">Total Plots</div>
            </div>
            <div className="card">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Active Crops</div>
            </div>
            <div className="card">
              <div className="text-3xl font-bold text-danger-600">{unreadAlerts}</div>
              <div className="text-sm text-gray-600">Alerts</div>
            </div>
            <div className="card">
              <div className="text-3xl font-bold text-warning-600">{pendingSyncs}</div>
              <div className="text-sm text-gray-600">Pending Sync</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
