-- Farm Management App - PostgreSQL Database Schema
-- This is the cloud database schema (for reference)
-- Local IndexedDB schema is in lib/db/database.ts

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    farm_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farms Table (One per user)
CREATE TABLE farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Plots Table
CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    size_acres DECIMAL(10, 2) NOT NULL,
    current_crop_id UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crops Table
CREATE TABLE crops (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    email VARCHAR(255),
    address TEXT,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Items Table
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    min_threshold DECIMAL(10, 2) NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Logs Table
CREATE TABLE stock_logs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Field Usage Logs Table (Core Feature)
CREATE TABLE field_usage_logs (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    item_id UUID REFERENCES inventory_items(id),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id),
    description TEXT NOT NULL,
    receipt_photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alerts Table
CREATE TABLE alerts (
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

-- Sync Queue Table (for conflict resolution)
CREATE TABLE sync_queue (
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

-- Indexes for Performance
CREATE INDEX idx_plots_farm_id ON plots(farm_id);
CREATE INDEX idx_crops_farm_id ON crops(farm_id);
CREATE INDEX idx_crops_plot_id ON crops(plot_id);
CREATE INDEX idx_inventory_items_farm_id ON inventory_items(farm_id);
CREATE INDEX idx_stock_logs_farm_id ON stock_logs(farm_id);
CREATE INDEX idx_stock_logs_item_id ON stock_logs(item_id);
CREATE INDEX idx_stock_logs_date ON stock_logs(date);
CREATE INDEX idx_field_usage_logs_farm_id ON field_usage_logs(farm_id);
CREATE INDEX idx_field_usage_logs_plot_id ON field_usage_logs(plot_id);
CREATE INDEX idx_field_usage_logs_crop_id ON field_usage_logs(crop_id);
CREATE INDEX idx_field_usage_logs_item_id ON field_usage_logs(item_id);
CREATE INDEX idx_field_usage_logs_usage_date ON field_usage_logs(usage_date);
CREATE INDEX idx_expenses_farm_id ON expenses(farm_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_alerts_farm_id ON alerts(farm_id);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_sync_queue_farm_id ON sync_queue(farm_id);
CREATE INDEX idx_sync_queue_table_name ON sync_queue(table_name);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farms_updated_at BEFORE UPDATE ON farms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crops_updated_at BEFORE UPDATE ON crops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_logs_updated_at BEFORE UPDATE ON stock_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_usage_logs_updated_at BEFORE UPDATE ON field_usage_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON sync_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: Current Stock (computed)
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
LEFT JOIN stock_logs sl ON i.id = sl.item_id
GROUP BY i.id, i.farm_id, i.name, i.category, i.unit, i.min_threshold;

-- ============================================
-- EXTENDED SCHEMA - Additional Tables
-- ============================================

-- Workers/Labor Table
CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    role VARCHAR(100),
    daily_wage DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    hire_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Labor Logs Table (Track daily work)
CREATE TABLE labor_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    hours_worked DECIMAL(5, 2) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    description TEXT,
    amount_paid DECIMAL(10, 2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255),
    purchase_date DATE,
    purchase_price DECIMAL(12, 2),
    warranty_expiry_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'sold', 'broken')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Equipment Maintenance Logs Table
CREATE TABLE equipment_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL,
    description TEXT,
    cost DECIMAL(10, 2),
    next_maintenance_date DATE,
    performed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weather Logs Table
CREATE TABLE weather_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    temperature_high DECIMAL(5, 2),
    temperature_low DECIMAL(5, 2),
    rainfall_mm DECIMAL(8, 2),
    humidity_percent INTEGER CHECK (humidity_percent >= 0 AND humidity_percent <= 100),
    wind_speed_kmh DECIMAL(6, 2),
    wind_direction VARCHAR(50),
    weather_condition VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(farm_id, log_date)
);

-- Irrigation Schedules Table
CREATE TABLE irrigation_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    duration_minutes INTEGER,
    water_amount_litres DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'skipped')),
    method VARCHAR(50),
    notes TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Harvest Records Table
CREATE TABLE harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    harvest_date DATE NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    quality_grade VARCHAR(50),
    sale_price_per_unit DECIMAL(10, 2),
    total_revenue DECIMAL(12, 2),
    buyer VARCHAR(255),
    storage_location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crop Rotation History Table
CREATE TABLE crop_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    previous_crop VARCHAR(255) NOT NULL,
    new_crop VARCHAR(255) NOT NULL,
    rotation_date DATE NOT NULL,
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks/Todo Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('general', 'planting', 'harvesting', 'irrigation', 'fertilizer', 'pesticide', 'equipment', 'maintenance', 'other')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    assigned_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    related_plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
    related_crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
    related_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
    related_equipment_id UUID REFERENCES equipment(id) ON DELETE SET NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log Table (Audit Trail)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farmer Contacts (Multi-contact support)
CREATE TABLE farm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Soil Tests Table
CREATE TABLE soil_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    test_date DATE NOT NULL,
    ph_level DECIMAL(4, 2),
    nitrogen_level DECIMAL(8, 2),
    phosphorus_level DECIMAL(8, 2),
    potassium_level DECIMAL(8, 2),
    organic_matter_percent DECIMAL(5, 2),
    soil_type VARCHAR(100),
    lab_name VARCHAR(255),
    recommendations TEXT,
    next_test_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Additional Indexes
-- ============================================

