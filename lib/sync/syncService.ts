import { db, dbHelpers } from '@/lib/db/database';
import { SyncQueue, SyncOperation, SyncStatus } from '@/types';

export class SyncService {
  private syncInterval: any = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupOnlineListener();
      this.startAutoSync();
    }
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.sync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private startAutoSync() {
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, 30000);
  }

  async sync(farmId?: string): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;

    try {
      const pendingSyncs = farmId
        ? await db.syncQueue.where('farmId').equals(farmId).toArray()
        : await db.syncQueue.toArray();

      for (const syncItem of pendingSyncs) {
        try {
          await this.syncItem(syncItem);
          // Remove from queue after successful sync
          await db.syncQueue.delete(syncItem.id);
        } catch (error) {
          console.error(`Sync failed for ${syncItem.tableName}:${syncItem.recordId}`, error);
          // Increment retry count
          await db.syncQueue.update(syncItem.id, {
            retryCount: syncItem.retryCount + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date().toISOString(),
          });

          // If retry count exceeds limit, mark as conflict
          if (syncItem.retryCount >= 5) {
            await this.markAsConflict(syncItem);
          }
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncItem(syncItem: SyncQueue): Promise<void> {
    // In a real app, this would call your backend API
    // For now, we'll simulate the API call

    const apiEndpoint = `/api/sync/${syncItem.tableName}`;
    const method = syncItem.operation === SyncOperation.CREATE ? 'POST' :
      syncItem.operation === SyncOperation.UPDATE ? 'PUT' : 'DELETE';

    const response = await fetch(apiEndpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'DELETE' ? JSON.stringify(syncItem.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const result = await response.json();

    // Update local record sync status
    await this.updateLocalSyncStatus(syncItem.tableName, syncItem.recordId, SyncStatus.SYNCED);
  }

  private async updateLocalSyncStatus(
    tableName: string,
    recordId: string,
    status: SyncStatus
  ): Promise<void> {
    const table = (db as any)[tableName];
    if (table) {
      await table.update(recordId, { syncStatus: status });
    }
  }

  private async markAsConflict(syncItem: SyncQueue): Promise<void> {
    await this.updateLocalSyncStatus(syncItem.tableName, syncItem.recordId, SyncStatus.CONFLICT);
    // Could also create an alert for the user
  }

  // Mark record for sync
  async markForSync(
    farmId: string,
    tableName: string,
    recordId: string,
    operation: SyncOperation,
    data: Record<string, any>
  ): Promise<void> {
    // Update local sync status
    await this.updateLocalSyncStatus(tableName, recordId, SyncStatus.PENDING);

    // Add to sync queue
    await dbHelpers.addToSyncQueue(farmId, tableName, recordId, operation, data);

    // Try to sync immediately if online
    if (this.isOnline) {
      await this.sync(farmId);
    }
  }

  // Conflict resolution: latest write wins
  async resolveConflict(
    tableName: string,
    recordId: string,
    localData: Record<string, any>,
    serverData: Record<string, any>
  ): Promise<void> {
    // Compare timestamps - latest write wins
    const localTime = new Date(localData.updatedAt || 0).getTime();
    const serverTime = new Date(serverData.updatedAt || 0).getTime();

    if (localTime >= serverTime) {
      // Local is newer, push to server
      await this.markForSync(
        localData.farmId,
        tableName,
        recordId,
        SyncOperation.UPDATE,
        localData
      );
    } else {
      // Server is newer, update local
      const table = (db as any)[tableName];
      if (table) {
        await table.update(recordId, {
          ...serverData,
          syncStatus: SyncStatus.SYNCED,
        });
      }
    }
  }

  destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncService = new SyncService();
