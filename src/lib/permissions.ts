// /src/lib/permissions.ts
// Central permission system for role-based access control

// ===== FEATURE DEFINITIONS =====
const SIMPLE_FEATURES = [
  'potong-kertas', 'hitung-cetakan', 'hitung-finishing', 'riwayat', 'hak-akses', 'pengguna', 'pengaturan',
]

const GROUP_FEATURES = [
  'master-customer', 'master-harga-kertas', 'master-ongkos-cetak', 'master-finishing',
  'daftar-pengguna', 'calon-pembeli', 'pembeli',
]

const ALL_FEATURES = [...SIMPLE_FEATURES, ...GROUP_FEATURES]

// ===== DEFAULT PERMISSIONS =====
function buildDefaultPermissions(roleId: string): Record<string, boolean> {
  const perms: Record<string, boolean> = {}

  for (const f of SIMPLE_FEATURES) {
    let allowed = false
    if (roleId === 'superadmin') allowed = true
    else if (roleId === 'admin') allowed = true
    else if (roleId === 'manager') allowed = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing', 'riwayat'].includes(f)
    else if (roleId === 'demo') allowed = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing'].includes(f)
    else if (roleId === 'user') allowed = ['potong-kertas', 'hitung-cetakan', 'hitung-finishing'].includes(f)
    perms[f] = allowed
  }

  for (const g of GROUP_FEATURES) {
    let anyAllowed = false
    if (roleId === 'superadmin' || roleId === 'admin') anyAllowed = true
    else if (roleId === 'manager') anyAllowed = true
    perms[g] = anyAllowed
  }

  return perms
}

// Default sub-permissions for a role
function buildDefaultSubPermissions(roleId: string): Record<string, Record<string, boolean>> {
  const allSubs: Record<string, Record<string, boolean>> = {}

  const groupDefs = [
    { id: 'master-customer', subs: ['master-customer-lihat', 'master-customer-tambah', 'master-customer-edit', 'master-customer-hapus'] },
    { id: 'master-harga-kertas', subs: ['master-harga-kertas-lihat', 'master-harga-kertas-tambah', 'master-harga-kertas-edit', 'master-harga-kertas-hapus'] },
    { id: 'master-ongkos-cetak', subs: ['master-ongkos-cetak-lihat', 'master-ongkos-cetak-tambah', 'master-ongkos-cetak-edit', 'master-ongkos-cetak-hapus'] },
    { id: 'master-finishing', subs: ['master-finishing-lihat', 'master-finishing-tambah', 'master-finishing-edit', 'master-finishing-hapus'] },
    { id: 'daftar-pengguna', subs: ['daftar-pengguna-tambah', 'daftar-pengguna-edit', 'daftar-pengguna-hapus'] },
    { id: 'calon-pembeli', subs: ['calon-pembeli-tambah', 'calon-pembeli-edit', 'calon-pembeli-hapus', 'calon-pembeli-konversi'] },
    { id: 'pembeli', subs: ['pembeli-tambah', 'pembeli-edit', 'pembeli-hapus'] },
  ]

  for (const group of groupDefs) {
    const subs: Record<string, boolean> = {}
    const isFullAccess = roleId === 'superadmin' || roleId === 'admin'
    const isManager = roleId === 'manager'

    for (const sub of group.subs) {
      if (isFullAccess) {
        subs[sub] = true
      } else if (isManager) {
        // Manager: lihat, add and edit allowed
        subs[sub] = sub.includes('lihat') || sub.includes('tambah') || sub.includes('edit')
      } else {
        subs[sub] = false
      }
    }
    allSubs[group.id] = subs
  }

  return allSubs
}

// ===== GET PERMISSIONS FROM LOCALSTORAGE =====
interface StoredPermissionData {
  [roleId: string]: {
    features: Record<string, boolean>
    subPermissions: Record<string, Record<string, boolean>>
  }
}

