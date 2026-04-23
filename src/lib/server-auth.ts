import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export interface ServerUser {
  id: string
  role: string
}

/**
 * Extract user identity from request cookies (set by login API).
 * Returns null if not authenticated.
 */
export function getServerUser(request: NextRequest): ServerUser | null {
  try {
    const userId = request.cookies.get('userId')?.value
    const userRole = request.cookies.get('userRole')?.value

    if (!userId || !userRole) return null

    return { id: userId, role: userRole }
  } catch {
    return null
  }
}

/**
 * Check if user has admin-level access.
 */
export function isAdmin(role: string): boolean {
  return role === 'superadmin' || role === 'admin'
}

/**
 * Build a Prisma `where` filter for strict per-user data isolation.
 * Every user only sees their own data.
 */
export async function getDataFilter(user: ServerUser | null): Promise<Record<string, unknown>> {
  if (!user) return { id: '__unauthenticated__' }

  // Strict isolation: every user only sees their own data
  return { userId: user.id }
}

/**
 * Build ownership check for single-record operations (GET/PUT/DELETE by ID).
 * Returns true if the user can access a record owned by `recordUserId`.
 * STRICT: only the owner can access their own records (no admin override).
 */
export function canAccessRecord(user: ServerUser | null, recordUserId: string | null): boolean {
  if (!user) return false
  return recordUserId === user.id
}

/**
 * Require authentication — returns 401 if not logged in, null otherwise.
 * Usage: const err = requireAuth(request); if (err) return err;
 */
export function requireAuth(request: NextRequest): NextResponse | null {
  const user = getServerUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Anda harus login terlebih dahulu' }, { status: 401 })
  }
  return null
}

/**
 * Require admin role — returns 401/403 if not admin, null otherwise.
 * Usage: const err = requireAdmin(request); if (err) return err;
 */
export function requireAdmin(request: NextRequest): NextResponse | null {
  const authErr = requireAuth(request)
  if (authErr) return authErr

  const user = getServerUser(request)!
  if (!isAdmin(user.role)) {
    return NextResponse.json({ error: 'Akses ditolak. Hanya admin yang dapat mengakses.' }, { status: 403 })
  }
  return null
}
