import { db } from '@/lib/db/database';
import {
  Alert,
  AlertType,
  AlertPriority,
  Crop,
  InventoryItem,
  FieldUsageLog,
  StockLog,
} from '@/types';
import { dbHelpers } from '@/types';

export class AlertEngine {
  async checkAllAlerts(farmId: string): Promise<void> {
    await Promise.all([
      this.checkLowStockAlerts(farmId),
      this.checkFertilizerStageAlerts(farmId),
      this.checkPesticideIntervalAlerts(farmId),
      this.checkExpiryAlerts(farmId),
    ]);
  }

  async checkLowStockAlerts(farmId: string): Promise<void> {
    const stocks = await dbHelpers.getAllCurrentStocks(farmId);
    const lowStockItems = stocks.filter((s) => s.isLowStock);

    for (const stock of lowStockItems) {
      // Check if alert already exists
      const existingAlert = await db.alerts
        .where('[farmId+type+relatedId]')
        .equals([farmId, AlertType.LOW_STOCK, stock.itemId])
        .and((a) => !a.isRead)
        .first();

      if (!existingAlert) {
        await db.alerts.add({
          id: `alert_${Date.now()}_${Math.random()}`,
          farmId,
          type: AlertType.LOW_STOCK,
          title: 'Low Stock Alert',
          message: `${stock.itemName} is running low. Current stock: ${stock.currentQuantity} ${stock.unit}. Minimum threshold: ${stock.minThreshold} ${stock.unit}`,
          relatedId: stock.itemId,
          priority: stock.currentQuantity === 0 ? AlertPriority.URGENT : AlertPriority.HIGH,
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  async checkFertilizerStageAlerts(farmId: string): Promise<void> {
    const crops = await db.crops
      .where('farmId')
      .equals(farmId)
      .and((c) => c.status === CropStatus.GROWING || c.status === CropStatus.PLANTED)
      .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const crop of crops) {
      if (crop.fertilizerStageDate) {
        const fertilizerDate = new Date(crop.fertilizerStageDate);
        fertilizerDate.setHours(0, 0, 0, 0);

        // Alert if fertilizer stage is reached (within 3 days)
        const daysDiff = Math.floor((fertilizerDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 0 && daysDiff <= 3) {
          const existingAlert = await db.alerts
            .where('[farmId+type+relatedId]')
            .equals([farmId, AlertType.FERTILIZER_STAGE, crop.id])
            .and((a) => !a.isRead)
            .first();

          if (!existingAlert) {
            await db.alerts.add({
              id: `alert_${Date.now()}_${Math.random()}`,
              farmId,
              type: AlertType.FERTILIZER_STAGE,
              title: 'Fertilizer Stage Reached',
              message: `${crop.name} on plot ${crop.plotId} has reached fertilizer application stage${daysDiff === 0 ? ' today' : ` in ${daysDiff} day(s)`}`,
              relatedId: crop.id,
              priority: daysDiff === 0 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  async checkPesticideIntervalAlerts(farmId: string): Promise<void> {
    const crops = await db.crops
      .where('farmId')
      .equals(farmId)
      .and((c) => c.status === CropStatus.GROWING || c.status === CropStatus.PLANTED)
      .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const crop of crops) {
      if (crop.lastPesticideDate && crop.pesticideIntervalDays) {
        const lastPesticideDate = new Date(crop.lastPesticideDate);
        lastPesticideDate.setHours(0, 0, 0, 0);

        const daysSinceLastPesticide = Math.floor(
          (today.getTime() - lastPesticideDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Alert if interval is completed (within 2 days of completion)
        if (
          daysSinceLastPesticide >= crop.pesticideIntervalDays - 2 &&
          daysSinceLastPesticide <= crop.pesticideIntervalDays + 2
        ) {
          const existingAlert = await db.alerts
            .where('[farmId+type+relatedId]')
            .equals([farmId, AlertType.PESTICIDE_INTERVAL, crop.id])
            .and((a) => !a.isRead)
            .first();

          if (!existingAlert) {
            const daysRemaining = crop.pesticideIntervalDays - daysSinceLastPesticide;
            await db.alerts.add({
              id: `alert_${Date.now()}_${Math.random()}`,
              farmId,
              type: AlertType.PESTICIDE_INTERVAL,
              title: 'Pesticide Interval Completed',
              message: `${crop.name} on plot ${crop.plotId} is ready for next pesticide application${daysRemaining > 0 ? ` in ${daysRemaining} day(s)` : ' now'}`,
              relatedId: crop.id,
              priority: daysRemaining <= 0 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
              isRead: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  async checkExpiryAlerts(farmId: string): Promise<void> {
    const stockLogs = await db.stockLogs
      .where('farmId')
      .equals(farmId)
      .and((s) => s.type === 'in' && s.expiryDate !== undefined)
      .toArray();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const log of stockLogs) {
      if (log.expiryDate) {
        const expiryDate = new Date(log.expiryDate);
        expiryDate.setHours(0, 0, 0, 0);

        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Alert if expiring within 30 days
        if (daysUntilExpiry >= 0 && daysUntilExpiry <= 30) {
          const item = await db.inventoryItems.get(log.itemId);
          if (item) {
            const existingAlert = await db.alerts
              .where('[farmId+type+relatedId]')
              .equals([farmId, AlertType.EXPIRY_WARNING, log.id])
              .and((a) => !a.isRead)
              .first();

            if (!existingAlert) {
              await db.alerts.add({
                id: `alert_${Date.now()}_${Math.random()}`,
                farmId,
                type: AlertType.EXPIRY_WARNING,
                title: 'Expiry Warning',
                message: `${item.name} (Batch: ${log.batchNumber || 'N/A'}) is expiring in ${daysUntilExpiry} day(s)`,
                relatedId: log.id,
                priority: daysUntilExpiry <= 7 ? AlertPriority.HIGH : AlertPriority.MEDIUM,
                isRead: false,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
    }
  }

  // Check rain probability alert before usage
  async checkRainProbabilityAlert(rainProbability: number): Promise<Alert | null> {
    if (rainProbability >= 70) {
      return {
        id: `alert_${Date.now()}_${Math.random()}`,
        farmId: '', // Will be set by caller
        type: AlertType.HIGH_RAIN_PROBABILITY,
        title: 'High Rain Probability',
        message: `Rain probability is ${rainProbability}%. Do not spray today. Best time: Morning or Evening when probability is lower.`,
        priority: AlertPriority.HIGH,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  }

  async getUnreadAlerts(farmId: string): Promise<Alert[]> {
    return db.alerts
      .where('farmId')
      .equals(farmId)
      .and((a) => !a.isRead)
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    await db.alerts.update(alertId, { isRead: true });
  }
}

export const alertEngine = new AlertEngine();
