// ==============================================================================
// Next.js Route Protection & Session Refresh Middleware (Pure JavaScript)
// ==============================================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * Middleware function that:
 * 1. Automatically refreshes expired Supabase auth session tokens.
 * 2. Protects restricted route groups:
 *    - /dashboard/* (All authenticated users: Authors, Reviewers, Editors, Admins)
 *    - /reviewer/*  (REVIEWER, EDITOR, ADMIN only)
 *    - /editor/*    (EDITOR, ADMIN only)
 *    - /admin/*     (ADMIN only)
 * 3. Prevents privilege escalation and role traversal.
 */
export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Fetch the authenticated user securely from Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isProtectedPath = 
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/reviewer') ||
    pathname.startsWith('/editor') ||
    pathname.startsWith('/admin');

  // If unauthenticated user attempts to access protected routes, redirect to login
  if (!user && isProtectedPath) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If authenticated, verify role-based permissions
  if (user && isProtectedPath) {
    // Retrieve user role from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || 'AUTHOR';

    // Route Guard 1: Admin-only routes
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }

    // Route Guard 2: Editor routes (EDITOR or ADMIN)
    if (pathname.startsWith('/editor') && role !== 'EDITOR' && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }

    // Route Guard 3: Reviewer routes (REVIEWER, EDITOR, or ADMIN)
    if (pathname.startsWith('/reviewer') && !['REVIEWER', 'EDITOR', 'ADMIN'].includes(role)) {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets/ (public static assets)
     * - public files with common extensions (.svg, .png, .jpg, .jpeg, .pdf)
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|pdf)$).*)',
  ],
};
