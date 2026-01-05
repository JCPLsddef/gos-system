// middleware.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // ⚠️ On ne protège QUE /dashboard, car matcher le garantit.
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();

  console.log('🛡️ Middleware check:', {
    path: request.nextUrl.pathname,
    hasUser: !!data?.user,
    userId: data?.user?.id,
    cookies: request.cookies.getAll().map(c => c.name)
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
