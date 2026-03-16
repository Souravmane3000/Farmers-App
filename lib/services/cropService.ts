import { db } from '@/lib/db/database';
import { Crop, CropStatus, SyncStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { syncService } from '../sync/syncService';

export interface CreateCropDTO {
  farmId: string;
  plotId: string;
  name: string;
  variety?: string;
  plantingDate: string;
  expectedHarvestDate?: string;
  fertilizerStageDate?: string;
  pesticideIntervalDays?: number;
}

export interface UpdateCropDTO {
  name?: string;
  variety?: string;
  expectedHarvestDate?: string;
  status?: CropStatus;
  fertilizerStageDate?: string;
  pesticideIntervalDays?: number;
  lastPesticideDate?: string;
}

class CropService {
  async create(data: CreateCropDTO): Promise<Crop> {
    const now = new Date().toISOString();
    const crop: Crop = {
      id: uuidv4(),
      ...data,
      status: CropStatus.PLANTED,
      syncStatus: SyncStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await db.crops.add(crop);
    await syncService.markForSync(data.farmId, 'crops', crop.id, 'create', crop);

    return crop;
  }

  async getByFarm(farmId: string): Promise<Crop[]> {
    return db.crops.where('farmId').equals(farmId).toArray();
  }

  async getByPlot(plotId: string): Promise<Crop[]> {
    return db.crops.where('plotId').equals(plotId).toArray();
  }

  async getById(id: string): Promise<Crop | undefined> {
    return db.crops.get(id);
  }

  async getActiveByFarm(farmId: string): Promise<Crop[]> {
    return db.crops
      .where('farmId')
      .equals(farmId)
      .filter((c) => c.status === CropStatus.PLANTED || c.status === CropStatus.GROWING)
      .toArray();
  }

  async update(id: string, data: UpdateCropDTO): Promise<Crop | null> {
    const crop = await db.crops.get(id);
    if (!crop) return null;

    const updatedCrop: Crop = {
      ...crop,
      ...data,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date().toISOString(),
    };

    await db.crops.update(id, updatedCrop);
    await syncService.markForSync(crop.farmId, 'crops', id, 'update', updatedCrop);

    return updatedCrop;
  }

  async updateStatus(id: string, status: CropStatus): Promise<Crop | null> {
    return this.update(id, { status });
  }

  async markHarvested(id: string): Promise<Crop | null> {
    return this.update(id, { status: CropStatus.HARVESTED });
  }

  async recordPesticideApplication(id: string): Promise<Crop | null> {
    const crop = await db.crops.get(id);
    if (!crop) return null;

    return this.update(id, {
      lastPesticideDate: new Date().toISOString().split('T')[0],
    });
  }

  async delete(id: string): Promise<void> {
    const crop = await db.crops.get(id);
    if (!crop) return;

    await db.crops.delete(id);
    await syncService.markForSync(crop.farmId, 'crops', id, 'delete', { id });
  }

  async getByStatus(farmId: string, status: CropStatus): Promise<Crop[]> {
    return db.crops
      .where('farmId')
      .equals(farmId)
      .filter((c) => c.status === status)
      .toArray();
  }

  async count(farmId: string): Promise<{ total: number; active: number; harvested: number }> {
    const crops = await this.getByFarm(farmId);
    return {
      total: crops.length,
      active: crops.filter((c) => c.status !== CropStatus.HARVESTED).length,
      harvested: crops.filter((c) => c.status === CropStatus.HARVESTED).length,
    };
  }
}

export const cropService = new CropService();