import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { ensureSeedData } from '@/lib/auto-seed'

// Helper: build default permissions for a role (server-side version)
function buildDefaultPermissions(roleId: string): Record<string, boolean> {
  const simpleFeatures = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing', 'riwayat', 'hak-akses', 'pengguna', 'pengaturan']
  const groupFeatures = ['master-customer', 'master-harga-kertas', 'master-ongkos-cetak', 'master-finishing', 'daftar-pengguna', 'calon-pembeli', 'pembeli']
  const perms: Record<string, boolean> = {}

  for (const f of simpleFeatures) {
    let allowed = false
    if (roleId === 'superadmin') allowed = true
    else if (roleId === 'admin') allowed = true
    else if (roleId === 'manager') allowed = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing', 'riwayat'].includes(f)
    else if (roleId === 'demo') allowed = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing'].includes(f)
    else if (roleId === 'user') allowed = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing'].includes(f)
    perms[f] = allowed
  }
  for (const g of groupFeatures) {
    perms[g] = roleId === 'superadmin' || roleId === 'admin' || roleId === 'manager'
  }
  return perms
}

function buildDefaultSubPermissions(roleId: string): Record<string, Record<string, boolean>> {
  const groupDefs = [
    { id: 'master-customer', subs: ['master-customer-tambah', 'master-customer-edit', 'master-customer-hapus'] },
    { id: 'master-harga-kertas', subs: ['master-harga-kertas-lihat', 'master-harga-kertas-tambah', 'master-harga-kertas-edit', 'master-harga-kertas-hapus'] },
    { id: 'master-ongkos-cetak', subs: ['master-ongkos-cetak-lihat', 'master-ongkos-cetak-tambah', 'master-ongkos-cetak-edit', 'master-ongkos-cetak-hapus'] },
    { id: 'master-finishing', subs: ['master-finishing-lihat', 'master-finishing-tambah', 'master-finishing-edit', 'master-finishing-hapus'] },
    { id: 'daftar-pengguna', subs: ['daftar-pengguna-tambah', 'daftar-pengguna-edit', 'daftar-pengguna-hapus'] },
    { id: 'calon-pembeli', subs: ['calon-pembeli-tambah', 'calon-pembeli-edit', 'calon-pembeli-hapus', 'calon-pembeli-konversi'] },
    { id: 'pembeli', subs: ['pembeli-tambah', 'pembeli-edit', 'pembeli-hapus'] },
  ]
  const allSubs: Record<string, Record<string, boolean>> = {}
  const isFull = roleId === 'superadmin' || roleId === 'admin'
  const isManager = roleId === 'manager'
  for (const group of groupDefs) {
    const subs: Record<string, boolean> = {}
    for (const sub of group.subs) {
      if (isFull) subs[sub] = true
      else if (isManager) subs[sub] = sub.includes('tambah') || sub.includes('edit')
      else subs[sub] = false
    }
    allSubs[group.id] = subs
  }
  return allSubs
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // Auto-seed global data (users, settings) if not yet seeded
    await ensureSeedData(null)

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username dan password wajib diisi' },
        { status: 400 }
      )
    }

    // 1. Cari di Pengguna (user yang sudah dikonversi/disetujui admin)
    const pengguna = await db.pengguna.findUnique({
      where: { username }
    })

    if (pengguna) {
      if (pengguna.password !== password) {
        return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
      }

      if (pengguna.validUntil) {
        if (new Date(pengguna.validUntil) < new Date()) {
          return NextResponse.json({ error: 'Akun sudah kadaluarsa. Hubungi administrator.' }, { status: 403 })
        }
      }

      return await buildLoginResponse(pengguna.id, pengguna.username, pengguna.namaLengkap, pengguna.role, pengguna.validUntil, username)
    }

    // 2. Tidak ditemukan di Pengguna → cek di CalonPembeli
    const calon = await db.calonPembeli.findFirst({
      where: { username }
    })

    if (calon) {
      if (calon.password !== password) {
        return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
      }

      // Status "ditolak" → blokir
      if (calon.status === 'ditolak') {
        return NextResponse.json({ error: 'Pendaftaran Anda ditolak oleh administrator.', rejected: true }, { status: 403 })
      }

      // Status "baru" atau "aktif" → langsung izinkan login
      // Pakai CalonPembeli ID sebagai userId, role = demo
      const role = calon.role || 'demo'
      return await buildLoginResponse(calon.id, calon.username || username, calon.nama, role, calon.expiredDate, calon.username || username)
    }

    // 3. Tidak ditemukan di mana pun
    return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// Shared helper: build login response with session, cookies, permissions
async function buildLoginResponse(
  userId: string,
  username: string,
  name: string,
  role: string,
  validUntil: Date | null,
  usernameForSession: string
): Promise<NextResponse> {
  const sessionId = randomUUID()

  // Check single device setting
  const singleDeviceSetting = await db.setting.findUnique({ where: { key: 'single_device' } })
  const singleDevice = singleDeviceSetting?.value !== 'false'

  if (singleDevice || role === 'admin' || role === 'superadmin') {
    await db.setting.upsert({
      where: { key: `session_${usernameForSession}` },
      update: { value: sessionId },
      create: { key: `session_${usernameForSession}`, value: sessionId },
    })
  }

  // Get demo popup message and remaining days for demo users
  let demoPopupMessage: string | null = null
  let demoRemainingDays: number | null = null
  if (role === 'demo') {
    const defaultDemoMsg = `Selamat datang! Anda sedang menggunakan akun demo.\n\nFitur yang tersedia:\n✅ Potong Kertas\n✅ Hitung Cetakan\n\nUntuk akses penuh ke semua fitur (Master Data, Riwayat, Pengaturan, dll), silakan hubungi administrator.`
    const demoMsgSetting = await db.setting.findUnique({ where: { key: 'demo_message' } })
    demoPopupMessage = demoMsgSetting?.value || defaultDemoMsg
    if (validUntil) {
      const remaining = Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      demoRemainingDays = Math.max(0, remaining)
    }
  }

  // Load custom permissions from database
  let features = buildDefaultPermissions(role)
  let subPermissions = buildDefaultSubPermissions(role)

  try {
    const customPermsSetting = await db.setting.findUnique({ where: { key: 'role_permissions' } })
    if (customPermsSetting?.value) {
      const allPerms = JSON.parse(customPermsSetting.value)
      if (allPerms[role]) {
        if (allPerms[role].features) features = allPerms[role].features
        if (allPerms[role].subPermissions) subPermissions = allPerms[role].subPermissions
      }
    }
  } catch {}

  const response = NextResponse.json({
    id: userId,
    username,
    name,
    role,
    sessionId,
    singleDevice,
    permissions: { features, subPermissions },
    ...(demoPopupMessage ? { demoPopupMessage, demoRemainingDays } : {}),
  })

  response.cookies.set('userId', userId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  response.cookies.set('userRole', role, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

  return response
}
