# Supabase Configuration Guide

## Setup Instructions

### 1. Get Your Supabase Credentials

1. Go to https://supabase.com and sign up/login
2. Create a new project
3. Navigate to Project Settings → API
4. Copy your:
   - **Project URL** - This is your `NEXT_PUBLIC_SUPABASE_URL`
   - **Anon public key** - This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Create Required Tables in Supabase

Run the following SQL in your Supabase SQL Editor to create the necessary tables:

```sql
-- Plots table
CREATE TABLE plots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  size_acres DECIMAL(10, 2) NOT NULL,
  current_crop_id UUID,
  notes TEXT,
  sync_status VARCHAR(50) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crops table
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id VARCHAR(50) NOT NULL,
  plot_id UUID NOT NULL REFERENCES plots(id),
  name VARCHAR(255) NOT NULL,
  variety VARCHAR(255),
  planting_date DATE NOT NULL,
  expected_harvest_date DATE,
  status VARCHAR(50),
  fertilizer_stage_date DATE,
  pesticide_interval_days INTEGER,
  last_pesticide_date DATE,
  sync_status VARCHAR(50) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Items table
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50),
  min_threshold DECIMAL(10, 2),
  sync_status VARCHAR(50) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Logs table
CREATE TABLE stock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id VARCHAR(50) NOT NULL,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  type VARCHAR(10) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  sync_status VARCHAR(50) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Field Usage Logs table
CREATE TABLE field_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id VARCHAR(50) NOT NULL,
  plot_id UUID NOT NULL REFERENCES plots(id),
  crop_id UUID NOT NULL REFERENCES crops(id),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity_used DECIMAL(10, 2) NOT NULL,
  usage_date DATE NOT NULL,
  usage_time TIME NOT NULL,
  application_method VARCHAR(50),
  rain_probability DECIMAL(5, 2),
  weather_condition VARCHAR(100),
  temperature DECIMAL(5, 2),
  notes TEXT,
  sync_status VARCHAR(50) DEFAULT 'synced',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_plots_farm_id ON plots(farm_id);
CREATE INDEX idx_crops_farm_id ON crops(farm_id);
CREATE INDEX idx_crops_plot_id ON crops(plot_id);
CREATE INDEX idx_inventory_items_farm_id ON inventory_items(farm_id);
CREATE INDEX idx_stock_logs_farm_id ON stock_logs(farm_id);
CREATE INDEX idx_field_usage_logs_farm_id ON field_usage_logs(farm_id);
CREATE INDEX idx_field_usage_logs_plot_id ON field_usage_logs(plot_id);
```

### 3. Update .env.local

Replace the placeholder values in `.env.local` with your actual Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Test the App

1. Start the dev server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Try adding a plot:
   - Click the + (add plot) button
   - Fill in the form
   - Click "Save Plot"
   - Check Supabase dashboard to verify the data is saved

4. Try recording field usage:
   - Click on field usage
   - Fill in the form
   - Click "Save Usage"
   - Check Supabase dashboard to verify

## Data Flow

1. **User enters data** → Form validation
2. **Save locally** → IndexedDB (works offline)
3. **Mark for sync** → Added to sync queue
4. **Auto-sync runs** → Every 30 seconds when online
5. **HTTP POST to API** → `/api/sync/[table]`
6. **API syncs to Supabase** → Data stored permanently

## Offline-First Architecture

- Data is saved locally first (IndexedDB)
- Sync happens automatically in the background
- Works offline - data syncs when connection is restored
- Pending syncs are tracked in `sync_queue` table

## Troubleshooting

**"Supabase credentials not configured" warning?**
- Make sure `.env.local` exists in the root directory
- Check that both environment variables are set correctly
- Restart the dev server after updating `.env.local`

**Data not syncing?**
- Check browser console for errors
- Verify Supabase URL and key are correct
- Check Supabase tables exist (run the SQL above)
- Ensure tables have proper column names matching the API route mapping

**Column name mismatch?**
- The API route uses `snake_case` for Supabase columns
- The app uses `camelCase` internally
- Make sure the table mappings in `app/api/sync/[table]/route.ts` match your table names
