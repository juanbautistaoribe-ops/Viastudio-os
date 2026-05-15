import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isPublicRoute = pathname === '/'
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticRoute = pathname.startsWith('/_next/') || pathname.includes('.')

  if (isStaticRoute || isApiRoute || isPublicRoute || isAuthRoute) {
    return NextResponse.next()
  }

  // If Supabase is not configured, skip auth check (dev mode)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl || supabaseUrl === 'your_supabase_url_here') {
    return NextResponse.next()
  }

  try {
    const { updateSession } = await import('@/lib/supabase/middleware')
    return await updateSession(request)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
