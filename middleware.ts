import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Only run middleware for dashboard routes
  if (!req.nextUrl.pathname.startsWith('/dashboard')) {
    return res;
  }

  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If no session, redirect to login
  if (!session) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Verify user has org_id assigned
  const { data: user } = await supabase
    .from('users')
    .select('org_id')
    .eq('id', session.user.id)
    .single();

  if (!user?.org_id) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/waiting-approval';
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
