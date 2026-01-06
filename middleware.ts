// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Log ALL cookies FIRST
  const allCookies = request.cookies.getAll();
  const cookieNames = allCookies.map(c => c.name);
  const supabaseCookies = allCookies.filter(c => 
    c.name.includes('supabase') || 
    c.name.includes('sb-') ||
    c.name.includes('auth')
  );
  
  console.log('🛡️ Middleware INITIAL check:', {
    path: request.nextUrl.pathname,
    allCookiesCount: allCookies.length,
    allCookieNames: cookieNames,
    supabaseCookiesCount: supabaseCookies.length,
    supabaseCookieNames: supabaseCookies.map(c => c.name),
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = request.cookies.get(name)?.value;
          console.log(`🍪 Cookie GET: ${name} = ${value ? 'EXISTS' : 'MISSING'}`);
          return value;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`🍪 Cookie SET: ${name}`);
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          console.log(`🍪 Cookie REMOVE: ${name}`);
          request.cookies.set({
            name,
            value: "",
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  console.log('🛡️ Middleware AFTER getUser:', {
    path: request.nextUrl.pathname,
    hasUser: !!data?.user,
    userId: data?.user?.id,
  });

  if (!data?.user) {
    console.log('❌ No user found, redirecting to /login');
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  console.log('✅ User authenticated, allowing access');
  return response;
}

// ✅ IMPORTANT: matcher hyper strict → ne touche JAMAIS /manifest.json, /_next, etc.
export const config = {
  matcher: ["/dashboard/:path*"],
};
