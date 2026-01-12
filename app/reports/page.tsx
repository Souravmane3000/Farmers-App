'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, MapPin, Package } from 'lucide-react';
import { pdfGenerator } from '@/lib/pdf/pdfGenerator';
import BackButton from '@/components/BackButton';
import Button from '@/components/Button';
import { db } from '@/lib/db/database';

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGeneratePlotReport = async (plotId: string) => {
    setGenerating(`plot_${plotId}`);
    try {
      const farmId = 'farm_1'; // Placeholder
      const blob = await pdfGenerator.generatePlotReport(plotId, farmId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plot-report-${plotId}-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    setGenerating('monthly');
    try {
      const farmId = 'farm_1'; // Placeholder
      const now = new Date();
      const blob = await pdfGenerator.generateMonthlyExpenseReport(
        now.getFullYear(),
        now.getMonth() + 1,
        farmId
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly-expense-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateStockAudit = async () => {
    setGenerating('stock');
    try {
      const farmId = 'farm_1'; // Placeholder
      const blob = await pdfGenerator.generateStockAuditReport(farmId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `stock-audit-${new Date().toISOString().split('T')[0]}.pdf`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      <header className="bg-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <BackButton href="/" />
          <h1 className="text-2xl font-bold">Reports</h1>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Plot-wise Report */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-8 h-8 text-primary-600" />
            <h2 className="text-xl font-bold">Plot-wise Report</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Generate a detailed report for a specific plot including all activities, inputs used, and total cost.
          </p>
          <PlotSelector
            onSelect={handleGeneratePlotReport}
            generating={generating?.startsWith('plot_')}
          />
        </div>

        {/* Monthly Expense Report */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h2 className="text-xl font-bold">Monthly Expense Report</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Generate a monthly expense report showing purchases, usage costs, and total spend.
          </p>
          <Button
            variant="primary"
            onClick={handleGenerateMonthlyReport}
            disabled={generating === 'monthly'}
            icon={<Download className="w-5 h-5" />}
            className="w-full"
          >
            {generating === 'monthly' ? 'Generating...' : 'Generate Monthly Report'}
          </Button>
        </div>

        {/* Stock Audit Report */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Package className="w-8 h-8 text-green-600" />
            <h2 className="text-xl font-bold">Stock Audit Report</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Generate a stock audit report showing current stock levels, low stock items, and recent movements.
          </p>
          <Button
            variant="primary"
            onClick={handleGenerateStockAudit}
            disabled={generating === 'stock'}
            icon={<Download className="w-5 h-5" />}
            className="w-full"
          >
            {generating === 'stock' ? 'Generating...' : 'Generate Stock Audit'}
          </Button>
        </div>
      </main>
    </div>
  );
}

function PlotSelector({ onSelect, generating }: { onSelect: (plotId: string) => void; generating?: boolean }) {
  const [plots, setPlots] = useState<any[]>([]);
  const [selectedPlot, setSelectedPlot] = useState('');

  useEffect(() => {
    loadPlots();
  }, []);

  const loadPlots = async () => {
    const farmId = 'farm_1';
    const plotsData = await db.plots.where('farmId').equals(farmId).toArray();
    setPlots(plotsData);
  };

  return (
    <div className="space-y-4">
      <select
        className="input-field"
        value={selectedPlot}
        onChange={(e) => setSelectedPlot(e.target.value)}
      >
        <option value="">Select a plot</option>
        {plots.map((plot) => (
          <option key={plot.id} value={plot.id}>
            {plot.name}
          </option>
        ))}
      </select>
      <Button
        variant="primary"
        onClick={() => selectedPlot && onSelect(selectedPlot)}
        disabled={!selectedPlot || generating}
        icon={<Download className="w-5 h-5" />}
        className="w-full"
      >
        {generating ? 'Generating...' : 'Generate Plot Report'}
      </Button>
    </div>
  );
}
