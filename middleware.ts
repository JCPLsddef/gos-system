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
          // Enhanced cookie options for mobile compatibility
          const enhancedOptions = {
            ...options,
            sameSite: 'lax' as const, // More permissive for mobile
            secure: process.env.NODE_ENV === 'production', // HTTPS only in production
            path: '/', // Ensure cookies are available across the whole site
          };
          request.cookies.set({
            name,
            value,
            ...enhancedOptions,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...enhancedOptions,
          });
        },
        remove(name: string, options: CookieOptions) {
          console.log(`🍪 Cookie REMOVE: ${name}`);
          const enhancedOptions = {
            ...options,
            path: '/',
          };
          request.cookies.set({
            name,
            value: "",
            ...enhancedOptions,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: "",
            ...enhancedOptions,
          });
        },
      },
    }
  );

  // Try getUser first, fallback to getSession for mobile compatibility
  let user = null;

  try {
    const { data, error } = await supabase.auth.getUser();

    console.log('🛡️ Middleware AFTER getUser:', {
      path: request.nextUrl.pathname,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message,
    });

    user = data?.user;

    // If getUser fails, try getSession as fallback (better for mobile)
    if (!user && !error) {
      console.log('🔄 getUser returned null, trying getSession fallback...');
      const { data: sessionData } = await supabase.auth.getSession();
      user = sessionData?.session?.user ?? null;

      console.log('🛡️ Middleware AFTER getSession fallback:', {
        hasUser: !!user,
        userId: user?.id,
      });
    }
  } catch (err) {
    console.error('❌ Auth error in middleware:', err);
    user = null;
  }

  if (!user) {
    console.log('❌ No user found after all attempts, redirecting to /login');
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
