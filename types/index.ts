// Core Data Models

export interface User {
  id: string;
  email: string;
  name: string;
  farmName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  id: string;
  userId: string;
  name: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Plot {
  id: string;
  farmId: string;
  name: string;
  sizeAcres: number;
  currentCropId?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Crop {
  id: string;
  farmId: string;
  plotId: string;
  name: string;
  variety?: string;
  plantingDate: string;
  expectedHarvestDate?: string;
  status: CropStatus;
  fertilizerStageDate?: string;
  pesticideIntervalDays?: number;
  lastPesticideDate?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum CropStatus {
  PLANTED = 'planted',
  GROWING = 'growing',
  HARVESTED = 'harvested',
}

export interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  category: InventoryCategory;
  unit: Unit;
  minThreshold: number;
  description?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum InventoryCategory {
  SEEDS = 'seeds',
  FERTILIZERS = 'fertilizers',
  PESTICIDES = 'pesticides',
  EQUIPMENT = 'equipment',
  FUEL = 'fuel',
}

export enum Unit {
  KG = 'kg',
  LITRE = 'litre',
  PIECE = 'piece',
  ACRE = 'acre',
}

export interface StockLog {
  id: string;
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
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum StockType {
  IN = 'in',
  OUT = 'out',
}

export interface FieldUsageLog {
  id: string;
  farmId: string;
  plotId: string;
  cropId: string;
  itemId: string;
  quantityUsed: number;
  usageDate: string;
  usageTime: string;
  applicationMethod: ApplicationMethod;
  rainProbability: number; // 0-100%
  weatherCondition?: string;
  temperature?: number;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum ApplicationMethod {
  SPRAY = 'spray',
  SPREAD = 'spread',
  DRIP = 'drip',
  BROADCAST = 'broadcast',
  INJECTION = 'injection',
}

export interface Expense {
  id: string;
  farmId: string;
  itemId?: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  supplierId?: string;
  description: string;
  receiptPhotoUrl?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum ExpenseCategory {
  SEEDS = 'seeds',
  FERTILIZERS = 'fertilizers',
  PESTICIDES = 'pesticides',
  EQUIPMENT = 'equipment',
  FUEL = 'fuel',
  LABOR = 'labor',
  OTHER = 'other',
}

export interface Supplier {
  id: string;
  farmId: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  rating?: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  farmId: string;
  type: AlertType;
  title: string;
  message: string;
  relatedId?: string; // plotId, cropId, itemId, etc.
  priority: AlertPriority;
  isRead: boolean;
  createdAt: string;
}

export enum AlertType {
  LOW_STOCK = 'low_stock',
  FERTILIZER_STAGE = 'fertilizer_stage',
  PESTICIDE_INTERVAL = 'pesticide_interval',
  HIGH_RAIN_PROBABILITY = 'high_rain_probability',
  EXPIRY_WARNING = 'expiry_warning',
}

export enum AlertPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface SyncQueue {
  id: string;
  farmId: string;
  tableName: string;
  recordId: string;
  operation: SyncOperation;
  data: Record<string, any>;
  retryCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type SyncOperation = 'add' | 'create' | 'update' | 'delete';

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  CONFLICT = 'conflict',
}

// Current Stock View (computed)
export interface CurrentStock {
  itemId: string;
  itemName: string;
  category: InventoryCategory;
  unit: Unit;
  currentQuantity: number;
  minThreshold: number;
  isLowStock: boolean;
}

// Dashboard Stats
export interface DashboardStats {
  totalPlots: number;
  activeCrops: number;
  lowStockItems: number;
  pendingSyncs: number;
  monthlyExpense: number;
  recentUsage: FieldUsageLog[];
  recentAlerts: Alert[];
}
