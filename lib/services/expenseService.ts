import { db, dbHelpers } from '@/lib/db/database';
import { Expense, ExpenseCategory, SyncStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { syncService } from '../sync/syncService';

export interface CreateExpenseDTO {
  farmId: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  itemId?: string;
  supplierId?: string;
  receiptPhotoUrl?: string;
}

class ExpenseService {
  async create(data: CreateExpenseDTO): Promise<Expense> {
    const now = new Date().toISOString();
    const expense: Expense = {
      id: uuidv4(),
      ...data,
      syncStatus: SyncStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    await db.expenses.add(expense);
    await syncService.markForSync(data.farmId, 'expenses', expense.id, 'create', expense);

    return expense;
  }

  async getByFarm(farmId: string): Promise<Expense[]> {
    return db.expenses.where('farmId').equals(farmId).reverse().sortBy('date');
  }

  async getById(id: string): Promise<Expense | undefined> {
    return db.expenses.get(id);
  }

  async getByCategory(farmId: string, category: ExpenseCategory): Promise<Expense[]> {
    return db.expenses
      .where('[farmId+category]')
      .equals([farmId, category])
      .toArray();
  }

  async getByDateRange(farmId: string, startDate: string, endDate: string): Promise<Expense[]> {
    return db.expenses
      .where('farmId')
      .equals(farmId)
      .filter((e) => e.date >= startDate && e.date <= endDate)
      .toArray();
  }

  async update(id: string, data: Partial<CreateExpenseDTO>): Promise<Expense | null> {
    const expense = await db.expenses.get(id);
    if (!expense) return null;

    const updatedExpense: Expense = {
      ...expense,
      ...data,
      syncStatus: SyncStatus.PENDING,
      updatedAt: new Date().toISOString(),
    };

    await db.expenses.update(id, updatedExpense);
    await syncService.markForSync(expense.farmId, 'expenses', id, 'update', updatedExpense);

    return updatedExpense;
  }

  async delete(id: string): Promise<void> {
    const expense = await db.expenses.get(id);
    if (!expense) return;

    await db.expenses.delete(id);
    await syncService.markForSync(expense.farmId, 'expenses', id, 'delete', { id });
  }

  async getTotalByMonth(farmId: string, year: number, month: number): Promise<number> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const expenses = await this.getByDateRange(farmId, startDate, endDate);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  async getTotalByCategory(
    farmId: string,
    startDate: string,
    endDate: string
  ): Promise<Record<ExpenseCategory, number>> {
    const expenses = await this.getByDateRange(farmId, startDate, endDate);
    
    const totals: Record<ExpenseCategory, number> = {
      [ExpenseCategory.SEEDS]: 0,
      [ExpenseCategory.FERTILIZERS]: 0,
      [ExpenseCategory.PESTICIDES]: 0,
      [ExpenseCategory.EQUIPMENT]: 0,
      [ExpenseCategory.FUEL]: 0,
      [ExpenseCategory.LABOR]: 0,
      [ExpenseCategory.OTHER]: 0,
    };

    for (const expense of expenses) {
      totals[expense.category] += expense.amount;
    }

    return totals;
  }

  async getMonthlyTotals(farmId: string, year: number): Promise<number[]> {
    const months: number[] = [];
    
    for (let month = 0; month < 12; month++) {
      const total = await this.getTotalByMonth(farmId, year, month + 1);
      months.push(total);
    }

    return months;
  }

  async getTotalExpenses(farmId: string): Promise<number> {
    const expenses = await this.getByFarm(farmId);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }
}

export const expenseService = new ExpenseService();