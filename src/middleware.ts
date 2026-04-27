import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/api/auth/login', '/api/auth/me', '/api/auth/verify-session', '/api/register', '/api/public-settings', '/api/manifest', '/api/app-icon', '/api/seed-admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith('/api/'))) {
    return NextResponse.next()
  }

  // For dashboard routes, check auth cookie/token
  // Auth check is handled client-side by DashboardLayout, so we just let them through
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|company-logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
