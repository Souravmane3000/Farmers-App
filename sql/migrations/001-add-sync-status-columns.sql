-- Farm Management App - Migration v001
-- Purpose: Add missing sync_status columns to existing tables
-- Date: March 2026
-- Why: Initial schema creation missed sync_status columns needed for offline-first sync

-- ============================================
-- ADD MISSING sync_status COLUMNS
-- ============================================

-- Add sync_status to inventory_items if it doesn't exist
ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- Add sync_status to crops if it doesn't exist
ALTER TABLE crops 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- Add sync_status to plots if it doesn't exist
ALTER TABLE plots 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- Add sync_status to stock_logs if it doesn't exist
ALTER TABLE stock_logs 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- Add sync_status to expenses if it doesn't exist
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- Add sync_status to suppliers if it doesn't exist
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- Add sync_status to field_usage_logs if it doesn't exist
ALTER TABLE field_usage_logs 
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'pending';

-- ============================================
-- ADD MISSING INDEXES FOR sync_status
-- ============================================

CREATE INDEX IF NOT EXISTS idx_inventory_items_sync_status ON inventory_items(sync_status);
CREATE INDEX IF NOT EXISTS idx_crops_sync_status ON crops(sync_status);
CREATE INDEX IF NOT EXISTS idx_plots_sync_status ON plots(sync_status);
CREATE INDEX IF NOT EXISTS idx_stock_logs_sync_status ON stock_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_sync_status ON suppliers(sync_status);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_sync_status ON field_usage_logs(sync_status);

-- ============================================
-- VERIFY COLUMN ADDITIONS
-- ============================================

-- Run this query to verify all columns were added:
-- SELECT 
--   table_name,
--   column_name,
--   data_type
-- FROM information_schema.columns
-- WHERE column_name = 'sync_status'
-- ORDER BY table_name;
--
-- Expected result: 7 rows (one for each table above)

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================
--
-- If you need to revert this migration:
-- 
-- ALTER TABLE inventory_items DROP COLUMN sync_status;
-- ALTER TABLE crops DROP COLUMN sync_status;
-- ALTER TABLE plots DROP COLUMN sync_status;
-- ALTER TABLE stock_logs DROP COLUMN sync_status;
-- ALTER TABLE expenses DROP COLUMN sync_status;
-- ALTER TABLE suppliers DROP COLUMN sync_status;
-- ALTER TABLE field_usage_logs DROP COLUMN sync_status;
--
