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

// ============================================
// Extended Data Models
// ============================================

// Worker/Labor
export interface Worker {
  id: string;
  farmId: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  dailyWage?: number;
  isActive: boolean;
  hireDate?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LaborLog {
  id: string;
  farmId: string;
  workerId: string;
  plotId?: string;
  workDate: string;
  hoursWorked: number;
  workType: string;
  description?: string;
  amountPaid?: number;
  paymentStatus: PaymentStatus;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIAL = 'partial',
}

// Equipment
export interface Equipment {
  id: string;
  farmId: string;
  name: string;
  type: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiryDate?: string;
  status: EquipmentStatus;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum EquipmentStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  SOLD = 'sold',
  BROKEN = 'broken',
}

export interface EquipmentMaintenance {
  id: string;
  farmId: string;
  equipmentId: string;
  maintenanceDate: string;
  maintenanceType: string;
  description?: string;
  cost?: number;
  nextMaintenanceDate?: string;
  performedBy?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// Weather
export interface WeatherLog {
  id: string;
  farmId: string;
  logDate: string;
  temperatureHigh?: number;
  temperatureLow?: number;
  rainfallMm?: number;
  humidityPercent?: number;
  windSpeedKmh?: number;
  windDirection?: string;
  weatherCondition?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// Irrigation
export interface IrrigationSchedule {
  id: string;
  farmId: string;
  plotId: string;
  cropId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  durationMinutes?: number;
  waterAmountLitres?: number;
  status: IrrigationStatus;
  method?: string;
  notes?: string;
  completedAt?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum IrrigationStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped',
}

// Harvest
export interface Harvest {
  id: string;
  farmId: string;
  plotId: string;
  cropId: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  qualityGrade?: string;
  salePricePerUnit?: number;
  totalRevenue?: number;
  buyer?: string;
  storageLocation?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// Crop Rotation
export interface CropRotation {
  id: string;
  farmId: string;
  plotId: string;
  previousCrop: string;
  newCrop: string;
  rotationDate: string;
  reason?: string;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// Tasks
export interface Task {
  id: string;
  farmId: string;
  title: string;
  description?: string;
  category?: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  assignedWorkerId?: string;
  relatedPlotId?: string;
  relatedCropId?: string;
  relatedItemId?: string;
  relatedEquipmentId?: string;
  completedAt?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export enum TaskCategory {
  GENERAL = 'general',
  PLANTING = 'planting',
  HARVESTING = 'harvesting',
  IRRIGATION = 'irrigation',
  FERTILIZER = 'fertilizer',
  PESTICIDE = 'pesticide',
  EQUIPMENT = 'equipment',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

// Activity Log (Audit Trail)
export interface ActivityLog {
  id: string;
  farmId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// Notifications
export interface Notification {
  id: string;
  farmId: string;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
}

// Farm Contacts
export interface FarmContact {
  id: string;
  farmId: string;
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  notes?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// Soil Tests
export interface SoilTest {
  id: string;
  farmId: string;
  plotId: string;
  testDate: string;
  phLevel?: number;
  nitrogenLevel?: number;
  phosphorusLevel?: number;
  potassiumLevel?: number;
  organicMatterPercent?: number;
  soilType?: string;
  labName?: string;
  recommendations?: string;
  nextTestDate?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Extended Views
// ============================================

export interface LaborCostByPlot {
  plotId: string;
  farmId: string;
  plotName: string;
  totalLaborCost: number;
  uniqueWorkers: number;
  totalHours: number;
}

export interface MaintenanceDue {
  equipmentId: string;
  farmId: string;
  equipmentName: string;
  type: string;
  nextMaintenanceDate?: string;
  lastMaintenanceType?: string;
  lastMaintenanceDate?: string;
  status: 'no_schedule' | 'overdue' | 'due_soon' | 'ok';
}

export interface MonthlyExpenseSummary {
  farmId: string;
  year: number;
  month: number;
  category: ExpenseCategory;
  totalAmount: number;
  transactionCount: number;
}

export interface HarvestRevenueByCrop {
  cropId: string;
  farmId: string;
  cropName: string;
  plotId: string;
  totalQuantity: number;
  totalRevenue: number;
  avgPricePerUnit: number;
  harvestCount: number;
}

export interface WorkerProductivity {
  workerId: string;
  farmId: string;
  workerName: string;
  role?: string;
  totalShifts: number;
  totalHours: number;
  totalPaid: number;
  avgHoursPerShift: number;
}

// Extended Dashboard Stats
export interface ExtendedDashboardStats extends DashboardStats {
  totalWorkers: number;
  activeTasks: number;
  pendingIrrigations: number;
  maintenanceOverdue: number;
  monthlyRevenue: number;
  weatherLastLog?: WeatherLog;
}
