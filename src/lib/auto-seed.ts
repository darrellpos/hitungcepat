import { db } from '@/lib/db'

// In-memory flag to avoid repeated seeding within the same serverless instance
let globalSeedChecked = false

// Allow external reset (e.g., from seed-admin API)
export function _resetSeedFlag() { globalSeedChecked = false }

// Per-user seed tracking (in-memory cache)
const seededUsers = new Set<string>()

// ============================================================
// Default settings — only seeds if settings don't exist in DB.
// role_permissions is NEVER auto-seeded — it's managed exclusively
// by the Hak Akses page to prevent overwriting user-saved permissions.
// ============================================================

const DEFAULT_SETTINGS: Record<string, string> = {
  currency: 'IDR',
  defaultProfitPercent: '10',
  packingCostDefault: '5000',
  shippingCostDefault: '15000',
  demo_days: '7',
  demo_message: 'Selamat datang! Anda sedang menggunakan akun demo.\nUpgrade ke akun penuh untuk mengakses semua fitur.',
  single_device: 'true',
  single_device_message: 'Akun sudah digunakan, silahkan logout di perangkat yang lain',
  auto_logout_min: '10',
  logout_warning_sec: '20',
  profit: '10',
  // NOTE: role_permissions is NOT seeded here.
  // It is created/managed exclusively by the Hak Akses page save handler.
  // This prevents auto-seed from overwriting user-customized permissions on cold starts.
}

/**
 * Seed per-user master data (Papers, Printing Costs, Finishings, Customers).
 * Each user gets their own independent copy of template data.
 * Only runs once per user (tracked in-memory).
 */
export async function seedUserData(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return

  try {
    // Check if user already has papers (quick check — if yes, they've been seeded)
    const existingPapers = await db.paper.count({ where: { userId } })
    if (existingPapers > 0) {
      seededUsers.add(userId)
      return
    }

    console.log(`🌱 Seeding master data for user: ${userId}`)

    await Promise.all([
      // Papers — per user
      db.paper.create({ data: { name: 'ivory', grammage: 210, width: 79, height: 109, pricePerRim: 1356233, userId } }),
      db.paper.create({ data: { name: 'ivory', grammage: 300, width: 79, height: 109, pricePerRim: 1937475, userId } }),
      // Printing Costs — per user
      db.printingCost.create({ data: { machineName: 'sm52', grammage: 0, printAreaWidth: 52, printAreaHeight: 37, pricePerColor: 65000, specialColorPrice: 80000, minimumPrintQuantity: 1000, priceAboveMinimumPerSheet: 60, platePricePerSheet: 16500, userId } }),
      db.printingCost.create({ data: { machineName: 'sm74', grammage: 0, printAreaWidth: 74, printAreaHeight: 52, pricePerColor: 130000, specialColorPrice: 160000, minimumPrintQuantity: 1000, priceAboveMinimumPerSheet: 120, platePricePerSheet: 33000, userId } }),
      // Finishings — per user
      db.finishing.create({ data: { name: 'laminating glossy', minimumSheets: 0, minimumPrice: 250000, additionalPrice: 0, pricePerCm: 0.18, userId } }),
      db.finishing.create({ data: { name: 'laminating doff', minimumSheets: 0, minimumPrice: 400000, additionalPrice: 0, pricePerCm: 0.2, userId } }),
      db.finishing.create({ data: { name: 'pond', minimumSheets: 1000, minimumPrice: 70000, additionalPrice: 40, pricePerCm: 0, userId } }),
      // Customers — per user
      db.customer.create({ data: { name: 'Budi Santoso', companyName: 'PT. Maju Jaya', address: 'Jl. Raya Industri No. 45, Surabaya', phone: '081234567890', email: 'budi@majujaya.co.id', userId } }),
      db.customer.create({ data: { name: 'Siti Rahayu', companyName: 'CV. Berkah Abadi', address: 'Jl. Gatot Subroto No. 12, Jakarta', phone: '082345678901', email: 'siti@berkahabadi.com', userId } }),
      db.customer.create({ data: { name: 'Ahmad Wijaya', companyName: 'UD. Sumber Rejeki', address: 'Jl. Diponegoro No. 78, Bandung', phone: '083456789012', email: 'ahmad@sumberrejeki.co.id', userId } }),
    ])

    seededUsers.add(userId)
    console.log(`✅ Master data seeded for user: ${userId}`)
  } catch (error) {
    console.error(`❌ Seed data error for user ${userId}:`, error)
  }
}

