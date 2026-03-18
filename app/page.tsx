'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  PlusCircle, 
  Package, 
  MapPin, 
  Sprout, 
  DollarSign, 
  FileText,
  Search, 
  Bell, 
  ArrowUpRight, 
  Wifi,
  WifiOff,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { db } from '@/lib/db/database';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const router = useRouter();
  const { user, farm, isLoading, isAuthenticated, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncs, setPendingSyncs] = useState(0);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [activeTab, setActiveTab] = useState(22); // Day 22

  const days = [
    { day: 'M', date: 18 },
    { day: 'T', date: 19 },
    { day: 'W', date: 20 },
    { day: 'T', date: 21 },
    { day: 'F', date: 22 },
    { day: 'S', date: 23 },
    { day: 'S', date: 24 },
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial data
    if (isAuthenticated) {
      loadDashboardData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get pending syncs count
      const syncs = await db.syncQueue.toArray();
      setPendingSyncs(syncs.length);

      // Get unread alerts count
      const alerts = await db.alerts.filter(a => !a.isRead).toArray();
      setUnreadAlerts(alerts.length);
    } catch(err) {
      console.error(err);
    }
  };

  const menuItems = [
    { icon: PlusCircle, label: 'Add Usage', href: '/usage/add', color: 'bg-white', text: 'text-gray-800' },
    { icon: Package, label: 'Inventory', href: '/inventory', color: 'bg-white', text: 'text-gray-800' },
    { icon: MapPin, label: 'Plots', href: '/plots', color: 'bg-white/10', text: 'text-white border border-white/20' },
    { icon: Sprout, label: 'Crops', href: '/crops', color: 'bg-white/10', text: 'text-white border border-white/20' },
    { icon: DollarSign, label: 'Expenses', href: '/expenses', color: 'bg-white/90', text: 'text-gray-800' },
    { icon: FileText, label: 'Reports', href: '/reports', color: 'bg-white/90', text: 'text-gray-800' },
  ];

  return (
    <div className="flex-1 w-full bg-white md:bg-gray-50/50 md:rounded-[2rem] h-full overflow-y-auto overflow-x-hidden hide-scrollbar">
      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-6 pt-10 pb-4 md:sticky top-0 bg-white/80 backdrop-blur-xl z-20 flex items-center justify-between border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Farm Overview</h1>
          {user && <p className="text-sm text-gray-600 mt-1">{farm?.name || 'My Farm'}</p>}
        </div>
        <div className="flex gap-4 items-center text-gray-400">
          <div className="flex items-center gap-2 mr-2">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-gray-400 opacity-75" />
            )}
            {pendingSyncs > 0 && (
              <span className="bg-[#e99c36] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                SYNC
              </span>
            )}
          </div>
          <Search className="w-6 h-6 hover:text-gray-600 transition-colors cursor-pointer" />
          <Link href="/alerts" className="relative cursor-pointer">
            <Bell className="w-6 h-6 hover:text-gray-600 transition-colors" />
            {unreadAlerts > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#db513f] border-2 border-white rounded-full"></span>
            )}
          </Link>
          <button
            onClick={() => {
              logout();
              router.push('/auth/login');
            }}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-gray-600 hover:text-red-600" />
          </button>
        </div>
      </header>
      
      {/* Offline Status Bar */}
      {!isOnline && (
        <div className="bg-[#e99c36]/10 border-b border-[#e99c36]/30 p-2 px-6">
          <div className="flex items-center justify-between text-xs font-bold text-[#e99c36]">
            <span>Working Offline</span>
            <span>{pendingSyncs} items pending sync</span>
          </div>
        </div>
      )}

      {/* Date Carousel */}
      <div className="px-6 py-6 border-b border-gray-100/60">
        <h2 className="text-xl font-bold text-gray-800 mb-4">July {activeTab}</h2>
        <div className="flex justify-between items-center max-w-lg">
          {days.map((d, i) => (
            <div 
              key={i} 
              onClick={() => setActiveTab(d.date)}
              className={`flex flex-col items-center gap-2 cursor-pointer transition-all ${
                activeTab === d.date ? 'scale-110' : 'opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`text-[11px] font-bold ${activeTab === d.date ? 'text-gray-800' : 'text-gray-400'}`}>
                {d.day}
              </span>
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all
                  ${activeTab === d.date ? 'bg-[#1b8061] text-white shadow-lg shadow-[#1b8061]/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {d.date}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-6 pb-32 md:pb-8">
        
        {/* Quick Stats Block (Styled like Calving) */}
        <section className="bg-gradient-to-br from-[#1b8061] to-[#125c46] rounded-3xl p-6 text-white shadow-xl shadow-[#1b8061]/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-bold mb-1">Quick Actions</h3>
              <p className="text-green-100/80 font-medium text-sm">Tap an action to proceed</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10 mb-6">
            {menuItems.slice(0, 4).map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={idx} href={item.href} className={`${item.color} ${item.text} rounded-2xl p-4 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95 group/card`}>
                  <Icon className={`w-8 h-8 mb-2 ${idx < 2 ? 'text-[#1b8061]' : 'text-white/80'}`} />
                  <p className="text-[12px] font-bold leading-tight">{item.label}</p>
                  {idx < 2 && <ArrowUpRight className="w-4 h-4 text-gray-300 ml-auto mt-2 group-hover/card:text-[#1b8061]" />}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Sync & Analytics Block (Styled like Feeding) */}
        <section className="bg-[#568a2d] rounded-3xl p-6 text-white shadow-xl shadow-[#568a2d]/20 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div>
              <h3 className="text-xl font-bold mb-1">State & Sync</h3>
              <p className="text-white/80 font-medium">System connection status</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10 mb-6">
            <div className="bg-white rounded-2xl p-4 text-gray-800 shadow-sm">
              <div className="text-2xl font-black mb-1 text-[#2c4d16]">{pendingSyncs}</div>
              <p className="text-[10px] text-gray-500 font-bold leading-tight">Requests pending to upload</p>
            </div>
            <div className="bg-white rounded-2xl p-4 text-gray-800 shadow-sm">
              <div className="text-2xl font-black mb-1 text-[#2c4d16]">{unreadAlerts}</div>
              <p className="text-[10px] text-gray-500 font-bold leading-tight">Events needing attention</p>
            </div>
          </div>

          {/* Table-like list for Activity */}
          <div className="bg-[#487a20] rounded-2xl p-4 relative z-10">
            <h4 className="text-[10px] font-bold text-white/50 mb-3 border-b border-white/10 pb-2 uppercase tracking-wide">Recent Farm Logs</h4>
            <div className="space-y-3">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#a8c639]/20 rounded-lg">
                    <Sprout className="w-4 h-4 text-[#c2de2f]"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-white leading-tight">Planted Wheat</p>
                    <p className="text-[9px] text-white/50 font-bold">Plot A-12</p>
                  </div>
                  <span className="text-[9px] text-[#c2de2f] bg-[#c2de2f]/10 px-2 py-1 flex items-center rounded-md font-bold shadow-sm">Today</span>
               </div>
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#a8c639]/20 rounded-lg">
                    <DollarSign className="w-4 h-4 text-[#c2de2f]"/>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-white leading-tight">Fertilizer Purchased</p>
                    <p className="text-[9px] text-white/50 font-bold">50 kg Nitrogen</p>
                  </div>
                  <span className="text-[9px] text-[#c2de2f] bg-[#c2de2f]/10 px-2 py-1 flex items-center rounded-md font-bold shadow-sm">Yesterday</span>
               </div>
            </div>
          </div>
        </section>

        {/* Action Shortcuts (Styled like Reproduction) */}
        <section className="bg-gradient-to-br from-[#12a171] to-[#0c8a5a] rounded-3xl p-6 text-white shadow-xl lg:col-span-1 shadow-[#12a171]/20">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-1">Financial</h3>
            <p className="text-green-100/80 font-medium">Tracking and reporting</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-6">
            {menuItems.slice(4, 6).map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={idx} href={item.href} className={`${item.color} ${item.text} rounded-2xl p-4 cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95 group/card ${idx === 1 ? 'border-transparent hover:border-white' : ''}`}>
                  <Icon className="w-8 h-8 mb-2 text-[#0c8a5a]" />
                  <p className="text-[12px] font-bold leading-tight">{item.label}</p>
                </Link>
              );
            })}
          </div>
          
          {unreadAlerts > 0 && (
             <Link href="/alerts" className="bg-[#0b784e]/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg block max-w-full">
                <div className="flex items-center justify-between mb-3 text-sm">
                  <div className="flex gap-2">
                    <span className="bg-[#c2de2f] text-gray-800 shadow-md text-[10px] font-bold px-2 py-1 rounded-md">SYS</span>
                  </div>
                  <span className="text-[10px] font-bold text-green-100">Action</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning-400" />
                    <span className="font-bold text-sm">You have {unreadAlerts} unread alert(s)</span>
                  </div>
                </div>
              </Link>
          )}
        </section>

      </div>
    </div>
  );
}
