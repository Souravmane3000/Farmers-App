import { db, dbHelpers } from '@/lib/db/database';
import { FieldUsageLog, ApplicationMethod, SyncStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { syncService } from '../sync/syncService';
import { inventoryService } from './inventoryService';
import { alertEngine } from '../alerts/alertEngine';

export interface CreateFieldUsageDTO {
  farmId: string;
  plotId: string;
  cropId: string;
  itemId: string;
  quantityUsed: number;
  usageDate: string;
  usageTime: string;
  applicationMethod: ApplicationMethod;
  rainProbability: number;
  weatherCondition?: string;
  temperature?: number;
  notes?: string;
}

class FieldUsageService {
  async create(data: CreateFieldUsageDTO): Promise<FieldUsageLog> {
    const currentStock = await inventoryService.getCurrentStock(data.itemId, data.farmId);
    if (currentStock < data.quantityUsed) {
      throw new Error(`Insufficient stock. Available: ${currentStock}`);
    }

    const now = new Date().toISOString();
    const usageLog: FieldUsageLog = {
      id: uuidv4(),
      ...data,
      syncStatus: SyncStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await db.fieldUsageLogs.add(usageLog);

    await inventoryService.stockOut(
      data.farmId,
      data.itemId,
      data.quantityUsed,
      data.usageDate,
      `Field application: ${data.notes || 'No notes'}`
    );

    await syncService.markForSync(data.farmId, 'fieldUsageLogs', usageLog.id, 'create', usageLog);

    await alertEngine.checkAllAlerts(data.farmId);

    return usageLog;
  }

  async getByFarm(farmId: string): Promise<FieldUsageLog[]> {
    return db.fieldUsageLogs.where('farmId').equals(farmId).reverse().sortBy('usageDate');
  }

  async getByPlot(plotId: string): Promise<FieldUsageLog[]> {
    return db.fieldUsageLogs.where('plotId').equals(plotId).reverse().sortBy('usageDate');
  }

  async getByCrop(cropId: string): Promise<FieldUsageLog[]> {
    return db.fieldUsageLogs.where('cropId').equals(cropId).reverse().sortBy('usageDate');
  }

  async getByItem(itemId: string): Promise<FieldUsageLog[]> {
    return db.fieldUsageLogs.where('itemId').equals(itemId).reverse().sortBy('usageDate');
  }

  async getByDateRange(farmId: string, startDate: string, endDate: string): Promise<FieldUsageLog[]> {
    return db.fieldUsageLogs
      .where('farmId')
      .equals(farmId)
      .filter((log) => log.usageDate >= startDate && log.usageDate <= endDate)
      .toArray();
  }

  async getById(id: string): Promise<FieldUsageLog | undefined> {
    return db.fieldUsageLogs.get(id);
  }

  async delete(id: string): Promise<void> {
    const log = await db.fieldUsageLogs.get(id);
    if (!log) return;

    await db.fieldUsageLogs.delete(id);
    await syncService.markForSync(log.farmId, 'fieldUsageLogs', id, 'delete', { id });
  }

  async getRecent(farmId: string, limit = 10): Promise<FieldUsageLog[]> {
    const logs = await this.getByFarm(farmId);
    return logs.slice(0, limit);
  }

  async getTotalUsageByItem(farmId: string, itemId: string): Promise<number> {
    const logs = await this.getByItem(itemId);
    return logs.reduce((sum, log) => sum + log.quantityUsed, 0);
  }

  async getTotalUsageByPlot(farmId: string, plotId: string): Promise<number> {
    const logs = await this.getByPlot(plotId);
    return logs.reduce((sum, log) => sum + log.quantityUsed, 0);
  }

  async getUsageStats(farmId: string, startDate?: string, endDate?: string) {
    let logs = await this.getByFarm(farmId);

    if (startDate && endDate) {
      logs = logs.filter((log) => log.usageDate >= startDate && log.usageDate <= endDate);
    }

    const byItem: Record<string, number> = {};
    const byPlot: Record<string, number> = {};
    const byApplicationMethod: Record<string, number> = {};

    for (const log of logs) {
      byItem[log.itemId] = (byItem[log.itemId] || 0) + log.quantityUsed;
      byPlot[log.plotId] = (byPlot[log.plotId] || 0) + log.quantityUsed;
      byApplicationMethod[log.applicationMethod] = (byApplicationMethod[log.applicationMethod] || 0) + 1;
    }

    return {
      totalLogs: logs.length,
      totalQuantity: logs.reduce((sum, log) => sum + log.quantityUsed, 0),
      byItem,
      byPlot,
      byApplicationMethod,
    };
  }
}

export const fieldUsageService = new FieldUsageService();