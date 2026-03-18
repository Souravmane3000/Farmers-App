# Developer Quick Reference - Phase 1 MVP

## 🔑 Core Concepts

### Authentication
- **Hook**: `const { user, farm, isLoading, isAuthenticated, login, register, logout } = useAuth();`
- **Password**: Hashed with SHA-256 (Web Crypto API)
- **Session**: Token stored in localStorage
- **Protected Routes**: Use useAuth() to redirect if not authenticated

### Database
- **11 Core Tables Only**: users, farms, plots, crops, suppliers, inventoryItems, stockLogs, fieldUsageLogs, expenses, alerts, syncQueue
- **Client-side**: IndexedDB via Dexie.js
- **Server-side**: PostgreSQL (for Phase 2 - sync)

### Multi-farm Support
- **One farm per user**: Enforced by design
- **Farm Access**: Always via `useAuth()` hook
- **Queries**: Always filter by `farm.id`

---

## 📝 Adding New Pages

### Template Pattern
```typescript
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/db/database';

export default function MyPage() {
  const { farm, isAuthenticated } = useAuth();
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Always use farm.id, never hardcode
  const loadData = async () => {
    if (!farm) return;
    const data = await db.tableName
      .where('farmId').equals(farm.id)
      .toArray();
  };

  return (/* JSX */);
}
```

---

## 🗂️ File Structure

### Pages
```
app/
  page.tsx                 (Dashboard - protected)
  auth/
    login/page.tsx        (Login page)
    register/page.tsx     (Register page)
  plots/
    page.tsx              (List plots)
    add/page.tsx          (Add plot)
  inventory/
    page.tsx              (List inventory)
  usage/
    add/page.tsx          (Log field usage)
  reports/
    page.tsx              (Reports)
```

### Architecture
```
contexts/
  AuthContext.tsx         (Auth provider & hooks)

lib/
  db/
    database.ts          (Dexie schema)
    supabase.ts          (Supabase client)
  services/
    plotService.ts
    cropService.ts
    inventoryService.ts
    fieldUsageService.ts
    expenseService.ts
    alertService.ts
  sync/
    syncService.ts
  alerts/
    alertEngine.ts
  pdf/
    pdfGenerator.ts

components/
  Button.tsx
  Input.tsx
  Select.tsx
  BackButton.tsx
  (etc.)

types/
  index.ts              (All TypeScript interfaces)
```

---

## 💾 Database Queries

### Get Farm's Data
```typescript
const { farm } = useAuth();

// Plots
const plots = await db.plots
  .where('farmId').equals(farm.id)
  .toArray();

// Crops for plot
const crops = await db.crops
  .where('[farmId+plotId]')
  .equals([farm.id, plotId])
  .toArray();

// Inventory
const items = await db.inventoryItems
  .where('farmId').equals(farm.id)
  .toArray();

// Current stock
const stock = await dbHelpers.getCurrentStock(itemId, farm.id);

// All stocks
const stocks = await dbHelpers.getAllCurrentStocks(farm.id);
```

### Create Records
```typescript
const newPlot: Plot = {
  id: uuidv4(),
  farmId: farm.id,        // Always from farm
  name: "North Field",
  sizeAcres: 2.5,
  syncStatus: SyncStatus.PENDING,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await db.plots.add(newPlot);

// Mark for sync
await syncService.markForSync(farm.id, 'plots', newPlot.id, 'create', newPlot);
```

### Update Records
```typescript
await db.plots.update(plotId, {
  name: "Updated Name",
  updatedAt: new Date().toISOString(),
});

// Mark for sync
await syncService.markForSync(farm.id, 'plots', plotId, 'update', updatedData);
```

### Delete Records
```typescript
await db.plots.delete(plotId);

// Mark for sync
await syncService.markForSync(farm.id, 'plots', plotId, 'delete', {});
```

---

## 🎨 Form Components

### Using Input
```typescript
<Input
  type="text"
  name="plotName"
  label="Plot Name"
  placeholder="e.g., North Field"
  {...register('plotName')}
  error={errors.plotName?.message}
/>
```

### Using Select
```typescript
<Select
  label="Choose Plot"
  options={plots.map(p => ({ value: p.id, label: p.name }))}
  {...register('plotId')}
  error={errors.plotId?.message}
/>
```

