import Dexie, { Table } from 'dexie';
import {
  Plot,
  Crop,
  InventoryItem,
  StockLog,
  FieldUsageLog,
  Expense,
  Supplier,
  Alert,
  SyncQueue,
  User,
  Farm,
} from '@/types';

export class FarmDatabase extends Dexie {
  users!: Table<User>;
  farms!: Table<Farm>;
  plots!: Table<Plot>;
  crops!: Table<Crop>;
  inventoryItems!: Table<InventoryItem>;
  stockLogs!: Table<StockLog>;
  fieldUsageLogs!: Table<FieldUsageLog>;
  expenses!: Table<Expense>;
  suppliers!: Table<Supplier>;
  alerts!: Table<Alert>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('FarmManagementDB');

    this.version(1).stores({
      users: 'id, email',
      farms: 'id, userId',
      plots: 'id, farmId, syncStatus',
      crops: 'id, farmId, plotId, syncStatus',
      inventoryItems: 'id, farmId, category, syncStatus',
      stockLogs: 'id, farmId, itemId, type, date, syncStatus',
      fieldUsageLogs: 'id, farmId, plotId, cropId, itemId, usageDate, syncStatus',
      expenses: 'id, farmId, category, date, syncStatus',
      suppliers: 'id, farmId, syncStatus',
      alerts: 'id, farmId, type, isRead, createdAt',
      syncQueue: 'id, farmId, tableName, operation, createdAt',
    });
  }
}

export const db = new FarmDatabase();

// Helper functions for database operations
export const dbHelpers = {
  // Get current stock for an item
  async getCurrentStock(itemId: string, farmId: string): Promise<number> {
    const logs = await db.stockLogs
      .where('[farmId+itemId]')
      .equals([farmId, itemId])
      .toArray();

    return logs.reduce((total, log) => {
      return log.type === 'in' ? total + log.quantity : total - log.quantity;
    }, 0);
  },

  // Get all current stocks
  async getAllCurrentStocks(farmId: string) {
    const items = await db.inventoryItems.where('farmId').equals(farmId).toArray();
    const stocks = await Promise.all(
      items.map(async (item) => {
        const quantity = await dbHelpers.getCurrentStock(item.id, farmId);
        return {
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          unit: item.unit,
          currentQuantity: quantity,
          minThreshold: item.minThreshold,
          isLowStock: quantity <= item.minThreshold,
        };
      })
    );
    return stocks;
  },

  // Get pending sync items
  async getPendingSyncs(farmId: string): Promise<SyncQueue[]> {
    return db.syncQueue.where('farmId').equals(farmId).toArray();
  },

  // Add to sync queue
  async addToSyncQueue(
    farmId: string,
    tableName: string,
    recordId: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, any>
  ) {
    await db.syncQueue.add({
      id: `sync_${Date.now()}_${Math.random()}`,
      farmId,
      tableName,
      recordId,
      operation,
      data,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
};
