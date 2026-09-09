// ==============================================================================
// Supabase Privileged Admin Client (Pure JavaScript)
// Uses @supabase/supabase-js createClient with SUPABASE_SERVICE_ROLE_KEY
// ==============================================================================

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

let adminClientInstance = null;

/**
 * Creates or returns the privileged Supabase Service Role client.
 * WARNING: This client bypasses Row Level Security (RLS).
 * MUST ONLY be called in secure server environments (API routes, server actions, webhooks).
 * NEVER expose or import in Client Components.
 * 
 * Required Environment Variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
export function createAdminClient() {
  if (adminClientInstance) {
    return adminClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase admin environment variables: ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured in .env.local.'
    );
  }

  adminClientInstance = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClientInstance;
}
