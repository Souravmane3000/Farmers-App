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
  SyncOperation,
  Worker,
  LaborLog,
  Equipment,
  EquipmentMaintenance,
  WeatherLog,
  IrrigationSchedule,
  Harvest,
  CropRotation,
  Task,
  ActivityLog,
  Notification,
  FarmContact,
  SoilTest,
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
  workers!: Table<Worker>;
  laborLogs!: Table<LaborLog>;
  equipment!: Table<Equipment>;
  equipmentMaintenance!: Table<EquipmentMaintenance>;
  weatherLogs!: Table<WeatherLog>;
  irrigationSchedules!: Table<IrrigationSchedule>;
  harvests!: Table<Harvest>;
  cropRotations!: Table<CropRotation>;
  tasks!: Table<Task>;
  activityLogs!: Table<ActivityLog>;
  notifications!: Table<Notification>;
  farmContacts!: Table<FarmContact>;
  soilTests!: Table<SoilTest>;

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
      workers: 'id, farmId, isActive, syncStatus',
      laborLogs: 'id, farmId, workerId, plotId, workDate, paymentStatus, syncStatus',
      equipment: 'id, farmId, type, status, syncStatus',
      equipmentMaintenance: 'id, farmId, equipmentId, maintenanceDate, syncStatus',
      weatherLogs: 'id, farmId, logDate, syncStatus',
      irrigationSchedules: 'id, farmId, plotId, scheduledDate, status, syncStatus',
      harvests: 'id, farmId, plotId, cropId, harvestDate, syncStatus',
      cropRotations: 'id, farmId, plotId, rotationDate, syncStatus',
      tasks: 'id, farmId, status, priority, dueDate, assignedWorkerId, syncStatus',
      activityLogs: 'id, farmId, userId, action, entityType, createdAt',
      notifications: 'id, farmId, type, isRead, scheduledFor, createdAt',
      farmContacts: 'id, farmId, isPrimary, syncStatus',
      soilTests: 'id, farmId, plotId, testDate, syncStatus',
    });
  }
}

export const db = new FarmDatabase();

export const dbHelpers = {
  async getCurrentStock(itemId: string, farmId: string): Promise<number> {
    const logs = await db.stockLogs
      .where('[farmId+itemId]')
      .equals([farmId, itemId])
      .toArray();

    return logs.reduce((total, log) => {
      return log.type === 'in' ? total + log.quantity : total - log.quantity;
    }, 0);
  },

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

  async getPendingSyncs(farmId: string): Promise<SyncQueue[]> {
    return db.syncQueue.where('farmId').equals(farmId).toArray();
  },

  async addToSyncQueue(
    farmId: string,
    tableName: string,
    recordId: string,
    operation: SyncOperation,
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

  async getLaborCostByPlot(farmId: string, plotId: string): Promise<number> {
    const logs = await db.laborLogs
      .where('[farmId+plotId]')
      .equals([farmId, plotId])
      .toArray();
    return logs.reduce((total, log) => total + (log.amountPaid || 0), 0);
  },

  async getMaintenanceDue(farmId: string) {
    const equipment = await db.equipment.where('farmId').equals(farmId).toArray();
    const results = await Promise.all(
      equipment.map(async (eq) => {
        const maintenance = await db.equipmentMaintenance
          .where('equipmentId')
          .equals(eq.id)
          .reverse()
          .sortBy('maintenanceDate');
        const lastMaintenance = maintenance[0];
        return {
          equipmentId: eq.id,
          farmId: eq.farmId,
          equipmentName: eq.name,
          type: eq.type,
          nextMaintenanceDate: lastMaintenance?.nextMaintenanceDate,
          lastMaintenanceType: lastMaintenance?.maintenanceType,
          lastMaintenanceDate: lastMaintenance?.maintenanceDate,
          status: dbHelpers.getMaintenanceStatus(lastMaintenance?.nextMaintenanceDate),
        };
      })
    );
    return results;
  },

  getMaintenanceStatus(nextDate?: string): 'no_schedule' | 'overdue' | 'due_soon' | 'ok' {
    if (!nextDate) return 'no_schedule';
    const today = new Date();
    const next = new Date(nextDate);
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due_soon';
    return 'ok';
  },

  async getWorkerProductivity(farmId: string, workerId?: string) {
    const workers = workerId
      ? [await db.workers.get(workerId)]
      : await db.workers.where('farmId').equals(farmId).toArray();

    const results = await Promise.all(
      workers.filter(Boolean).map(async (worker) => {
        const logs = await db.laborLogs.where('workerId').equals(worker!.id).toArray();
        return {
          workerId: worker!.id,
          farmId: worker!.farmId,
          workerName: worker!.name,
          role: worker!.role,
          totalShifts: logs.length,
          totalHours: logs.reduce((sum, log) => sum + log.hoursWorked, 0),
          totalPaid: logs.reduce((sum, log) => sum + (log.amountPaid || 0), 0),
          avgHoursPerShift: logs.length > 0
            ? logs.reduce((sum, log) => sum + log.hoursWorked, 0) / logs.length
            : 0,
        };
      })
    );
    return results;
  },

  async getMonthlyExpenses(farmId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();
    
    const expenses = await db.expenses
      .where('farmId')
      .equals(farmId)
      .filter(e => e.date >= startDate && e.date <= endDate)
      .toArray();
    
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  },

  async getMonthlyRevenue(farmId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0).toISOString();
    
    const harvests = await db.harvests
      .where('farmId')
      .equals(farmId)
      .filter(h => h.harvestDate >= startDate && h.harvestDate <= endDate)
      .toArray();
    
    return harvests.reduce((sum, h) => sum + (h.totalRevenue || 0), 0);
  },

  async getActiveTasks(farmId: string) {
    return db.tasks
      .where('farmId')
      .equals(farmId)
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .toArray();
  },

  async getUnreadNotifications(farmId: string) {
    return db.notifications
      .where('farmId')
      .equals(farmId)
      .filter(n => !n.isRead)
      .toArray();
  },

  async getRecentWeatherLog(farmId: string) {
    const logs = await db.weatherLogs
      .where('farmId')
      .equals(farmId)
      .reverse()
      .limit(1)
      .toArray();
    return logs[0] || null;
  },
};
