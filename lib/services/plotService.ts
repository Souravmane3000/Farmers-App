import { db } from '@/lib/db/database';
import { Plot, SyncStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { syncService } from '../sync/syncService';

export interface CreatePlotDTO {
  farmId: string;
  name: string;
  sizeAcres: number;
  notes?: string;
}

export interface UpdatePlotDTO {
  name?: string;
  sizeAcres?: number;
  currentCropId?: string;
  notes?: string;
}

class PlotService {
  async create(data: CreatePlotDTO): Promise<Plot> {
    const now = new Date().toISOString();
    const plot: Plot = {
      id: uuidv4(),
      ...data,
      syncStatus: SyncStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await db.plots.add(plot);
    await syncService.markForSync(data.farmId, 'plots', plot.id, 'create', plot);

    return plot;
  }

  async getByFarm(farmId: string): Promise<Plot[]> {
    return db.plots.where('farmId').equals(farmId).toArray();
  }

  async getById(id: string): Promise<Plot | undefined> {
    return db.plots.get(id);
  }

  async update(id: string, data: UpdatePlotDTO): Promise<Plot | null> {
    const plot = await db.plots.get(id);
    if (!plot) return null;

    const updatedPlot: Plot = {
      ...plot,
      ...data,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date().toISOString(),
    };

    await db.plots.update(id, updatedPlot);
    await syncService.markForSync(plot.farmId, 'plots', id, 'update', updatedPlot);

    return updatedPlot;
  }

  async delete(id: string): Promise<void> {
    const plot = await db.plots.get(id);
    if (!plot) return;

    await db.plots.delete(id);
    await syncService.markForSync(plot.farmId, 'plots', id, 'delete', { id });
  }

  async getByFarmWithCrop(farmId: string) {
    const plots = await this.getByFarm(farmId);
    const plotsWithCrop = await Promise.all(
      plots.map(async (plot) => {
        let crop = null;
        if (plot.currentCropId) {
          crop = await db.crops.get(plot.currentCropId);
        }
        return { ...plot, crop };
      })
    );
    return plotsWithCrop;
  }

  async search(farmId: string, query: string): Promise<Plot[]> {
    const plots = await this.getByFarm(farmId);
    const lowerQuery = query.toLowerCase();
    return plots.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.notes && p.notes.toLowerCase().includes(lowerQuery))
    );
  }

  async count(farmId: string): Promise<number> {
    return db.plots.where('farmId').equals(farmId).count();
  }
}

export const plotService = new PlotService();