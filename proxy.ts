import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const getCookie = (name: string) => request.cookies.get(name)?.value;
  const setCookie = (
    name: string,
    value: string,
    options?: Parameters<typeof response.cookies.set>[2]
  ) => {
    response.cookies.set(name, value, options);
  };
  const removeCookie = (
    name: string,
    options?: Parameters<typeof response.cookies.set>[2]
  ) => {
    response.cookies.set(name, "", options);
  };

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: getCookie,
      set: setCookie,
      remove: removeCookie,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isAppRoute = pathname.startsWith("/dashboard");

  if (!user && isAppRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard", "/sign-in", "/sign-up"],
};
