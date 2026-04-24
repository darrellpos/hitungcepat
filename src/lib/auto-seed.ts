import { db } from '@/lib/db'

// In-memory flag to avoid repeated seeding within the same serverless instance
let globalSeedChecked = false
let dbPushDone = false

// Create tables via raw SQL if they don't exist (works in Vercel serverless)
async function ensureTablesExist(): Promise<void> {
  if (dbPushDone) return
  dbPushDone = true
  try {
    await db.$queryRaw`SELECT 1 FROM Pengguna LIMIT 1`
    console.log('✅ Database tables already exist')
    return
  } catch {
    console.log('📦 Tables not found, creating via raw SQL...')
    try {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL));
        CREATE TABLE IF NOT EXISTS "Pengguna" ("id" TEXT NOT NULL PRIMARY KEY, "namaLengkap" TEXT NOT NULL, "nomorHP" TEXT NOT NULL, "email" TEXT NOT NULL, "username" TEXT NOT NULL UNIQUE, "password" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "validUntil" TIMESTAMP(3));
        CREATE TABLE IF NOT EXISTS "Post" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "content" TEXT, "published" BOOLEAN NOT NULL DEFAULT false, "authorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "Customer" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "companyName" TEXT, "address" TEXT NOT NULL, "phone" TEXT NOT NULL, "email" TEXT NOT NULL, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "Paper" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "grammage" INTEGER NOT NULL, "width" DOUBLE PRECISION NOT NULL, "height" DOUBLE PRECISION NOT NULL, "pricePerRim" DOUBLE PRECISION NOT NULL, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "PrintingCost" ("id" TEXT NOT NULL PRIMARY KEY, "machineName" TEXT NOT NULL, "grammage" INTEGER NOT NULL, "printAreaWidth" DOUBLE PRECISION NOT NULL, "printAreaHeight" DOUBLE PRECISION NOT NULL, "pricePerColor" DOUBLE PRECISION NOT NULL, "specialColorPrice" DOUBLE PRECISION NOT NULL, "minimumPrintQuantity" INTEGER NOT NULL, "priceAboveMinimumPerSheet" DOUBLE PRECISION NOT NULL, "platePricePerSheet" DOUBLE PRECISION NOT NULL, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "Finishing" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "minimumSheets" INTEGER NOT NULL, "minimumPrice" DOUBLE PRECISION NOT NULL, "additionalPrice" DOUBLE PRECISION NOT NULL, "pricePerCm" DOUBLE PRECISION NOT NULL, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "CalonPembeli" ("id" TEXT NOT NULL PRIMARY KEY, "nama" TEXT NOT NULL, "nomorHP" TEXT NOT NULL, "email" TEXT NOT NULL, "alamat" TEXT NOT NULL, "catatan" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'baru', "role" TEXT NOT NULL DEFAULT 'demo', "expiredDate" TIMESTAMP(3), "username" TEXT, "password" TEXT, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "Pembeli" ("id" TEXT NOT NULL PRIMARY KEY, "nama" TEXT NOT NULL, "nomorHP" TEXT NOT NULL, "email" TEXT NOT NULL, "alamat" TEXT NOT NULL, "catatan" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'demo', "expiredDate" TIMESTAMP(3), "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "Setting" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL UNIQUE, "value" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
        CREATE TABLE IF NOT EXISTS "RiwayatCetakan" ("id" TEXT NOT NULL PRIMARY KEY, "printName" TEXT NOT NULL, "customerName" TEXT NOT NULL DEFAULT '', "paperName" TEXT NOT NULL, "paperGrammage" TEXT NOT NULL, "paperLength" TEXT NOT NULL, "paperWidth" TEXT NOT NULL, "cutWidth" TEXT NOT NULL, "cutHeight" TEXT NOT NULL, "quantity" TEXT NOT NULL, "warna" TEXT NOT NULL, "warnaKhusus" TEXT NOT NULL, "machineName" TEXT NOT NULL, "hargaPlat" DOUBLE PRECISION NOT NULL, "ongkosCetak" DOUBLE PRECISION NOT NULL, "ongkosCetakDetail" TEXT NOT NULL, "machineName2" TEXT NOT NULL DEFAULT '', "ongkosCetak2" DOUBLE PRECISION NOT NULL DEFAULT 0, "ongkosCetak2Detail" TEXT NOT NULL DEFAULT '', "totalPaperPrice" DOUBLE PRECISION NOT NULL, "finishingNames" TEXT NOT NULL, "finishingBreakdown" TEXT NOT NULL, "finishingCost" DOUBLE PRECISION NOT NULL, "packingCost" DOUBLE PRECISION NOT NULL, "shippingCost" DOUBLE PRECISION NOT NULL, "otherCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "glueCost" DOUBLE PRECISION NOT NULL DEFAULT 0, "glueBorongan" DOUBLE PRECISION NOT NULL DEFAULT 0, "subTotal" DOUBLE PRECISION NOT NULL, "profitPercent" DOUBLE PRECISION NOT NULL, "profitAmount" DOUBLE PRECISION NOT NULL, "grandTotal" DOUBLE PRECISION NOT NULL, "userId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
      `)
      console.log('✅ Database tables created via raw SQL')
    } catch (err: any) {
      console.error('⚠️ Failed to create tables:', err?.message || err)
    }
  }
}

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
  // Theme colors
  theme_sidebar_color: '#FF8A80',
  theme_bg_color: '#f8fafc',
  theme_popup_color: '#ffffff',
  theme_banner_color: '#ffffff',
  theme_login_color: '#EFF6FF',
  app_language: 'id',
  app_font_size: 'medium',
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
  // First, ensure database tables exist (only runs once per instance)
  await ensureTablesExist()

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
