import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { cookies: { getAll: () => request.cookies.getAll(), setAll(items) { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const user=(await supabase.auth.getUser()).data.user;
  if(user&&!request.nextUrl.pathname.startsWith("/compte-suspendu")&&!request.nextUrl.pathname.startsWith("/auth/")){
    const {data:status}=await supabase.rpc("current_account_status");
    if(status==="suspendu")return NextResponse.redirect(new URL("/compte-suspendu",request.url));
  }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
