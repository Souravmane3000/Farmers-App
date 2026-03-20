-- ============================================
-- Migration: Disable Row Level Security
-- Created: March 2026
-- Purpose: Disable RLS to allow inserts from the app
-- ============================================

-- Disable RLS on all tables
-- This is a quick fix for development
-- For production, you should implement proper RLS policies

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE farms DISABLE ROW LEVEL SECURITY;
ALTER TABLE plots DISABLE ROW LEVEL SECURITY;
ALTER TABLE crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTE: For production, implement proper RLS policies
-- Example for authenticated users:
-- 
-- CREATE POLICY "Users can manage their own data" ON inventory_items
--   FOR ALL
--   USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
--   WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));
-- ============================================