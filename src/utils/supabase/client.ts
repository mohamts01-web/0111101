import { createBrowserClient } from '@supabase/ssr';

const EXISTING_SUPABASE_URL = 'https://hflgspwxlinelgkebebj.supabase.co';
const EXISTING_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_iJFnL4mlptYMp735EKQ6Cg_GpLg1dK-';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? EXISTING_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    EXISTING_SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}