/**
 * Seed global data (Settings, Pengguna) — runs once per serverless instance.
 * This data is NOT user-specific and is shared across all users.
 */
async function seedGlobalData(): Promise<void> {
  // ========================
  // Seed Pengguna (Default Users)
  // Passwords match local DB: superadmin=268899, admin=268899
  // ========================
  const penggunaCount = await db.pengguna.count()
  if (penggunaCount === 0) {
    console.log('🌱 Auto-seeding Pengguna...')
    const validUntil = new Date()
    validUntil.setFullYear(validUntil.getFullYear() + 10)

    await Promise.all([
      db.pengguna.upsert({
        where: { id: 'user-superadmin' },
        update: { password: '268899' },
        create: {
          id: 'user-superadmin',
          namaLengkap: 'Super Administrator',
          nomorHP: '0000000000',
          email: 'superadmin@sistemcetak.com',
          username: 'superadmin',
          password: '268899',
          role: 'superadmin',
          validUntil,
        },
      }),
      db.pengguna.upsert({
        where: { id: 'user-admin' },
        update: { password: '268899' },
        create: {
          id: 'user-admin',
          namaLengkap: 'Administrator',
          nomorHP: '0000000001',
          email: 'admin@sistemcetak.com',
          username: 'admin',
          password: '268899',
          role: 'admin',
          validUntil,
        },
      }),
      db.pengguna.upsert({
        where: { id: 'user-koming' },
        update: { password: 'koming123' },
        create: {
          id: 'user-koming',
          namaLengkap: 'Koming',
          nomorHP: '081298765432',
          email: 'koming@sistemcetak.com',
          username: 'koming',
          password: 'koming123',
          role: 'admin',
          validUntil: new Date('2026-05-10'),
        },
      }),
    ])
    console.log('✅ Pengguna seeded')
  } else {
    // Sync default user passwords even if users already exist
    await Promise.all([
      db.pengguna.upsert({
        where: { id: 'user-superadmin' },
        update: { password: '268899', role: 'superadmin' },
        create: {
          id: 'user-superadmin',
          namaLengkap: 'Super Administrator',
          nomorHP: '0000000000',
          email: 'superadmin@sistemcetak.com',
          username: 'superadmin',
          password: '268899',
          role: 'superadmin',
          validUntil: new Date(new Date().getFullYear() + 10, 0, 1),
        },
      }),
      db.pengguna.upsert({
        where: { id: 'user-admin' },
        update: { password: '268899', role: 'admin' },
        create: {
          id: 'user-admin',
          namaLengkap: 'Administrator',
          nomorHP: '0000000001',
          email: 'admin@sistemcetak.com',
          username: 'admin',
          password: '268899',
          role: 'admin',
          validUntil: new Date(new Date().getFullYear() + 10, 0, 1),
        },
      }),
    ])
  }

  // ========================
  // Seed Settings (Pengaturan)
  // ONLY seed if missing — NEVER overwrite user-customized values
  // role_permissions is NOT seeded here — managed by Hak Akses page only
  // ========================
  console.log('🌱 Syncing settings...')

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const existing = await db.setting.findUnique({ where: { key } })
    if (!existing) {
      await db.setting.upsert({
        where: { key },
        update: { value: DEFAULT_SETTINGS[key] },
        create: { key, value: DEFAULT_SETTINGS[key] },
      })
    }
  }
  console.log('✅ Settings synced')
}

/**
 * Main entry point — ensures global data is seeded + per-user data if userId is provided.
 * Backward compatible with existing API calls.
 */
export async function ensureSeedData(userId?: string | null): Promise<void> {
  if (!globalSeedChecked) {
    globalSeedChecked = true
    try {
      await seedGlobalData()
    } catch (error) {
      console.error('❌ Global seed error:', error)
      globalSeedChecked = false
    }
  }

  // Seed per-user master data if userId is provided
  if (userId) {
    await seedUserData(userId)
  }
}