### Using Button
```typescript
<Button
  type="submit"
  variant="primary"    // primary | secondary | danger
  size="md"           // sm | md | lg
  disabled={isLoading}
  icon={<Plus className="w-5 h-5" />}
>
  Add Plot
</Button>
```

---

## 🔄 Form Validation with Zod

```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const plotSchema = z.object({
  name: z.string().min(1, 'Name required'),
  sizeAcres: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Must be positive number'),
  notes: z.string().optional(),
});

type PlotFormData = z.infer<typeof plotSchema>;

export default function AddPlotPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<PlotFormData>({
    resolver: zodResolver(plotSchema),
  });

  const onSubmit = async (data: PlotFormData) => {
    // data is validated
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
}
```

---

## 🚨 Alerts

```typescript
import { alertEngine } from '@/lib/alerts/alertEngine';

// Check rain probability
const alert = alertEngine.checkRainProbabilityAlert(rainProbability);
if (alert) {
  // Show alert to user
}

// Check all alerts for farm
await alertEngine.checkAllAlerts(farm.id);
```

---

## 📄 PDF Generation

```typescript
import { pdfGenerator } from '@/lib/pdf/pdfGenerator';

// Generate plot report
pdfGenerator.generatePlotReport({
  farmId: farm.id,
  plotId: plotId,
});

// Download automatically
```

---

## 🔐 Auth Patterns

### Protected Page
```typescript
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/auth/login');
  }
}, [isLoading, isAuthenticated, router]);
```

### Logout
```typescript
const { logout } = useAuth();

const handleLogout = () => {
  logout();
  router.push('/auth/login');
};
```

### Check Farm
```typescript
if (!farm) {
  return <div>Loading farm information...</div>;
}
```

---

## 🐛 Debugging Tips

### Check Current User
```typescript
const { user, farm } = useAuth();
console.log('Current user:', user);
console.log('Current farm:', farm);
```

### Check Database
```typescript
// In browser console
const { db } = await import('../../lib/db/database.ts');
const allPlots = await db.plots.toArray();
console.log(allPlots);
```

### Check Sync Queue
```typescript
const syncItems = await db.syncQueue.toArray();
console.log('Pending syncs:', syncItems.length);
```

### Check Authentication
```typescript
const token = localStorage.getItem('farm_auth_token');
const userId = localStorage.getItem('farm_user_id');
console.log('Auth status:', { token, userId });
```

---

## 📚 Common Patterns

### Loading Data on Mount
```typescript
useEffect(() => {
  if (farm) {
    loadData();
  }
}, [farm]);

const loadData = async () => {
  try {
    // Load data
  } catch (err) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

### Auto-save on Field
```typescript
useEffect(() => {
  if (watchedPlotId) {
    loadCropsForPlot(watchedPlotId);
  }
}, [watchedPlotId]);
```

### Form with Async Submit
```typescript
const onSubmit = async (data: FormData) => {
  try {
    // Validate
    if (!farm) return;
    
    // Save to DB
    await db.table.add(record);
    
    // Mark for sync
    await syncService.markForSync(...);
    
    // Redirect
    router.push('/');
  } catch (err) {
    setError(err.message);
  }
};
```

---

## ✅ Pre-submission Checklist

Before creating a new page:
- [ ] Added `useAuth()` hook
- [ ] Check `farm` exists in useEffect
- [ ] Never hardcode `farmId`
- [ ] All DB queries use `farm.id`
- [ ] Protected route redirect if not authenticated
- [ ] Error messages user-friendly
- [ ] Loading states on async operations
- [ ] Validation on all forms
- [ ] Sync marked with `syncService.markForSync()`
- [ ] TypeScript types properly defined
- [ ] Mobile-responsive design

---

## 🎯 Performance Tips

1. **Use React.memo** for expensive components
2. **Lazy load large lists** with pagination
3. **Debounce search inputs** (300ms)
4. **Cache DB queries** in state
5. **Avoid re-renders** with proper dependencies
6. **Use virtual scrolling** for large lists

---

## 🚀 Deployment Checklist

- [ ] All auth flows tested
- [ ] No hardcoded IDs
- [ ] No console errors/warnings
- [ ] All forms validated
- [ ] Mobile tested (iOS + Android)
- [ ] PWA installable
- [ ] Offline mode works
- [ ] Sync tested with slow network
- [ ] Performance >90 Lighthouse score
