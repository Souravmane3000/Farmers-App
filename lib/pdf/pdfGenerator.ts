import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Plot, FieldUsageLog, Expense, StockLog, InventoryItem } from '@/types';
import { db, dbHelpers } from '@/lib/db/database';
import { format } from 'date-fns';

export class PDFGenerator {
  // Generate Plot-wise Report
  async generatePlotReport(plotId: string, farmId: string): Promise<Blob> {
    const plot = await db.plots.get(plotId);
    if (!plot) throw new Error('Plot not found');

    const crop = plot.currentCropId ? await db.crops.get(plot.currentCropId) : null;
    const usageLogs = await db.fieldUsageLogs
      .where('[farmId+plotId]')
      .equals([farmId, plotId])
      .sortBy('usageDate');

    const expenses = await db.expenses
      .where('farmId')
      .equals(farmId)
      .toArray();

    // Get plot-related expenses (items used on this plot)
    const plotExpenses = expenses.filter((exp) => {
      const relatedUsage = usageLogs.find((log) => log.itemId === exp.itemId);
      return relatedUsage !== undefined;
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Plot-wise Report', margin, 30);

    doc.setFontSize(12);
    doc.text(`Plot: ${plot.name}`, margin, 45);
    doc.text(`Size: ${plot.sizeAcres} acres`, margin, 55);
    if (crop) {
      doc.text(`Current Crop: ${crop.name}`, margin, 65);
      doc.text(`Planting Date: ${format(new Date(crop.plantingDate), 'dd MMM yyyy')}`, margin, 75);
    }

    let yPos = 90;

    // Activities Section
    doc.setFontSize(16);
    doc.text('Field Usage Activities', margin, yPos);
    yPos += 10;

    if (usageLogs.length === 0) {
      doc.setFontSize(10);
      doc.text('No activities recorded', margin, yPos);
      yPos += 15;
    } else {
      const tableData = await Promise.all(
        usageLogs.map(async (log) => {
          const item = await db.inventoryItems.get(log.itemId);
          return [
            format(new Date(log.usageDate), 'dd MMM yyyy'),
            log.usageTime.substring(0, 5),
            item?.name || 'Unknown',
            `${log.quantityUsed} ${item?.unit || ''}`,
            log.applicationMethod,
            `${log.rainProbability}%`,
          ];
        })
      );

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Time', 'Item', 'Quantity', 'Method', 'Rain %']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Inputs Used Summary
    doc.setFontSize(16);
    doc.text('Inputs Used Summary', margin, yPos);
    yPos += 10;

    const inputsSummary = await this.getInputsSummary(usageLogs);
    const summaryData = inputsSummary.map((input) => [
      input.name,
      `${input.totalQuantity} ${input.unit}`,
      `₹${input.totalCost.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Total Quantity', 'Total Cost']],
      body: summaryData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Total Cost
    const totalCost = plotExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.setFontSize(14);
    doc.text(`Total Cost: ₹${totalCost.toFixed(2)}`, margin, yPos);

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
        pageWidth - margin - 50,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    return doc.output('blob');
  }

  // Generate Month-wise Expense Report
  async generateMonthlyExpenseReport(
    year: number,
    month: number,
    farmId: string
  ): Promise<Blob> {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const expenses = await db.expenses
      .where('farmId')
      .equals(farmId)
      .filter((exp) => exp.date >= startDate && exp.date <= endDate)
      .toArray();

    const usageLogs = await db.fieldUsageLogs
      .where('farmId')
      .equals(farmId)
      .filter((log) => log.usageDate >= startDate && log.usageDate <= endDate)
      .toArray();

    const doc = new jsPDF();
    const margin = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Monthly Expense Report', margin, 30);

    doc.setFontSize(12);
    doc.text(`Period: ${format(new Date(year, month - 1, 1), 'MMMM yyyy')}`, margin, 45);

    let yPos = 60;

    // Purchases Section
    doc.setFontSize(16);
    doc.text('Purchases', margin, yPos);
    yPos += 10;

    if (expenses.length === 0) {
      doc.setFontSize(10);
      doc.text('No purchases recorded', margin, yPos);
      yPos += 15;
    } else {
      const purchaseData = await Promise.all(
        expenses.map(async (exp) => {
          const item = exp.itemId ? await db.inventoryItems.get(exp.itemId) : null;
          return [
            format(new Date(exp.date), 'dd MMM yyyy'),
            exp.description || item?.name || 'Other',
            exp.category,
            `₹${exp.amount.toFixed(2)}`,
          ];
        })
      );

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Item', 'Category', 'Amount']],
        body: purchaseData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Usage Cost Section
    doc.setFontSize(16);
    doc.text('Usage Cost', margin, yPos);
    yPos += 10;

    const usageCost = await this.calculateUsageCost(usageLogs);
    doc.setFontSize(12);
    doc.text(`Total Usage Cost: ₹${usageCost.toFixed(2)}`, margin, yPos);
    yPos += 15;

    // Summary
    const totalPurchases = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalSpend = totalPurchases + usageCost;

    doc.setFontSize(16);
    doc.text('Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Purchases: ₹${totalPurchases.toFixed(2)}`, margin, yPos);
    yPos += 10;
    doc.text(`Total Usage Cost: ₹${usageCost.toFixed(2)}`, margin, yPos);
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Spend: ₹${totalSpend.toFixed(2)}`, margin, yPos);

    return doc.output('blob');
  }

  // Generate Stock Audit Report
  async generateStockAuditReport(farmId: string): Promise<Blob> {
    const stocks = await dbHelpers.getAllCurrentStocks(farmId);
    const items = await db.inventoryItems.where('farmId').equals(farmId).toArray();
    const lowStockItems = stocks.filter((s) => s.isLowStock);

    const doc = new jsPDF();
    const margin = 20;

    // Header
    doc.setFontSize(20);
    doc.text('Stock Audit Report', margin, 30);

    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, margin, 45);

    let yPos = 60;

    // Current Stock Section
    doc.setFontSize(16);
    doc.text('Current Stock', margin, yPos);
    yPos += 10;

    const stockData = stocks.map((stock) => [
      stock.itemName,
      stock.category,
      `${stock.currentQuantity} ${stock.unit}`,
      `${stock.minThreshold} ${stock.unit}`,
      stock.isLowStock ? 'Yes' : 'No',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Category', 'Current Stock', 'Min Threshold', 'Low Stock']],
      body: stockData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.row.index >= 0 && data.column.index === 4) {
          const isLowStock = data.cell.text[0] === 'Yes';
          if (isLowStock) {
            data.cell.styles.fillColor = [255, 200, 200];
          }
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Low Stock Items
    if (lowStockItems.length > 0) {
      doc.setFontSize(16);
      doc.text('Low Stock Items', margin, yPos);
      yPos += 10;

      const lowStockData = lowStockItems.map((stock) => [
        stock.itemName,
        `${stock.currentQuantity} ${stock.unit}`,
        `${stock.minThreshold} ${stock.unit}`,
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Item', 'Current Stock', 'Min Threshold']],
        body: lowStockData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, fillColor: [255, 200, 200] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Movement History (Last 30 days)
    doc.setFontSize(16);
    doc.text('Recent Movements (Last 30 days)', margin, yPos);
    yPos += 10;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMovements = await db.stockLogs
      .where('farmId')
      .equals(farmId)
      .filter((log) => new Date(log.date) >= thirtyDaysAgo)
      .sortBy('date');

    if (recentMovements.length === 0) {
      doc.setFontSize(10);
      doc.text('No recent movements', margin, yPos);
    } else {
      const movementData = recentMovements.map((log) => {
        const item = items.find((i) => i.id === log.itemId);
        return [
          format(new Date(log.date), 'dd MMM yyyy'),
          item?.name || 'Unknown',
          log.type === 'in' ? 'IN' : 'OUT',
          `${log.quantity} ${item?.unit || ''}`,
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Item', 'Type', 'Quantity']],
        body: movementData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 },
      });
    }

    return doc.output('blob');
  }

  private async getInputsSummary(usageLogs: FieldUsageLog[]) {
    const summary: Record<string, { name: string; totalQuantity: number; unit: string; totalCost: number }> = {};

    for (const log of usageLogs) {
      const item = await db.inventoryItems.get(log.itemId);
      if (!item) continue;

      if (!summary[log.itemId]) {
        summary[log.itemId] = {
          name: item.name,
          totalQuantity: 0,
          unit: item.unit,
          totalCost: 0,
        };
      }

      summary[log.itemId].totalQuantity += log.quantityUsed;
      // Calculate cost based on average purchase price
      const stockLogs = await db.stockLogs
        .where('[farmId+itemId]')
        .equals([log.farmId, log.itemId])
        .and((s) => s.type === 'in')
        .toArray();

      if (stockLogs.length > 0) {
        const avgPrice = stockLogs.reduce((sum, s) => sum + (s.purchasePrice || 0), 0) / stockLogs.length;
        summary[log.itemId].totalCost += log.quantityUsed * avgPrice;
      }
    }

    return Object.values(summary);
  }

  private async calculateUsageCost(usageLogs: FieldUsageLog[]) {
    let totalCost = 0;

    for (const log of usageLogs) {
      const stockLogs = await db.stockLogs
        .where('[farmId+itemId]')
        .equals([log.farmId, log.itemId])
        .and((s) => s.type === 'in')
        .toArray();

      if (stockLogs.length > 0) {
        const avgPrice = stockLogs.reduce((sum, s) => sum + (s.purchasePrice || 0), 0) / stockLogs.length;
        totalCost += log.quantityUsed * avgPrice;
      }
    }

    return totalCost;
  }
}

export const pdfGenerator = new PDFGenerator();
