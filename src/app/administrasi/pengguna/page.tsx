'use client'

import { Users, Plus, Search, Eye, EyeOff, Bell, UserPlus, ShoppingCart, UserCheck, Phone, Mail, MapPin, StickyNote, CheckCircle, Clock, XCircle, Loader2, Link2, Unlink, KeyRound } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { MobileTable } from '@/components/mobile-table'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { getAuthUser } from '@/lib/auth'
import { hasSubPermission } from '@/lib/permissions'
import { useLanguage } from '@/contexts/language-context'

// ==================== TYPES ====================

interface Pengguna {
  id: string
  namaLengkap: string
  nomorHP: string
  email: string
  username: string
  password: string
  role: string
  createdAt: string
  validUntil: string | null
}

interface CalonPembeli {
  id: string
  nama: string
  nomorHP: string
  email: string
  alamat: string
  catatan: string
  status: string
  role: string
  expiredDate: string | null
  createdAt: string
  updatedAt: string
  username: string | null
  password: string | null
}

interface Pembeli {
  id: string
  nama: string
  nomorHP: string
  email: string
  alamat: string
  catatan: string
  role: string
  expiredDate: string | null
  createdAt: string
  updatedAt: string
}

// ==================== CONSTANTS ====================

const ROLE_OPTIONS = ['superadmin', 'admin', 'manager', 'demo', 'user']

const roleColors: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700',
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-emerald-100 text-emerald-700',
  demo: 'bg-amber-100 text-amber-700',
  user: 'bg-blue-100 text-blue-700',
}

const calonStatusColors: Record<string, string> = {
  baru: 'bg-blue-100 text-blue-700',
  diproses: 'bg-amber-100 text-amber-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  batal: 'bg-red-100 text-red-700',
}

const calonStatusIcons: Record<string, any> = {
  baru: Clock,
  diproses: Loader2,
  selesai: CheckCircle,
  batal: XCircle,
}

const CALON_STATUS_OPTIONS = [
  { value: 'baru', label: 'Baru' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'batal', label: 'Batal' },
]

// ==================== HELPERS ====================

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getUserStatus = (validUntil: string | null) => {
  if (!validUntil) return 'Tidak terbatas'
  return new Date(validUntil) > new Date() ? 'Aktif' : 'Kadaluarsa'
}

const getUserStatusColor = (validUntil: string | null) => {
  if (!validUntil) return 'bg-blue-100 text-blue-700'
  return new Date(validUntil) > new Date()
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-red-100 text-red-700'
}

// ==================== MAIN COMPONENT ====================

