import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  // Keep public pages renderable when Supabase is not injected into the preview runtime.
  // Auth and protected data access remain unavailable until the integration variables exist.
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  const copySessionCookies = (response: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_status')
      .eq('user_id', user.id)
      .maybeSingle();
    const pathname = request.nextUrl.pathname;
    const accountRoute = pathname.startsWith('/dashboard/account') || pathname.startsWith('/api/account');

    if (profile?.account_status === 'pending_deletion' && !accountRoute) {
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
          { error: 'الحساب مجدول للحذف. ألغِ طلب الحذف من صفحة الحساب لاستعادة الوصول.' },
          { status: 403 },
        );
        return copySessionCookies(response);
      }
      if (pathname.startsWith('/dashboard')) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/account';
        url.searchParams.set('deletion', 'pending');
        const response = NextResponse.redirect(url);
        return copySessionCookies(response);
      }
    }

    if (profile && ['disabled', 'deleted'].includes(profile.account_status)) {
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json({ error: 'هذا الحساب غير متاح.' }, { status: 403 });
        return copySessionCookies(response);
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'account_unavailable');
      const response = NextResponse.redirect(url);
      return copySessionCookies(response);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
