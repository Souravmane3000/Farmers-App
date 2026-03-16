import { db, dbHelpers } from '@/lib/db/database';
import { 
  InventoryItem, 
  StockLog, 
  StockType, 
  SyncStatus,
  InventoryCategory,
  Unit 
} from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { syncService } from '../sync/syncService';

export interface CreateInventoryItemDTO {
  farmId: string;
  name: string;
  category: InventoryCategory;
  unit: Unit;
  minThreshold: number;
  description?: string;
}

export interface CreateStockLogDTO {
  farmId: string;
  itemId: string;
  type: StockType;
  quantity: number;
  date: string;
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: number;
  supplierId?: string;
  notes?: string;
}

export interface StockWithItem extends StockLog {
  item: InventoryItem;
}

class InventoryService {
  async createItem(data: CreateInventoryItemDTO): Promise<InventoryItem> {
    const now = new Date().toISOString();
    const item: InventoryItem = {
      id: uuidv4(),
      ...data,
      syncStatus: SyncStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await db.inventoryItems.add(item);
    await syncService.markForSync(data.farmId, 'inventoryItems', item.id, 'create', item);

    return item;
  }

  async getByFarm(farmId: string): Promise<InventoryItem[]> {
    return db.inventoryItems.where('farmId').equals(farmId).toArray();
  }

  async getById(id: string): Promise<InventoryItem | undefined> {
    return db.inventoryItems.get(id);
  }

  async updateItem(id: string, data: Partial<CreateInventoryItemDTO>): Promise<InventoryItem | null> {
    const item = await db.inventoryItems.get(id);
    if (!item) return null;

    const updatedItem: InventoryItem = {
      ...item,
      ...data,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date().toISOString(),
    };

    await db.inventoryItems.update(id, updatedItem);
    await syncService.markForSync(item.farmId, 'inventoryItems', id, 'update', updatedItem);

    return updatedItem;
  }

  async deleteItem(id: string): Promise<void> {
    const item = await db.inventoryItems.get(id);
    if (!item) return;

    await db.inventoryItems.delete(id);
    await syncService.markForSync(item.farmId, 'inventoryItems', id, 'delete', { id });
  }

  async addStockLog(data: CreateStockLogDTO): Promise<StockLog> {
    const now = new Date().toISOString();
    const stockLog: StockLog = {
      id: uuidv4(),
      ...data,
      syncStatus: SyncStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await db.stockLogs.add(stockLog);
    await syncService.markForSync(data.farmId, 'stockLogs', stockLog.id, 'create', stockLog);

    return stockLog;
  }

  async getStockLogs(itemId: string): Promise<StockLog[]> {
    return db.stockLogs.where('itemId').equals(itemId).toArray();
  }

  async getStockLogsByFarm(farmId: string): Promise<StockLog[]> {
    return db.stockLogs.where('farmId').equals(farmId).sortBy('date');
  }

  async getCurrentStock(itemId: string, farmId: string): Promise<number> {
    return dbHelpers.getCurrentStock(itemId, farmId);
  }

  async getAllCurrentStocks(farmId: string) {
    return dbHelpers.getAllCurrentStocks(farmId);
  }

  async getLowStockItems(farmId: string) {
    const stocks = await this.getAllCurrentStocks(farmId);
    return stocks.filter((s) => s.isLowStock);
  }

  async stockIn(
    farmId: string,
    itemId: string,
    quantity: number,
    date: string,
    options?: {
      batchNumber?: string;
      expiryDate?: string;
      purchasePrice?: number;
      supplierId?: string;
      notes?: string;
    }
  ): Promise<StockLog> {
    return this.addStockLog({
      farmId,
      itemId,
      type: StockType.IN,
      quantity,
      date,
      ...options,
    });
  }

  async stockOut(
    farmId: string,
    itemId: string,
    quantity: number,
    date: string,
    notes?: string
  ): Promise<StockLog> {
    const currentStock = await this.getCurrentStock(itemId, farmId);
    if (currentStock < quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}`);
    }

    return this.addStockLog({
      farmId,
      itemId,
      type: StockType.OUT,
      quantity,
      date,
      notes,
    });
  }

  async getByCategory(farmId: string, category: InventoryCategory): Promise<InventoryItem[]> {
    return db.inventoryItems
      .where('[farmId+category]')
      .equals([farmId, category])
      .toArray();
  }

  async search(farmId: string, query: string): Promise<InventoryItem[]> {
    const items = await this.getByFarm(farmId);
    const lowerQuery = query.toLowerCase();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(lowerQuery) ||
        (i.description && i.description.toLowerCase().includes(lowerQuery))
    );
  }
}

export const inventoryService = new InventoryService();