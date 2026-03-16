import { db } from '@/lib/db/database';
import { Alert, AlertType, AlertPriority } from '@/types';
import { v4 as uuidv4 } from 'uuid';

class AlertService {
  async create(data: {
    farmId: string;
    type: AlertType;
    title: string;
    message: string;
    relatedId?: string;
    priority?: AlertPriority;
  }): Promise<Alert> {
    const alert: Alert = {
      id: uuidv4(),
      ...data,
      priority: data.priority || AlertPriority.MEDIUM,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    await db.alerts.add(alert);
    return alert;
  }

  async getByFarm(farmId: string): Promise<Alert[]> {
    return db.alerts
      .where('farmId')
      .equals(farmId)
      .reverse()
      .sortBy('createdAt');
  }

  async getUnread(farmId: string): Promise<Alert[]> {
    return db.alerts
      .where('farmId')
      .equals(farmId)
      .filter((a) => !a.isRead)
      .toArray();
  }

  async markAsRead(id: string): Promise<void> {
    await db.alerts.update(id, { isRead: true });
  }

  async markAllAsRead(farmId: string): Promise<void> {
    const alerts = await this.getUnread(farmId);
    for (const alert of alerts) {
      await db.alerts.update(alert.id, { isRead: true });
    }
  }

  async delete(id: string): Promise<void> {
    await db.alerts.delete(id);
  }

  async deleteByType(farmId: string, type: AlertType, relatedId: string): Promise<void> {
    const alerts = await db.alerts
      .where('farmId')
      .equals(farmId)
      .filter((a) => a.type === type && a.relatedId === relatedId)
      .toArray();

    for (const alert of alerts) {
      await db.alerts.delete(alert.id);
    }
  }

  async count(farmId: string): Promise<{ total: number; unread: number }> {
    const all = await this.getByFarm(farmId);
    const unread = all.filter((a) => !a.isRead);
    return {
      total: all.length,
      unread: unread.length,
    };
  }

  async getByPriority(farmId: string, priority: AlertPriority): Promise<Alert[]> {
    return db.alerts
      .where('farmId')
      .equals(farmId)
      .filter((a) => a.priority === priority)
      .toArray();
  }

  async getByType(farmId: string, type: AlertType): Promise<Alert[]> {
    return db.alerts
      .where('farmId')
      .equals(farmId)
      .filter((a) => a.type === type)
      .toArray();
  }
}

export const alertService = new AlertService();