# SQL Schema and Migrations

This directory contains the authoritative database schema and migration scripts for the Farm Management App.

## Structure

```
sql/
├── schema-v1.sql           # Authoritative schema (source of truth)
└── migrations/
    └── 001-add-sync-status-columns.sql  # Migration to add missing columns
```

## Schema Version: 1.0

The schema includes all 11 core tables required for the MVP:

1. **users** - Farm owner authentication
2. **farms** - One farm per user
3. **plots** - Land divisions within a farm
4. **crops** - Crops planted in plots
5. **suppliers** - Vendor/supplier information
6. **inventory_items** - Farm supplies tracking
7. **stock_logs** - Stock in/out transactions
8. **field_usage_logs** - Pesticide/fertilizer application tracking
9. **expenses** - Farm expenses
10. **alerts** - Notifications for low stock, etc.
11. **sync_queue** - Offline-first sync queue for conflict resolution

## Field Naming Convention

All tables use **snake_case** field names (PostgreSQL convention):
- `farm_id` — References to other tables
- `sync_status` — Offline-first sync tracking
- `created_at`, `updated_at` — Audit timestamps

**Note:** JavaScript/TypeScript uses **camelCase**. The API endpoint (`app/api/sync/[table]/route.ts`) automatically converts between them.

Example:
```javascript
// JavaScript (app code)
{ farmId: "uuid-123", minThreshold: 10, syncStatus: "pending" }

// Converts to SQL
INSERT INTO inventory_items (farm_id, min_threshold, sync_status) 
VALUES ('uuid-123', 10, 'pending')
```

## Sync Status Values

- **pending** — Data saved locally, waiting for cloud sync
- **synced** — Successfully persisted to Supabase
- **conflict** — Collision detected (last-write-wins resolution)

## How to Use

### Initial Setup (First Time)

Run `schema-v1.sql` in Supabase SQL Editor to create all tables:

```bash
# Option 1: Copy entire schema-v1.sql and paste in Supabase SQL Editor
# Option 2: Use Supabase CLI
supabase db push
```

### Applying Migrations

For existing databases, run migration files in order:

```bash
# Migration 001: Add missing sync_status columns
supabase db push sql/migrations/001-add-sync-status-columns.sql
```

Or manually in Supabase SQL Editor:
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** → **New Query**
4. Copy migration SQL and run

## Verification

After running migration 001, verify the columns were added:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'sync_status'
ORDER BY table_name;
```

Expected result: 7 rows (inventory_items, crops, plots, stock_logs, expenses, suppliers, field_usage_logs)

## Rollback

To reverse migration 001:

```sql
ALTER TABLE inventory_items DROP COLUMN sync_status;
ALTER TABLE crops DROP COLUMN sync_status;
ALTER TABLE plots DROP COLUMN sync_status;
ALTER TABLE stock_logs DROP COLUMN sync_status;
ALTER TABLE expenses DROP COLUMN sync_status;
ALTER TABLE suppliers DROP COLUMN sync_status;
ALTER TABLE field_usage_logs DROP COLUMN sync_status;
```

## Important Notes

1. **Schema is versioned** — See `schema_versions` table for history
2. **All timestamps auto-update** — PostgreSQL triggers handle `updated_at`
3. **Referential integrity** — Foreign keys ensure data consistency with ON DELETE CASCADE
4. **Soft deletes not implemented** — Deleted records are hard-deleted (can add soft deletes in Phase 2)
5. **Row-level security not configured** — Can add RLS policies in Phase 2

## Next Steps

- Phase 2: Run migration 001 in your Supabase database
- Phase 3: Configure GitHub secrets for CI/CD
- Phase 4: Set up Vercel environment variables
- Phase 5: Verify code and API
- Phase 6: End-to-end testing

See `../BUILD_PLAN.md` for complete implementation roadmap.
