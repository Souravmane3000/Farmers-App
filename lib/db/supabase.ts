import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('[Supabase] Configuration Status:');
console.log(`[Supabase] URL configured: ${!!supabaseUrl}`);
console.log(`[Supabase] Key configured: ${!!supabaseKey}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [Supabase] CREDENTIALS NOT CONFIGURED!');
  console.error('❌ [Supabase] Data sync will NOT work!');
  console.error('❌ [Supabase] Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  console.error('❌ [Supabase] See SUPABASE_SETUP.md for instructions');
} else {
  console.log('✅ [Supabase] Credentials configured - sync should work!');
  console.log(`✅ [Supabase] URL: ${supabaseUrl.substring(0, 30)}...`);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export type SupabaseClient = typeof supabase;
