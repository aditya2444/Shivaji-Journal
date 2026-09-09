// ==============================================================================
// Supabase Browser Client (Pure JavaScript)
// Uses @supabase/ssr createBrowserClient for browser context (Client Components)
// ==============================================================================

import { createBrowserClient } from '@supabase/ssr';

let clientInstance = null;

/**
 * Creates or retrieves the singleton Supabase client for browser environments.
 * Safe to call in client components, event handlers, and upload workflows.
 * 
 * Required Environment Variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function createClient() {
  if (clientInstance) {
    return clientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase public environment variables: ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return clientInstance;
}