export default function PenggunaPage() {
  // Permission checks
  const currentUser = getAuthUser()
  const { t } = useLanguage()

  // Daftar Pengguna
  const canAddUser = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'daftar-pengguna', 'daftar-pengguna-tambah')
  const canEditUser = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'daftar-pengguna', 'daftar-pengguna-edit')
  const canDeleteUser = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'daftar-pengguna', 'daftar-pengguna-hapus')

  // Calon Pembeli
  const canAddCalon = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'calon-pembeli', 'calon-pembeli-tambah')
  const canEditCalon = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'calon-pembeli', 'calon-pembeli-edit')
  const canDeleteCalon = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'calon-pembeli', 'calon-pembeli-hapus')
  const canConvertCalon = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'calon-pembeli', 'calon-pembeli-konversi')

  // Pembeli
  const canAddPembeli = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'pembeli', 'pembeli-tambah')
  const canEditPembeli = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'pembeli', 'pembeli-edit')
  const canDeletePembeli = currentUser?.role === 'superadmin' || hasSubPermission(currentUser?.role || '', 'pembeli', 'pembeli-hapus')

  // Data states
  const [penggunaList, setPenggunaList] = useState<Pengguna[]>([])
  const [calonList, setCalonList] = useState<CalonPembeli[]>([])
  const [pembeliList, setPembeliList] = useState<Pembeli[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // User dialog state
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Pengguna | null>(null)
  const [formNamaLengkap, setFormNamaLengkap] = useState('')
  const [formNomorHP, setFormNomorHP] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formUsername, setFormUsername] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('')
  const [formValidUntil, setFormValidUntil] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  // Calon dialog state
  const [calonDialogOpen, setCalonDialogOpen] = useState(false)
  const [editingCalon, setEditingCalon] = useState<CalonPembeli | null>(null)
  const [calonNama, setCalonNama] = useState('')
  const [calonNomorHP, setCalonNomorHP] = useState('')
  const [calonEmail, setCalonEmail] = useState('')
  const [calonAlamat, setCalonAlamat] = useState('')
  const [calonCatatan, setCalonCatatan] = useState('')
  const [calonStatus, setCalonStatus] = useState('baru')
  const [calonRole, setCalonRole] = useState('demo')
  const [calonExpiredDate, setCalonExpiredDate] = useState('')
  const [calonSaving, setCalonSaving] = useState(false)

  // Pembeli dialog state
  const [pembeliDialogOpen, setPembeliDialogOpen] = useState(false)
  const [editingPembeli, setEditingPembeli] = useState<Pembeli | null>(null)
  const [pembeliNama, setPembeliNama] = useState('')
  const [pembeliNomorHP, setPembeliNomorHP] = useState('')
  const [pembeliEmail, setPembeliEmail] = useState('')
  const [pembeliAlamat, setPembeliAlamat] = useState('')
  const [pembeliCatatan, setPembeliCatatan] = useState('')
  const [pembeliRole, setPembeliRole] = useState('demo')
  const [pembeliExpiredDate, setPembeliExpiredDate] = useState('')
  const [pembeliSaving, setPembeliSaving] = useState(false)

  // Add Account dialog state
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false)
  const [addAccountPembeli, setAddAccountPembeli] = useState<Pembeli | null>(null)
  const [addAccountUsername, setAddAccountUsername] = useState('')
  const [addAccountPassword, setAddAccountPassword] = useState('')
  const [addAccountRole, setAddAccountRole] = useState('demo')
  const [addAccountExpiredDate, setAddAccountExpiredDate] = useState('')
  const [addAccountSaving, setAddAccountSaving] = useState(false)
  const [addAccountShowPassword, setAddAccountShowPassword] = useState(false)

  // Linked accounts dialog state
  const [linkedAccountsDialogOpen, setLinkedAccountsDialogOpen] = useState(false)
  const [linkedAccountsPembeli, setLinkedAccountsPembeli] = useState<Pembeli | null>(null)
  const [linkedAccountsList, setLinkedAccountsList] = useState<any[]>([])
  const [linkedAccountsLoading, setLinkedAccountsLoading] = useState(false)

  // ==================== FETCH DATA ====================

  const fetchAll = useCallback(async () => {
    try {
      const [resPengguna, resCalon, resPembeli] = await Promise.all([
        fetch('/api/pengguna'),
        fetch('/api/calon-pembeli'),
        fetch('/api/pembeli'),
      ])

      if (resPengguna.ok) setPenggunaList(await resPengguna.json())
      if (resCalon.ok) setCalonList(await resCalon.json())
      if (resPembeli.ok) setPembeliList(await resPembeli.json())
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }, [])

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [])

  // ==================== USER CRUD ====================

  const filteredUsers = penggunaList.filter(user =>
    user.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const resetUserForm = () => {
    setFormNamaLengkap('')
    setFormNomorHP('')
    setFormEmail('')
    setFormUsername('')
    setFormPassword('')
    setFormRole('')
    setFormValidUntil('')
    setShowPassword(false)
    setEditingUser(null)
  }

  const handleAddUser = () => {
    resetUserForm()
    setUserDialogOpen(true)
  }

  const handleEditUser = (user: Pengguna) => {
    setEditingUser(user)
    setFormNamaLengkap(user.namaLengkap)
    setFormNomorHP(user.nomorHP)
    setFormEmail(user.email)
    setFormUsername(user.username)
    setFormPassword('')
    setFormRole(user.role)
    setFormValidUntil(user.validUntil ? new Date(user.validUntil).toISOString().split('T')[0] : '')
    setShowPassword(false)
    setUserDialogOpen(true)
  }

  const handleDeleteUser = async (user: Pengguna) => {
    if (user.username === 'admin' || user.username === 'superadmin') {
      toast.error('Tidak dapat menghapus user ini')
      return
    }
    if (confirm(`Apakah Anda yakin ingin menghapus user "${user.namaLengkap}"?`)) {
      try {
        const res = await fetch(`/api/pengguna?id=${user.id}`, { method: 'DELETE' })
        if (res.ok) {
          setPenggunaList(prev => prev.filter(u => u.id !== user.id))
          toast.success('User berhasil dihapus')
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menghapus user')
        }
      } catch {
        toast.error('Terjadi kesalahan jaringan')
      }
    }
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formNamaLengkap.trim() || !formUsername.trim() || !formRole) {
      toast.error('Nama lengkap, username, dan role wajib diisi')
      return
    }
    setSaving(true)
    try {
      if (editingUser) {
        const res = await fetch('/api/pengguna', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            namaLengkap: formNamaLengkap.trim(),
            nomorHP: formNomorHP.trim(),
            email: formEmail.trim(),
            username: formUsername.trim(),
            password: formPassword || undefined,
            role: formRole,
            validUntil: formValidUntil || undefined,
          })
        })
        if (res.ok) {
          toast.success('User berhasil diperbarui')
          fetchAll()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal memperbarui user')
        }
      } else {
        if (!formPassword) {
          toast.error('Password wajib diisi untuk pengguna baru')
          setSaving(false)
          return
        }
        const res = await fetch('/api/pengguna', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namaLengkap: formNamaLengkap.trim(),
            nomorHP: formNomorHP.trim(),
            email: formEmail.trim(),
            username: formUsername.trim(),
            password: formPassword,
            role: formRole,
          })
        })
        if (res.ok) {
          toast.success('User berhasil ditambahkan')
          fetchAll()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menambahkan user')
        }
      }
      setUserDialogOpen(false)
      resetUserForm()
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSaving(false)
    }
  }

  // ==================== CALON PEMBELI CRUD ====================

  const resetCalonForm = () => {
    setCalonNama('')
    setCalonNomorHP('')
    setCalonEmail('')
    setCalonAlamat('')
    setCalonCatatan('')
    setCalonStatus('baru')
    setCalonRole('demo')
    setCalonExpiredDate('')
    setEditingCalon(null)
  }

  const handleAddCalon = () => {
    resetCalonForm()
    setCalonDialogOpen(true)
  }

  const handleEditCalon = (item: CalonPembeli) => {
    setEditingCalon(item)
    setCalonNama(item.nama)
    setCalonNomorHP(item.nomorHP)
    setCalonEmail(item.email)
    setCalonAlamat(item.alamat)
    setCalonCatatan(item.catatan)
    setCalonStatus(item.status)
    setCalonRole(item.role)
    setCalonExpiredDate(item.expiredDate ? new Date(item.expiredDate).toISOString().split('T')[0] : '')
    setCalonDialogOpen(true)
  }

  const handleDeleteCalon = async (item: CalonPembeli) => {
    if (confirm(`Hapus calon pembeli "${item.nama}"?`)) {
      try {
        const res = await fetch(`/api/calon-pembeli?id=${item.id}`, { method: 'DELETE' })
        if (res.ok) {
          setCalonList(prev => prev.filter(c => c.id !== item.id))
          toast.success('Calon pembeli berhasil dihapus')
        } else {
          toast.error('Gagal menghapus calon pembeli')
        }
      } catch {
        toast.error('Terjadi kesalahan jaringan')
      }
    }
  }

  const handleConvertToPembeli = async (item: CalonPembeli) => {
    if (!confirm(`Konversi "${item.nama}" menjadi pembeli?`)) return
    setCalonSaving(true)
    try {
      const [resCreate, resDelete] = await Promise.all([
        fetch('/api/pembeli', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: item.nama,
            nomorHP: item.nomorHP,
            email: item.email,
            alamat: item.alamat,
            catatan: `Dikonversi dari calon pembeli. ${item.catatan}`,
            role: 'user',
            expiredDate: item.expiredDate || null,
          })
        }),
        fetch(`/api/calon-pembeli?id=${item.id}`, { method: 'DELETE' }),
      ])

      if (resCreate.ok && resDelete.ok) {
        fetchAll()
        toast.success(`"${item.nama}" berhasil dikonversi menjadi pembeli`)
      } else {
        toast.error('Gagal mengkonversi calon pembeli')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setCalonSaving(false)
    }
  }

  const handleSaveCalon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calonNama.trim() || !calonNomorHP.trim()) {
      toast.error('Nama dan nomor HP wajib diisi')
      return
    }
    setCalonSaving(true)
    try {
      if (editingCalon) {
        const res = await fetch('/api/calon-pembeli', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCalon.id,
            nama: calonNama.trim(),
            nomorHP: calonNomorHP.trim(),
            email: calonEmail.trim(),
            alamat: calonAlamat.trim(),
            catatan: calonCatatan.trim(),
            status: calonStatus,
            role: calonRole,
            expiredDate: calonExpiredDate || null,
          })
        })
        if (res.ok) {
          toast.success('Calon pembeli berhasil diperbarui')
          fetchAll()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal memperbarui')
        }
      } else {
        const res = await fetch('/api/calon-pembeli', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: calonNama.trim(),
            nomorHP: calonNomorHP.trim(),
            email: calonEmail.trim(),
            alamat: calonAlamat.trim(),
            catatan: calonCatatan.trim(),
            status: calonStatus,
            role: calonRole,
            expiredDate: calonExpiredDate || null,
          })
        })
        if (res.ok) {
          toast.success('Calon pembeli berhasil ditambahkan')
          fetchAll()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menambahkan')
        }
      }
      setCalonDialogOpen(false)
      resetCalonForm()
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setCalonSaving(false)
    }
  }

  // ==================== PEMBELI CRUD ====================

  const resetPembeliForm = () => {
    setPembeliNama('')
    setPembeliNomorHP('')
    setPembeliEmail('')
    setPembeliAlamat('')
    setPembeliCatatan('')
    setPembeliRole('demo')
    setPembeliExpiredDate('')
    setEditingPembeli(null)
  }

  const handleAddPembeli = () => {
    resetPembeliForm()
    setPembeliDialogOpen(true)
  }

  const handleEditPembeli = (item: Pembeli) => {
    setEditingPembeli(item)
    setPembeliNama(item.nama)
    setPembeliNomorHP(item.nomorHP)
    setPembeliEmail(item.email)
    setPembeliAlamat(item.alamat)
    setPembeliCatatan(item.catatan)
    setPembeliRole(item.role || 'demo')
    setPembeliExpiredDate(item.expiredDate ? new Date(item.expiredDate).toISOString().split('T')[0] : '')
    setPembeliDialogOpen(true)
  }

  const handleDeletePembeli = async (item: Pembeli) => {
    if (confirm(`Hapus pembeli "${item.nama}"?`)) {
      try {
        const res = await fetch(`/api/pembeli?id=${item.id}`, { method: 'DELETE' })
        if (res.ok) {
          setPembeliList(prev => prev.filter(p => p.id !== item.id))
          toast.success('Pembeli berhasil dihapus')
        } else {
          toast.error('Gagal menghapus pembeli')
        }
      } catch {
        toast.error('Terjadi kesalahan jaringan')
      }
    }
  }

  const handleSavePembeli = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pembeliNama.trim() || !pembeliNomorHP.trim()) {
      toast.error('Nama dan nomor HP wajib diisi')
      return
    }
    setPembeliSaving(true)
    try {
      if (editingPembeli) {
        const res = await fetch('/api/pembeli', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingPembeli.id,
            nama: pembeliNama.trim(),
            nomorHP: pembeliNomorHP.trim(),
            email: pembeliEmail.trim(),
            alamat: pembeliAlamat.trim(),
            catatan: pembeliCatatan.trim(),
            role: pembeliRole,
            expiredDate: pembeliExpiredDate || null,
          })
        })
        if (res.ok) {
          toast.success('Pembeli berhasil diperbarui')
          fetchAll()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal memperbarui')
        }
      } else {
        const res = await fetch('/api/pembeli', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: pembeliNama.trim(),
            nomorHP: pembeliNomorHP.trim(),
            email: pembeliEmail.trim(),
            alamat: pembeliAlamat.trim(),
            catatan: pembeliCatatan.trim(),
            role: pembeliRole,
            expiredDate: pembeliExpiredDate || null,
          })
        })
        if (res.ok) {
          toast.success('Pembeli berhasil ditambahkan')
          fetchAll()
        } else {
          const data = await res.json()
          toast.error(data.error || 'Gagal menambahkan')
        }
      }
      setPembeliDialogOpen(false)
      resetPembeliForm()
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setPembeliSaving(false)
    }
  }

  // ==================== ADD ACCOUNT TO PEMBELI ====================

  const handleOpenAddAccount = (item: Pembeli) => {
    setAddAccountPembeli(item)
    setAddAccountUsername('')
    setAddAccountPassword('')
    setAddAccountRole(item.role || 'demo')
    setAddAccountExpiredDate(item.expiredDate ? new Date(item.expiredDate).toISOString().split('T')[0] : '')
    setAddAccountShowPassword(false)
    setAddAccountDialogOpen(true)
  }

  const handleSaveAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addAccountPembeli || !addAccountUsername.trim() || !addAccountPassword) {
      toast.error('Username dan password wajib diisi')
      return
    }
    setAddAccountSaving(true)
    try {
      const res = await fetch('/api/pembeli/add-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pembeliId: addAccountPembeli.id,
          username: addAccountUsername.trim(),
          password: addAccountPassword,
          role: addAccountRole,
          expiredDate: addAccountExpiredDate || null,
        })
      })
      if (res.ok) {
        toast.success(`Akun "${addAccountUsername.trim()}" berhasil ditambahkan ke ${addAccountPembeli.nama}`)
        setAddAccountDialogOpen(false)
        fetchAll()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Gagal menambahkan akun')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setAddAccountSaving(false)
    }
  }

  // ==================== VIEW LINKED ACCOUNTS ====================

  const handleViewLinkedAccounts = async (item: Pembeli) => {
    setLinkedAccountsPembeli(item)
    setLinkedAccountsDialogOpen(true)
    setLinkedAccountsLoading(true)
    try {
      const res = await fetch(`/api/pembeli/linked-accounts?pembeliId=${item.id}`)
      if (res.ok) {
        setLinkedAccountsList(await res.json())
      } else {
        setLinkedAccountsList([])
      }
    } catch {
      setLinkedAccountsList([])
    } finally {
      setLinkedAccountsLoading(false)
    }
  }

  // ==================== USER TABLE COLUMNS ====================

  const userColumns = [
    {
      key: 'username',
      title: 'Username',
      render: (user: Pengguna) => (
        <span className="text-slate-600">@{user.username}</span>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (user: Pengguna) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleColors[user.role] || 'bg-slate-100 text-slate-700'}`}>
          {user.role}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: 'Tanggal Dibuat',
      render: (user: Pengguna) => (
        <span className="text-sm text-slate-600">{formatDate(user.createdAt)}</span>
      )
    },
    {
      key: 'validUntil',
      title: 'Berlaku s/d',
      render: (user: Pengguna) => (
        <span className="text-sm text-slate-600">{user.validUntil ? formatDate(user.validUntil) : <span className="italic text-slate-400">{t('tidak_ada_masa_berlaku')}</span>}</span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (user: Pengguna) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getUserStatusColor(user.validUntil)}`}>
          {getUserStatus(user.validUntil)}
        </span>
      )
    },
  ]

  // ==================== CALON PEMBELI COLUMNS ====================

  const calonColumns = [
    {
      key: 'nama',
      title: 'Username',
      render: (item: CalonPembeli) => (
        <span className="font-medium text-slate-800">{item.username || item.nama}</span>
      )
    },
    {
      key: 'nomorHP',
      title: 'No. HP',
      render: (item: CalonPembeli) => (
        <span className="text-slate-600">{item.nomorHP}</span>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (item: CalonPembeli) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleColors[item.role] || 'bg-slate-100 text-slate-700'}`}>
          {item.role}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: CalonPembeli) => {
        const StatusIcon = calonStatusIcons[item.status] || Clock
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${calonStatusColors[item.status] || 'bg-slate-100 text-slate-700'}`}>
            <StatusIcon className="w-3 h-3" />
            {item.status}
          </span>
        )
      }
    },
    {
      key: 'createdAt',
      title: 'Tanggal Dibuat',
      render: (item: CalonPembeli) => (
        <span className="text-sm text-slate-600">{formatDate(item.createdAt)}</span>
      )
    },
    {
      key: 'expiredDate',
      title: 'Expired Date',
      render: (item: CalonPembeli) => {
        if (!item.expiredDate) return <span className="italic text-slate-400">-</span>
        const isExpired = new Date(item.expiredDate) < new Date()
        return (
          <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
            {formatDate(item.expiredDate)}
          </span>
        )
      }
    },
  ]

  // ==================== PEMBELI COLUMNS ====================

  const pembeliColumns = [
    {
      key: 'nama',
      title: 'Nama',
      render: (item: Pembeli) => (
        <span className="font-medium text-slate-800">{item.nama}</span>
      )
    },
    {
      key: 'username',
      title: 'User Name',
      render: (item: Pembeli) => (
        <span className="text-slate-600">{item.email?.split('@')[0] || '-'}</span>
      )
    },
    {
      key: 'nomorHP',
      title: 'No. HP',
      render: (item: Pembeli) => (
        <span className="text-slate-600">{item.nomorHP}</span>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (item: Pembeli) => (
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleColors[item.role] || 'bg-slate-100 text-slate-700'}`}>
          {item.role}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: Pembeli) => {
        if (!item.expiredDate) {
          return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700`}>
              <CheckCircle className="w-3 h-3" />
              Aktif
            </span>
          )
        }
        const isExpired = new Date(item.expiredDate) < new Date()
        if (isExpired) {
          return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700`}>
              <XCircle className="w-3 h-3" />
              Kadaluarsa
            </span>
          )
        }
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700`}>
            <CheckCircle className="w-3 h-3" />
            Aktif
          </span>
        )
      }
    },
    {
      key: 'createdAt',
      title: 'Tanggal Dibuat',
      render: (item: Pembeli) => (
        <span className="text-sm text-slate-600">{formatDate(item.createdAt)}</span>
      )
    },
    {
      key: 'expiredDate',
      title: 'Expired Date',
      render: (item: Pembeli) => {
        if (!item.expiredDate) return <span className="italic text-slate-400">-</span>
        const isExpired = new Date(item.expiredDate) < new Date()
        return (
          <span className={`text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
            {formatDate(item.expiredDate)}
          </span>
        )
      }
    },
    {
      key: 'akun',
      title: 'Akun Terhubung',
      render: (item: Pembeli) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2"
          onClick={(e) => { e.stopPropagation(); handleViewLinkedAccounts(item) }}
        >
          <Link2 className="w-3 h-3 mr-1" />
          Lihat Akun
        </Button>
      ),
    },
  ]

  // ==================== RENDER ====================

  return (
    <DashboardLayout
      title={t('pengguna_pembeli')}
      subtitle={t('subtitle_pengguna')}
    >
      <div className="space-y-8">

        {/* ===== SECTION 1: DAFTAR USER/ADMIN ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Daftar User / Admin
                </h2>
                <p className="text-sm text-slate-500 mt-1">Kelola akun pengguna aplikasi</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari pengguna..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {canAddUser && (
                <Button onClick={handleAddUser} className="whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah User
                </Button>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-sm text-slate-500">Memuat data...</span>
              </div>
            ) : (
              <MobileTable
                data={filteredUsers}
                columns={userColumns}
                keyField="id"
                onEdit={canEditUser ? handleEditUser : undefined}
                onDelete={canDeleteUser ? handleDeleteUser : undefined}
                showAsButtons
                emptyMessage="Tidak ada pengguna ditemukan"
                emptyIcon={<Users className="w-12 h-12 mx-auto text-slate-400" />}
              />
            )}
          </div>
        </div>

        {/* ===== SECTION 2: CALON PEMBELI ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  Calon Pembeli
                </h2>
                <p className="text-sm text-slate-500 mt-1">Data prospek dan calon pelanggan baru</p>
              </div>
              {canAddCalon && (
              <Button onClick={handleAddCalon} variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Calon Pembeli
              </Button>
              )}
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                <span className="ml-3 text-sm text-slate-500">Memuat data...</span>
              </div>
            ) : (
              <MobileTable
                data={calonList}
                columns={calonColumns}
                keyField="id"
                onEdit={canEditCalon ? handleEditCalon : undefined}
                onDelete={canDeleteCalon ? handleDeleteCalon : undefined}
                showAsButtons
                emptyMessage="Belum ada calon pembeli"
                emptyIcon={<UserPlus className="w-12 h-12 mx-auto text-slate-400" />}
                extraActions={canConvertCalon ? (item: CalonPembeli) => (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleConvertToPembeli(item)
                    }}
                  >
                    <UserCheck className="w-3 h-3 mr-1" />
                    Konversi
                  </Button>
                ) : undefined}
              />
            )}
          </div>
        </div>

        {/* ===== SECTION 3: DAFTAR PEMBELI ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-600" />
                  Daftar Pembeli
                </h2>
                <p className="text-sm text-slate-500 mt-1">Data pelanggan yang sudah bertransaksi</p>
              </div>
              {canAddPembeli && (
              <div className="flex items-center gap-2">
                <Button onClick={handleAddPembeli} className="bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap">
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Pembeli
                </Button>
              </div>
              )}
            </div>
          </div>
          <div className="p-4 lg:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                <span className="ml-3 text-sm text-slate-500">Memuat data...</span>
              </div>
            ) : (
              <MobileTable
                data={pembeliList}
                columns={pembeliColumns}
                keyField="id"
                onEdit={canEditPembeli ? handleEditPembeli : undefined}
                onDelete={canDeletePembeli ? handleDeletePembeli : undefined}
                showAsButtons
                emptyMessage="Belum ada data pembeli"
                emptyIcon={<ShoppingCart className="w-12 h-12 mx-auto text-slate-400" />}
                extraActions={(item: Pembeli) => canAddPembeli ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenAddAccount(item) }}
                    className="text-violet-600 border-violet-300 hover:bg-violet-50 text-xs"
                  >
                    <KeyRound className="w-3 h-3 mr-1" />
                    Tambah Akun
                  </button>
                ) : undefined}
              />
            )}
          </div>
        </div>

      </div>

      {/* ===== DIALOG: TAMBAH/EDIT USER ===== */}
      <Dialog open={userDialogOpen} onOpenChange={(open) => { if (!open) resetUserForm(); setUserDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Ubah data pengguna. Kosongkan password jika tidak ingin mengubah.' : 'Isi data pengguna baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveUser}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="u-namaLengkap">{t('nama_lengkap')}</Label>
                <Input id="u-namaLengkap" type="text" placeholder="Masukkan nama lengkap" required value={formNamaLengkap} onChange={(e) => setFormNamaLengkap(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="u-nomorHP">Nomor Handphone</Label>
                <Input id="u-nomorHP" type="tel" placeholder="081234567890" value={formNomorHP} onChange={(e) => setFormNomorHP(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="u-email">Email</Label>
                <Input id="u-email" type="email" placeholder="email@contoh.com" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="u-username">Username</Label>
                <Input id="u-username" type="text" placeholder="Masukkan username" required value={formUsername} onChange={(e) => setFormUsername(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="u-password">Password {editingUser && <span className="text-xs text-slate-400 font-normal">(kosongkan jika tidak diubah)</span>}</Label>
                <div className="relative">
                  <Input id="u-password" type={showPassword ? 'text' : 'password'} placeholder={editingUser ? '••••••••' : 'Masukkan password'} required={!editingUser} value={formPassword} onChange={(e) => setFormPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={formRole} onValueChange={setFormRole} required>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingUser && (
                <div className="grid gap-2">
                  <Label htmlFor="u-validUntil">Berlaku s/d</Label>
                  <Input
                    id="u-validUntil"
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Kosongkan untuk tidak ada masa berlaku (tidak terbatas)</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetUserForm(); setUserDialogOpen(false) }}>{t('batal')}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Menyimpan...</>) : (editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: TAMBAH/EDIT CALON PEMBELI ===== */}
      <Dialog open={calonDialogOpen} onOpenChange={(open) => { if (!open) resetCalonForm(); setCalonDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCalon ? 'Edit Calon Pembeli' : 'Tambah Calon Pembeli'}</DialogTitle>
            <DialogDescription>
              {editingCalon ? 'Ubah data calon pembeli.' : 'Tambah data prospek atau calon pelanggan baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCalon}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="c-nama">{t('nama_label')}</Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="c-nama" type="text" placeholder="Nama calon pembeli" required value={calonNama} onChange={(e) => setCalonNama(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-hp">Nomor Handphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="c-hp" type="tel" placeholder="081234567890" required value={calonNomorHP} onChange={(e) => setCalonNomorHP(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="c-email" type="email" placeholder="email@contoh.com" value={calonEmail} onChange={(e) => setCalonEmail(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-alamat">Alamat</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    id="c-alamat"
                    placeholder="Alamat lengkap"
                    value={calonAlamat}
                    onChange={(e) => setCalonAlamat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={calonRole} onValueChange={setCalonRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={calonStatus} onValueChange={setCalonStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CALON_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-expiredDate">Expired Date</Label>
                <Input id="c-expiredDate" type="date" value={calonExpiredDate} onChange={(e) => setCalonExpiredDate(e.target.value)} />
                <p className="text-xs text-slate-400">Kosongkan untuk tidak ada masa kadaluarsa</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-catatan">Catatan</Label>
                <div className="relative">
                  <StickyNote className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    id="c-catatan"
                    placeholder="Catatan tambahan (opsional)"
                    value={calonCatatan}
                    onChange={(e) => setCalonCatatan(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetCalonForm(); setCalonDialogOpen(false) }}>{t('batal')}</Button>
              <Button type="submit" disabled={calonSaving}>
                {calonSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Menyimpan...</>) : (editingCalon ? 'Simpan Perubahan' : 'Tambah Calon Pembeli')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: TAMBAH/EDIT PEMBELI ===== */}
      <Dialog open={pembeliDialogOpen} onOpenChange={(open) => { if (!open) resetPembeliForm(); setPembeliDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingPembeli ? 'Edit Pembeli' : 'Tambah Pembeli'}</DialogTitle>
            <DialogDescription>
              {editingPembeli ? 'Ubah data pembeli.' : 'Tambah data pelanggan baru.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePembeli}>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="p-nama">{t('nama_label')}</Label>
                <div className="relative">
                  <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="p-nama" type="text" placeholder="Nama pembeli" required value={pembeliNama} onChange={(e) => setPembeliNama(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-hp">Nomor Handphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="p-hp" type="tel" placeholder="081234567890" required value={pembeliNomorHP} onChange={(e) => setPembeliNomorHP(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="p-email" type="email" placeholder="email@contoh.com" value={pembeliEmail} onChange={(e) => setPembeliEmail(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-alamat">Alamat</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    id="p-alamat"
                    placeholder="Alamat lengkap"
                    value={pembeliAlamat}
                    onChange={(e) => setPembeliAlamat(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-catatan">Catatan</Label>
                <div className="relative">
                  <StickyNote className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    id="p-catatan"
                    placeholder="Catatan tambahan (opsional)"
                    value={pembeliCatatan}
                    onChange={(e) => setPembeliCatatan(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={pembeliRole} onValueChange={setPembeliRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="p-expiredDate">Expired Date</Label>
                  <Input id="p-expiredDate" type="date" value={pembeliExpiredDate} onChange={(e) => setPembeliExpiredDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetPembeliForm(); setPembeliDialogOpen(false) }}>{t('batal')}</Button>
              <Button type="submit" disabled={pembeliSaving} className="bg-emerald-600 hover:bg-emerald-700">
                {pembeliSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Menyimpan...</>) : (editingPembeli ? 'Simpan Perubahan' : 'Tambah Pembeli')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: TAMBAH AKUN TERHUBUNG ===== */}
      <Dialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-violet-600" />
              Tambah Akun Terhubung
            </DialogTitle>
            <DialogDescription>
              Buat akun login baru yang terhubung dengan pembeli <strong className="text-violet-700">{addAccountPembeli?.nama}</strong>. Data antar akun akan saling terhubung.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAddAccount}>
            <div className="grid gap-4 py-4">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-xs font-medium text-violet-700">Pembeli</p>
                <p className="text-sm font-bold text-violet-800">{addAccountPembeli?.nama}</p>
                <p className="text-xs text-violet-500">{addAccountPembeli?.nomorHP}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aa-username">Username <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input id="aa-username" type="text" placeholder="Minimal 3 karakter" required minLength={3} value={addAccountUsername} onChange={(e) => setAddAccountUsername(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="aa-password">Password <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Input id="aa-password" type={addAccountShowPassword ? 'text' : 'password'} placeholder="Minimal 6 karakter" required minLength={6} value={addAccountPassword} onChange={(e) => setAddAccountPassword(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setAddAccountShowPassword(!addAccountShowPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" tabIndex={-1}>
                    {addAccountShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={addAccountRole} onValueChange={setAddAccountRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aa-expired">Expired Date</Label>
                  <Input id="aa-expired" type="date" value={addAccountExpiredDate} onChange={(e) => setAddAccountExpiredDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddAccountDialogOpen(false)}>{t('batal')}</Button>
              <Button type="submit" disabled={addAccountSaving} className="bg-violet-600 hover:bg-violet-700">
                {addAccountSaving ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Menyimpan...</>) : 'Tambah Akun'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG: LIHAT AKUN TERHUBUNG ===== */}
      <Dialog open={linkedAccountsDialogOpen} onOpenChange={setLinkedAccountsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Akun Terhubung
            </DialogTitle>
            <DialogDescription>
              Daftar akun login yang terhubung dengan <strong className="text-blue-700">{linkedAccountsPembeli?.nama}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {linkedAccountsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-slate-500">Memuat...</span>
              </div>
            ) : linkedAccountsList.length === 0 ? (
              <div className="text-center py-8">
                <Unlink className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">Belum ada akun yang terhubung</p>
                <p className="text-xs text-slate-400 mt-1">Klik tombol "Tambah Akun" untuk menambahkan</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {linkedAccountsList.map((acc: any) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{acc.username}</p>
                        <p className="text-xs text-slate-500">{acc.namaLengkap}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${roleColors[acc.role] || 'bg-slate-100 text-slate-700'}`}>
                        {acc.role}
                      </span>
                      {acc.validUntil && (
                        <p className={`text-[10px] mt-0.5 ${new Date(acc.validUntil) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                          {new Date(acc.validUntil) < new Date() ? 'Expired' : `s/d ${formatDate(acc.validUntil)}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {linkedAccountsPembeli && canAddPembeli && (
            <DialogFooter>
              <Button
                type="button"
                onClick={() => { setLinkedAccountsDialogOpen(false); handleOpenAddAccount(linkedAccountsPembeli) }}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Tambah Akun Baru
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
