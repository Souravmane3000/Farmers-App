'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/db/database';
import { v4 as uuidv4 } from 'uuid';
import { Plot, SyncStatus } from '@/types';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<string>('Checking...');
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    url: string;
    key: string;
  }>({
    configured: false,
    url: '',
    key: '',
  });

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev]);
    console.log(`[${timestamp}] ${message}`);
  };

  useEffect(() => {
    checkEnvironment();
    checkDatabase();
  }, []);

  const checkEnvironment = () => {
    addLog('🔍 Checking Supabase configuration...');
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const isConfigured = !!url && url !== 'https://your-project.supabase.co' && 
                         !!key && key !== 'your-supabase-anon-key';

    setSupabaseStatus({
      configured: isConfigured,
      url: url ? `${url.substring(0, 20)}...` : 'NOT SET',
      key: key ? `${key.substring(0, 20)}...` : 'NOT SET',
    });

    if (isConfigured) {
      addLog('✅ Supabase credentials are CONFIGURED');
    } else {
      addLog('❌ Supabase credentials are NOT CONFIGURED (placeholder values)');
      addLog('⚠️  Data will NOT sync to Supabase!');
      addLog('📋 See SUPABASE_SETUP.md for instructions');
    }
  };

  const checkDatabase = async () => {
    try {
      addLog('🔍 Starting database check...');
      
      // Test IndexedDB
      addLog('Testing IndexedDB access...');
      const testDb = db;
      if (!testDb) {
        addLog('❌ Database connection failed');
        setDbStatus('Failed');
        return;
      }
      addLog('✅ Database connection successful');

      // Load existing plots
      addLog('Loading existing plots...');
      const existingPlots = await db.plots.where('farmId').equals('farm_1').toArray();
      setPlots(existingPlots);
      addLog(`✅ Found ${existingPlots.length} existing plots`);

      // Check sync queue
      const pendingSyncs = await db.syncQueue.toArray();
      addLog(`📊 Sync queue: ${pendingSyncs.length} pending items`);
      if (pendingSyncs.length > 0) {
        pendingSyncs.forEach((item) => {
          addLog(`  - ${item.operation} ${item.tableName}:${item.recordId}`);
        });
      }

      setDbStatus('Connected');
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      setDbStatus('Error');
    }
  };

  const testAddPlot = async () => {
    try {
      addLog('📝 Testing plot creation...');
      
      const newPlot: Plot = {
        id: uuidv4(),
        farmId: 'farm_1',
        name: `Test Plot ${new Date().getTime()}`,
        sizeAcres: 5.5,
        notes: 'Auto-generated test plot',
        syncStatus: SyncStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addLog(`Creating plot: ${newPlot.name}`);
      await db.plots.add(newPlot);
      addLog(`✅ Plot created with ID: ${newPlot.id}`);

      // Verify it was saved
      const saved = await db.plots.get(newPlot.id);
      if (saved) {
        addLog('✅ Plot verified in database');
      } else {
        addLog('❌ Plot not found after save');
      }

      // Reload plots list
      const updatedPlots = await db.plots.where('farmId').equals('farm_1').toArray();
      setPlots(updatedPlots);
      addLog(`Plots now in database: ${updatedPlots.length}`);

      // Check if sync queue was populated
      addLog('⏳ Waiting 2 seconds to check sync queue...');
      setTimeout(async () => {
        const syncQueue = await db.syncQueue.toArray();
        if (syncQueue.length > 0) {
          addLog(`✅ Sync queue populated with ${syncQueue.length} item(s)`);
          addLog(`⏳ Sync will attempt every 30 seconds if online`);
          addLog(`💡 Open browser Console (F12) to see detailed sync logs`);
        } else {
          addLog('⚠️  Sync queue is empty - sync may not be working');
        }
      }, 2000);

    } catch (error) {
      addLog(`❌ Error creating plot: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const exportLogs = () => {
    const logText = logs.join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().getTime()}.txt`;
    a.click();
    addLog('📥 Logs exported to file');
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  const deletePlot = async (plotId: string) => {
    try {
      addLog(`Deleting plot: ${plotId}`);
      await db.plots.delete(plotId);
      addLog('✅ Plot deleted');
      
      const updatedPlots = await db.plots.where('farmId').equals('farm_1').toArray();
      setPlots(updatedPlots);
      addLog(`Plots remaining: ${updatedPlots.length}`);
    } catch (error) {
      addLog(`❌ Error deleting plot: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const clearAllPlots = async () => {
    try {
      addLog('🗑️ Clearing all test plots...');
      await db.plots.where('farmId').equals('farm_1').delete();
      addLog('✅ All plots cleared');
      setPlots([]);
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-green-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <h1 className="text-2xl font-bold">🔧 Debug Dashboard</h1>
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto">
        {/* Supabase Configuration Status */}
        <div className="card mb-6 p-6 border-4 border-yellow-300 bg-yellow-50">
          <h2 className="text-xl font-bold mb-3 text-yellow-800">⚠️ Supabase Configuration</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                supabaseStatus.configured ? 'bg-green-500' : 'bg-red-500'
              }`}></span>
              <span className="font-semibold">Status: {supabaseStatus.configured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}</span>
            </div>
            <div className="text-gray-700">URL: {supabaseStatus.url}</div>
            <div className="text-gray-700">Key: {supabaseStatus.key}</div>
            {!supabaseStatus.configured && (
              <div className="mt-2 p-2 bg-yellow-200 rounded text-yellow-900">
                <p className="font-semibold">Data will NOT sync to Supabase!</p>
                <p>See <code>SUPABASE_SETUP.md</code> for configuration instructions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Database Status Section */}
        <div className="card mb-6 p-6 border-2 border-green-200">
          <h2 className="text-xl font-bold mb-3">Database Status</h2>
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`w-4 h-4 rounded-full ${
                dbStatus === 'Connected'
                  ? 'bg-green-500'
                  : dbStatus === 'Error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
              }`}
            />
            <span className="text-lg font-semibold">{dbStatus}</span>
          </div>
          <p className="text-sm text-gray-600">
            Total plots saved: <span className="font-bold">{plots.length}</span>
          </p>
        </div>

        {/* Control Buttons */}
        <div className="card mb-6 p-6">
          <h2 className="text-xl font-bold mb-4">Test Controls</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="primary" onClick={testAddPlot} className="w-full">
              ✅ Add Test Plot
            </Button>
            <Button variant="secondary" onClick={checkDatabase} className="w-full">
              🔄 Refresh Status
            </Button>
            <Button variant="danger" onClick={clearAllPlots} className="w-full">
              🗑️ Clear All
            </Button>
            <Button variant="secondary" onClick={clearLogs} className="w-full">
              📄 Clear Logs
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="card mb-6 p-6 bg-blue-50 border-2 border-blue-200">
          <h2 className="text-lg font-bold mb-2 text-blue-900">💡 How to Use</h2>
          <ol className="text-sm text-blue-900 space-y-1 list-decimal list-inside">
            <li>Click &quot;Add Test Plot&quot; to create a test entry</li>
            <li>If Supabase is configured, check the browser Console (F12) for sync logs</li>
            <li>Look for <code className="bg-white px-1 rounded">[SyncService]</code> messages showing the sync process</li>
            <li>Visit Supabase dashboard → Table Editor → plots table to see if data appears</li>
            <li>If sync fails, check Console for error messages and see SUPABASE_SETUP.md</li>
          </ol>
        </div>

        {/* Saved Plots */}
        {plots.length > 0 && (
          <div className="card mb-6 p-6">
            <h2 className="text-xl font-bold mb-4">Saved Plots ({plots.length})</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {plots.map((plot) => (
                <div
                  key={plot.id}
                  className="p-3 bg-gray-100 rounded border border-gray-300 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{plot.name}</p>
                    <p className="text-sm text-gray-600">{plot.sizeAcres} acres</p>
                  </div>
                  <button
                    onClick={() => deletePlot(plot.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Activity Logs</h2>
            <button
              onClick={exportLogs}
              className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              📥 Export
            </button>
          </div>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p>No logs yet. Click buttons above to start testing.</p>
            ) : (
              logs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