CREATE INDEX idx_workers_farm_id ON workers(farm_id);
CREATE INDEX idx_workers_is_active ON workers(is_active);
CREATE INDEX idx_labor_logs_farm_id ON labor_logs(farm_id);
CREATE INDEX idx_labor_logs_worker_id ON labor_logs(worker_id);
CREATE INDEX idx_labor_logs_plot_id ON labor_logs(plot_id);
CREATE INDEX idx_labor_logs_work_date ON labor_logs(work_date);
CREATE INDEX idx_equipment_farm_id ON equipment(farm_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_maintenance_equipment_id ON equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_date ON equipment_maintenance(maintenance_date);
CREATE INDEX idx_weather_logs_farm_id ON weather_logs(farm_id);
CREATE INDEX idx_weather_logs_date ON weather_logs(log_date);
CREATE INDEX idx_irrigation_schedules_plot_id ON irrigation_schedules(plot_id);
CREATE INDEX idx_irrigation_schedules_date ON irrigation_schedules(scheduled_date);
CREATE INDEX idx_irrigation_schedules_status ON irrigation_schedules(status);
CREATE INDEX idx_harvests_plot_id ON harvests(plot_id);
CREATE INDEX idx_harvests_crop_id ON harvests(crop_id);
CREATE INDEX idx_harvests_date ON harvests(harvest_date);
CREATE INDEX idx_crop_rotations_plot_id ON crop_rotations(plot_id);
CREATE INDEX idx_tasks_farm_id ON tasks(farm_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_assigned_worker ON tasks(assigned_worker_id);
CREATE INDEX idx_activity_logs_farm_id ON activity_logs(farm_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_notifications_farm_id ON notifications(farm_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_farm_contacts_farm_id ON farm_contacts(farm_id);
CREATE INDEX idx_soil_tests_plot_id ON soil_tests(plot_id);
CREATE INDEX idx_soil_tests_date ON soil_tests(test_date);

-- ============================================
-- Additional Triggers
-- ============================================

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labor_logs_updated_at BEFORE UPDATE ON labor_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_maintenance_updated_at BEFORE UPDATE ON equipment_maintenance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_logs_updated_at BEFORE UPDATE ON weather_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_irrigation_schedules_updated_at BEFORE UPDATE ON irrigation_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_harvests_updated_at BEFORE UPDATE ON harvests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crop_rotations_updated_at BEFORE UPDATE ON crop_rotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_farm_contacts_updated_at BEFORE UPDATE ON farm_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soil_tests_updated_at BEFORE UPDATE ON soil_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Additional Views
-- ============================================

-- View: Labor Costs by Plot
CREATE OR REPLACE VIEW labor_costs_by_plot AS
SELECT 
    p.id as plot_id,
    p.farm_id,
    p.name as plot_name,
    SUM(ll.amount_paid) as total_labor_cost,
    COUNT(DISTINCT ll.worker_id) as unique_workers,
    SUM(ll.hours_worked) as total_hours
FROM plots p
LEFT JOIN labor_logs ll ON p.id = ll.plot_id
GROUP BY p.id, p.farm_id, p.name;

-- View: Equipment Maintenance Due
CREATE OR REPLACE VIEW maintenance_due AS
SELECT 
    e.id as equipment_id,
    e.farm_id,
    e.name as equipment_name,
    e.type,
    em.next_maintenance_date,
    em.maintenance_type as last_maintenance_type,
    em.maintenance_date as last_maintenance_date,
    CASE 
        WHEN em.next_maintenance_date IS NULL THEN 'no_schedule'
        WHEN em.next_maintenance_date < CURRENT_DATE THEN 'overdue'
        WHEN em.next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'ok'
    END as status
FROM equipment e
LEFT JOIN LATERAL (
    SELECT maintenance_date, next_maintenance_date, maintenance_type
    FROM equipment_maintenance em
    WHERE em.equipment_id = e.id
    ORDER BY maintenance_date DESC
    LIMIT 1
) em ON true;

-- View: Monthly Expense Summary
CREATE OR REPLACE VIEW monthly_expense_summary AS
SELECT 
    farm_id,
    EXTRACT(YEAR FROM date) as year,
    EXTRACT(MONTH FROM date) as month,
    category,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM expenses
GROUP BY farm_id, EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), category;

-- View: Harvest Revenue by Crop
CREATE OR REPLACE VIEW harvest_revenue_by_crop AS
SELECT 
    c.id as crop_id,
    c.farm_id,
    c.name as crop_name,
    c.plot_id,
    SUM(h.quantity) as total_quantity,
    SUM(h.total_revenue) as total_revenue,
    AVG(h.sale_price_per_unit) as avg_price_per_unit,
    COUNT(*) as harvest_count
FROM crops c
JOIN harvests h ON c.id = h.crop_id
GROUP BY c.id, c.farm_id, c.name, c.plot_id;

-- View: Task Summary by Status
CREATE OR REPLACE VIEW task_summary AS
SELECT 
    farm_id,
    status,
    priority,
    COUNT(*) as task_count,
    MIN(due_date) as earliest_due,
    MAX(due_date) as latest_due
FROM tasks
GROUP BY farm_id, status, priority;

-- View: Worker Productivity
CREATE OR REPLACE VIEW worker_productivity AS
SELECT 
    w.id as worker_id,
    w.farm_id,
    w.name as worker_name,
    w.role,
    COUNT(ll.id) as total_shifts,
    SUM(ll.hours_worked) as total_hours,
    SUM(ll.amount_paid) as total_paid,
    AVG(ll.hours_worked) as avg_hours_per_shift
FROM workers w
LEFT JOIN labor_logs ll ON w.id = ll.worker_id
GROUP BY w.id, w.farm_id, w.name, w.role;
