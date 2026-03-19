-- Farm Management App - Authoritative PostgreSQL Database Schema (v1.0)
-- This is the source of truth for database structure
-- Created: March 2026
-- Source: Extracted from TypeScript types with proper field mapping

-- ============================================
-- CORE TABLES (Required for MVP)
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    farm_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farms Table (One per user)
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Plots Table
CREATE TABLE IF NOT EXISTS plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_acres DECIMAL(10, 2) NOT NULL,
    current_crop_id UUID,
    notes TEXT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crops Table
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    variety VARCHAR(255),
    planting_date DATE NOT NULL,
    expected_harvest_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'planted',
    fertilizer_stage_date DATE,
    pesticide_interval_days INTEGER,
    last_pesticide_date DATE,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(255),
    address TEXT,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    min_threshold DECIMAL(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Logs Table
CREATE TABLE IF NOT EXISTS stock_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
    quantity DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    batch_number VARCHAR(100),
    expiry_date DATE,
    purchase_price DECIMAL(10, 2),
    supplier_id UUID REFERENCES suppliers(id),
    notes TEXT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Field Usage Logs Table (Core Feature - Pesticide/Fertilizer tracking)
CREATE TABLE IF NOT EXISTS field_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    quantity_used DECIMAL(10, 2) NOT NULL,
    usage_date DATE NOT NULL,
    usage_time TIME NOT NULL,
    application_method VARCHAR(50) NOT NULL,
    rain_probability INTEGER NOT NULL CHECK (rain_probability >= 0 AND rain_probability <= 100),
    weather_condition VARCHAR(100),
    temperature DECIMAL(5, 2),
    notes TEXT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT NOT NULL,
    receipt_photo_url TEXT,
    sync_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync Queue Table (for offline-first conflict resolution)
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
    data JSONB NOT NULL,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_plots_farm_id ON plots(farm_id);
CREATE INDEX IF NOT EXISTS idx_plots_sync_status ON plots(sync_status);
CREATE INDEX IF NOT EXISTS idx_crops_farm_id ON crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_crops_plot_id ON crops(plot_id);
CREATE INDEX IF NOT EXISTS idx_crops_sync_status ON crops(sync_status);
CREATE INDEX IF NOT EXISTS idx_suppliers_farm_id ON suppliers(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_farm_id ON inventory_items(farm_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_sync_status ON inventory_items(sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_logs_farm_id ON stock_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_item_id ON stock_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_date ON stock_logs(date);
CREATE INDEX IF NOT EXISTS idx_stock_logs_sync_status ON stock_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_farm_id ON field_usage_logs(farm_id);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_plot_id ON field_usage_logs(plot_id);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_crop_id ON field_usage_logs(crop_id);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_item_id ON field_usage_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_usage_date ON field_usage_logs(usage_date);
CREATE INDEX IF NOT EXISTS idx_field_usage_logs_sync_status ON field_usage_logs(sync_status);
CREATE INDEX IF NOT EXISTS idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_sync_status ON expenses(sync_status);
CREATE INDEX IF NOT EXISTS idx_alerts_farm_id ON alerts(farm_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_farm_id ON sync_queue(farm_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table_name ON sync_queue(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON sync_queue(created_at);

-- ============================================
-- AUTOMATIC TIMESTAMP UPDATES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables with timestamps
CREATE TRIGGER IF NOT EXISTS update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_plots_updated_at BEFORE UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_crops_updated_at BEFORE UPDATE ON crops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_stock_logs_updated_at BEFORE UPDATE ON stock_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_field_usage_logs_updated_at BEFORE UPDATE ON field_usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_sync_queue_updated_at BEFORE UPDATE ON sync_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER VIEWS
-- ============================================

-- Current Stock View (calculated from stock_logs)
CREATE OR REPLACE VIEW current_stock AS
SELECT 
    i.id as item_id,
    i.farm_id,
    i.name as item_name,
    i.category,
    i.unit,
    i.min_threshold,
    COALESCE(
        SUM(CASE WHEN sl.type = 'in' THEN sl.quantity ELSE -sl.quantity END),
        0
    ) as current_quantity,
    CASE 
        WHEN COALESCE(
            SUM(CASE WHEN sl.type = 'in' THEN sl.quantity ELSE -sl.quantity END),
            0
        ) <= i.min_threshold THEN TRUE
        ELSE FALSE
    END as is_low_stock
FROM inventory_items i
LEFT JOIN stock_logs sl ON i.id = sl.item_id AND i.farm_id = sl.farm_id
GROUP BY i.id, i.farm_id, i.name, i.category, i.unit, i.min_threshold;

-- Pending Syncs View (for offline-first sync status)
CREATE OR REPLACE VIEW pending_syncs AS
SELECT 
    sq.id,
    sq.farm_id,
    sq.table_name,
    sq.operation,
    sq.retry_count,
    sq.created_at,
    COUNT(*) OVER (PARTITION BY sq.farm_id) as pending_count
FROM sync_queue sq
ORDER BY sq.created_at DESC;

-- ============================================
-- SCHEMA VERSION TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS schema_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Record this schema version
INSERT INTO schema_versions (version, description) 
VALUES ('1.0', 'Initial schema with 11 core tables, sync tracking, and full audit fields')
ON CONFLICT (version) DO NOTHING;

-- ============================================
-- NOTES
-- ============================================
-- 
-- Field Naming Convention:
-- - All table/column names use snake_case (PostgreSQL convention)
-- - JavaScript/TypeScript uses camelCase
-- - API endpoint converts camelCase → snake_case before saving to database
-- 
-- Example mapping:
--   JavaScript: { farmId: "uuid-123", minThreshold: 10 }
--   SQL Query:  INSERT INTO inventory_items (farm_id, min_threshold) VALUES ('uuid-123', 10)
-- 
-- Sync Status Values:
--   'pending' - Data saved locally, waiting for Supabase sync
--   'synced'  - Data successfully persisted to cloud
--   'conflict' - Two versions exist (last-write-wins resolution)
-- 
-- This schema is versioned. To track migrations, see sql/migrations/
--
