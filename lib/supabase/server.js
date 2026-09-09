// ==============================================================================
// Supabase Server Client (Pure JavaScript)
// Uses @supabase/ssr createServerClient with Next.js App Router cookies()
// ==============================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates an authenticated Supabase client for Server Components,
 * Server Actions, and Route Handlers using Next.js cookie jar.
 * 
 * Required Environment Variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export async function createClient() {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase public environment variables: ' +
      'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // The `setAll` method was called from a Server Component.
          // This can be safely ignored if middleware is refreshing user sessions.
        }
      },
    },
  });
}
