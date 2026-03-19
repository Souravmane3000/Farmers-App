import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db/supabase';
import { SyncOperation } from '@/types';

// Map table names to Supabase table names (if different)
const tableNameMap: Record<string, string> = {
  plots: 'plots',
  crops: 'crops',
  inventoryItems: 'inventory_items',
  stockLogs: 'stock_logs',
  fieldUsageLogs: 'field_usage_logs',
  expenses: 'expenses',
  suppliers: 'suppliers',
  alerts: 'alerts',
  workers: 'workers',
  laborLogs: 'labor_logs',
  equipment: 'equipment',
  equipmentMaintenance: 'equipment_maintenance',
  weatherLogs: 'weather_logs',
  irrigationSchedules: 'irrigation_schedules',
  harvests: 'harvests',
  cropRotations: 'crop_rotations',
  tasks: 'tasks',
};

export async function POST(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const body = await request.json();
    const { table } = params;
    const supabaseTable = tableNameMap[table] || table;

    console.log(`[API] /api/sync/${table} - Syncing to Supabase table: ${supabaseTable}`);
    console.log(`[API] Data:`, body);

    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[API] ❌ Supabase credentials not configured!');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase credentials not configured. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
        },
        { status: 500 }
      );
    }

    // Upsert record to Supabase
    const { data, error } = await supabase
      .from(supabaseTable)
      .upsert([body], { onConflict: 'id' });

    if (error) {
      console.error(`[API] ❌ Supabase error for ${supabaseTable}:`, error);
      console.error('[API] Error code:', error.code);
      console.error('[API] Error details:', JSON.stringify(error, null, 2));
      
      // Provide more detailed error messages
      let errorMessage = error.message;
      if (error.code === 'PGRST116') {
        errorMessage = `Table "${supabaseTable}" not found in Supabase. Please create it first.`;
      } else if (error.message?.includes('relation')) {
        errorMessage = `Table "${supabaseTable}" doesn't exist. Make sure all Supabase tables are created.`;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorMessage,
          details: {
            code: error.code,
            table: supabaseTable,
            message: error.message
          }
        },
        { status: 400 }
      );
    }

    console.log(`[API] ✅ Successfully synced to ${supabaseTable}`);
    return NextResponse.json({
      success: true,
      message: `Synced ${table} record`,
      data: data || body,
    });
  } catch (error) {
    console.error('Sync POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const body = await request.json();
    const { table } = params;
    const supabaseTable = tableNameMap[table] || table;

    // Update record in Supabase
    const { id, ...updateData } = body;
    const { data, error } = await supabase
      .from(supabaseTable)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error(`Supabase error for ${supabaseTable}:`, error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${table} record`,
      data,
    });
  } catch (error) {
    console.error('Sync PUT error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { table: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('id');
    const { table } = params;
    const supabaseTable = tableNameMap[table] || table;

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Delete from Supabase
    const { error } = await supabase
      .from(supabaseTable)
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error(`Supabase error for ${supabaseTable}:`, error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${table} record`,
      id: recordId,
    });
  } catch (error) {
    console.error('Sync DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