function getStoredPermissionData(): StoredPermissionData | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem('permissions')
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

function setStoredPermissionData(data: StoredPermissionData) {
  if (typeof window === 'undefined') return
  localStorage.setItem('permissions', JSON.stringify(data))
}

// ===== PUBLIC API =====

/** Get all features a role can access — always merges stored with defaults so new features appear */
export function getFeaturePermissions(roleId: string): Record<string, boolean> {
  const defaults = buildDefaultPermissions(roleId)
  const stored = getStoredPermissionData()
  if (stored && stored[roleId]) {
    // Merge: stored overrides defaults, but new features from defaults are kept
    return { ...defaults, ...stored[roleId].features }
  }
  return defaults
}

/** Get sub-permissions for a role and feature — always merges with defaults */
export function getSubPermissions(roleId: string, featureId: string): Record<string, boolean> {
  const defaults = buildDefaultSubPermissions(roleId)
  const defaultSubs = defaults[featureId] || {}
  const stored = getStoredPermissionData()
  if (stored && stored[roleId]) {
    const subs = stored[roleId].subPermissions[featureId]
    if (subs) return { ...defaultSubs, ...subs }
  }
  return defaultSubs
}

/** Check if a role has page-level access to a feature */
export function hasFeatureAccess(roleId: string, featureId: string): boolean {
  return getFeaturePermissions(roleId)[featureId] || false
}

/** Check if a role has a specific sub-permission (CRUD operation) */
export function hasSubPermission(roleId: string, featureId: string, subId: string): boolean {
  return getSubPermissions(roleId, featureId)[subId] || false
}

/** Save all permissions (called from hak-akses page) */
export function saveAllPermissions(data: StoredPermissionData) {
  setStoredPermissionData(data)
  // Dispatch event so DashboardLayout can re-render sidebar immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permissions-updated'))
  }
}

/** Save permissions for a specific role */
export function saveRolePermissions(
  roleId: string,
  features: Record<string, boolean>,
  subPermissions: Record<string, Record<string, boolean>>
) {
  const stored = getStoredPermissionData() || {}
  stored[roleId] = { features, subPermissions }
  setStoredPermissionData(stored)
  // Dispatch event so DashboardLayout can re-render sidebar immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('permissions-updated'))
  }
}

/** Get default permissions for a role (used by login API) */
export function getDefaultPermissionsForRole(roleId: string) {
  return {
    features: buildDefaultPermissions(roleId),
    subPermissions: buildDefaultSubPermissions(roleId),
  }
}

/** Get ALL default permissions for all roles (used by hak-akses) */
export function getAllDefaultPermissions() {
  const roles = ['superadmin', 'admin', 'manager', 'demo', 'user']
  const data: StoredPermissionData = {}
  for (const role of roles) {
    data[role] = getDefaultPermissionsForRole(role)
  }
  return data
}

/** Map pathname to feature ID for permission checking */
export function getFeatureIdForPath(pathname: string): string | null {
  if (pathname === '/' || pathname === '/potong-kertas') return 'potong-kertas'
  if (pathname === '/hitung-cetakan') return 'hitung-cetakan'
  if (pathname === '/hitung-finishing') return 'hitung-finishing'
  if (pathname === '/master-harga-kertas') return 'master-harga-kertas'
  if (pathname === '/master-ongkos-cetak') return 'master-ongkos-cetak'
  if (pathname === '/master-finishing') return 'master-finishing'
  if (pathname === '/master-customer') return 'master-customer'
  if (pathname === '/riwayat') return 'riwayat'
  if (pathname === '/administrasi/hak-akses') return 'hak-akses'
  if (pathname === '/administrasi/pengguna') return 'pengguna'
  if (pathname === '/administrasi/pengaturan') return 'pengaturan'
  if (pathname === '/administrasi') return 'pengguna' // default to first accessible admin feature
  return null
}

export { ALL_FEATURES }
