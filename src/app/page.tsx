'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CreditCard, Smartphone, Building2, ChevronRight, Shield, Check,
  Bell, BellOff, RefreshCw, X, Menu, Home, Crown, Receipt,
  BarChart3, Users, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, Clock, Zap, Star, Eye, Trash2, Plus, ArrowRight,
  Loader2, ChevronDown, ChevronUp, Copy, ExternalLink, LogOut,
} from 'lucide-react'
import { toast } from 'sonner'

/* ================================================================
   CONSTANTS
   ================================================================ */
const DEMO_USER_ID = 'demo-user-netflix'
const API = (path: string) => `/api/${path}`

type View = 'plans' | 'payment' | 'billing' | 'admin' | 'notifications'

interface Plan {
  id: string
  name: string
  description: string
  price: number
  currency: string
  interval: string
  features: string[]
  isActive: boolean
  sortOrder: number
}

interface Payment {
  id: string
  userId: string
  amount: number
  currency: string
  status: string
  paymentType: string
  provider: string
  transactionId: string
  vaNumber: string
  retryCount: number
  maxRetry: number
  paidAt: string | null
  expiredAt: string | null
  createdAt: string
  metadata: string
}

interface Subscription {
  id: string
  userId: string
  planId: string
  status: string
  startDate: string
  endDate: string | null
  autoRenew: boolean
  plan: Plan
}

interface PaymentMethod {
  id: string
  userId: string
  type: string
  label: string
  provider: string
  accountNumber: string
  isDefault: boolean
}

interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface AdminStats {
  totalRevenue: number
  activeSubscribers: number
  totalPayments: number
  failedPayments: number
  pendingPayments: number
  churnRate: string
  planDistribution: { planId: string; count: number; planName: string }[]
}

/* ================================================================
   FORMAT HELPERS
   ================================================================ */
const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtRelative = (d: string) => {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  const days = Math.floor(hrs / 24)
  return `${days} hari lalu`
}

const statusBadge = (s: string) => {
  const map: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    success: { bg: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2, label: 'Berhasil' },
    pending: { bg: 'bg-amber-500/20 text-amber-400', icon: Clock, label: 'Menunggu' },
    failed: { bg: 'bg-red-500/20 text-red-400', icon: XCircle, label: 'Gagal' },
    expired: { bg: 'bg-gray-500/20 text-gray-400', icon: XCircle, label: 'Kadaluarsa' },
    refunded: { bg: 'bg-blue-500/20 text-blue-400', icon: RefreshCw, label: 'Refund' },
    active: { bg: 'bg-emerald-500/20 text-emerald-400', icon: CheckCircle2, label: 'Aktif' },
    cancelled: { bg: 'bg-gray-500/20 text-gray-400', icon: XCircle, label: 'Dibatalkan' },
    past_due: { bg: 'bg-red-500/20 text-red-400', icon: AlertTriangle, label: 'Jatuh Tempo' },
  }
  const v = map[s] || { bg: 'bg-gray-500/20 text-gray-400', icon: Clock, label: s }
  return v
}

/* ================================================================
   MIDTRANS SNAP
   ================================================================ */
function loadSnapScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).snap) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
    script.onload = () => resolve()
    script.onerror = reject
    document.body.appendChild(script)
  })
}

/* ================================================================
   MAIN APP
   ================================================================ */
export default function SubscriptionPage() {
  const [view, setView] = useState<View>('plans')
  const [mobileMenu, setMobileMenu] = useState(false)

  // Data state
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billing, setBilling] = useState<{ subscription: Subscription | null; paymentMethods: PaymentMethod[]; recentPayments: Payment[]; unreadNotifications: number }>({
    subscription: null, paymentMethods: [], recentPayments: [], unreadNotifications: 0,
  })
  const [payments, setPayments] = useState<Payment[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [adminPayments, setAdminPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payResult, setPayResult] = useState<any>(null)

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    try {
      const r = await fetch(API('subscription/plans'))
      const d = await r.json()
      if (d.success) setPlans(d.plans)
    } catch {}
  }, [])

  // Fetch billing
  const fetchBilling = useCallback(async () => {
    try {
      const r = await fetch(API(`subscription/billing?userId=${DEMO_USER_ID}`))
      const d = await r.json()
      if (d.success) {
        setBilling(d)
        if (d.subscription) setSelectedPlan(d.subscription.plan)
      }
    } catch {}
  }, [])

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    try {
      const r = await fetch(API(`subscription/payments?userId=${DEMO_USER_ID}`))
      const d = await r.json()
      if (d.success) setPayments(d.payments)
    } catch {}
  }, [])

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const r = await fetch(API(`subscription/notification?userId=${DEMO_USER_ID}`))
      const d = await r.json()
      if (d.success) setNotifications(d.notifications)
    } catch {}
  }, [])

  // Fetch admin
  const fetchAdmin = useCallback(async () => {
    try {
      const r = await fetch(API(`subscription/admin?userId=${DEMO_USER_ID}`))
      const d = await r.json()
      if (d.success) {
        setAdminStats(d.stats)
        setAdminPayments(d.recentPayments || [])
      }
    } catch {}
  }, [])

  // Init load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchPlans(), fetchBilling(), fetchPayments(), fetchNotifications(), fetchAdmin()])
      setLoading(false)
    }
    init()
  }, [fetchPlans, fetchBilling, fetchPayments, fetchNotifications, fetchAdmin])

  // Handle subscribe
  const handleSubscribe = async (plan: Plan) => {
    setSelectedPlan(plan)
    setPaying(true)
    setPayResult(null)

    try {
      const r = await fetch(API('midtrans/create-transaction'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          userId: DEMO_USER_ID,
          customerName: 'Demo User',
          customerEmail: 'demo@streamprint.id',
          customerPhone: '081234567890',
          paymentMethod: 'va_bca',
        }),
      })
      const d = await r.json()
      if (!d.success) { toast.error(d.error); setPaying(false); return }

      if (d.snapToken) {
        // Real Midtrans Snap
        await loadSnapScript()
        ;(window as any).snap.pay(d.snapToken, {
          onSuccess: () => { toast.success('Pembayaran berhasil!'); refreshAll() },
          onPending: () => { toast.info('Menunggu pembayaran'); setPayResult(d) },
          onError: () => { toast.error('Pembayaran gagal'); refreshAll() },
          onClose: () => { setPaying(false) },
        })
      } else {
        // Simulated mode
        setPayResult(d)
      }
    } catch {
      toast.error('Gagal membuat transaksi')
    }
    setPaying(false)
  }

  // Simulate pay
  const simulatePay = async (paymentId: string) => {
    try {
      const r = await fetch(API(`subscription/payments/${paymentId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate-pay' }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success('Pembayaran berhasil disimulasikan! 🎉')
        refreshAll()
      } else toast.error(d.error)
    } catch { toast.error('Gagal') }
  }

  // Retry payment
  const retryPayment = async (paymentId: string) => {
    try {
      const r = await fetch(API(`subscription/payments/${paymentId}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      })
      const d = await r.json()
      if (d.success) {
        toast.success('Percobaan ulang dijadwalkan')
        refreshAll()
      } else toast.error(d.error)
    } catch { toast.error('Gagal') }
  }

  // Mark notifications read
  const markAllRead = async () => {
    await fetch(API('subscription/notification'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: DEMO_USER_ID, action: 'read-all' }),
    })
    fetchNotifications()
    fetchBilling()
  }

  const refreshAll = () => {
    fetchBilling(); fetchPayments(); fetchNotifications(); fetchAdmin()
  }

  const navItems: { key: View; label: string; icon: any }[] = [
    { key: 'plans', label: 'Paket', icon: Crown },
    { key: 'billing', label: 'Billing', icon: Receipt },
    { key: 'notifications', label: 'Notifikasi', icon: Bell },
    { key: 'admin', label: 'Admin', icon: BarChart3 },
  ]

  if (loading) return <LoadingScreen />

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#141414]/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#e50914]">STREAMPRINT</h1>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(n => (
                <button key={n.key} onClick={() => setView(n.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === n.key ? 'text-white' : 'text-gray-400 hover:text-white'}`}>
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#1f1f1f] px-3 py-1.5 rounded-md">
              <div className="w-7 h-7 rounded-full bg-[#e50914] flex items-center justify-center text-xs font-bold">D</div>
              <span className="text-sm text-gray-300">Demo User</span>
            </div>
            <button className="md:hidden p-2 rounded-md hover:bg-white/10" onClick={() => setMobileMenu(!mobileMenu)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-white/5 bg-[#141414]">
            {navItems.map(n => (
              <button key={n.key} onClick={() => { setView(n.key); setMobileMenu(false) }}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${view === n.key ? 'text-white bg-white/5' : 'text-gray-400'}`}>
                <n.icon className="w-5 h-5" />{n.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* MAIN */}
      <main className="pt-16 min-h-screen">
        {view === 'plans' && (
          <PlansView
            plans={plans}
            activeSubscription={billing.subscription}
            onSelect={handleSubscribe}
            paying={paying}
            selectedPlan={selectedPlan}
            payResult={payResult}
            onSimulatePay={simulatePay}
            onClosePayResult={() => setPayResult(null)}
          />
        )}
        {view === 'billing' && (
          <BillingView
            subscription={billing.subscription}
            payments={billing.recentPayments}
            paymentMethods={billing.paymentMethods}
            onRetry={retryPayment}
            onSimulatePay={simulatePay}
            onRefresh={refreshAll}
          />
        )}
        {view === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAllRead={markAllRead}
          />
        )}
        {view === 'admin' && (
          <AdminView
            stats={adminStats}
            payments={adminPayments}
            plans={plans}
          />
        )}
      </main>
    </div>
  )
}

/* ================================================================
   LOADING SCREEN
   ================================================================ */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#e50914] animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    </div>
  )
}

/* ================================================================
   PLANS VIEW (Netflix-style)
   ================================================================ */
function PlansView({ plans, activeSubscription, onSelect, paying, selectedPlan, payResult, onSimulatePay, onClosePayResult }: {
  plans: Plan[]
  activeSubscription: Subscription | null
  onSelect: (p: Plan) => void
  paying: boolean
  selectedPlan: Plan | null
  payResult: any
  onSimulatePay: (id: string) => void
  onClosePayResult: () => void
}) {
  const hasActive = activeSubscription?.status === 'active'
  const [step, setStep] = useState<'plans' | 'confirm'>('plans')
  const [method, setMethod] = useState('va_bca')

  const currentPlanIdx = plans.findIndex(p => p.name === activeSubscription?.plan?.name)
  const intervalLabels: Record<string, string> = { monthly: '/bulan', yearly: '/tahun', lifetime: 'sekali bayar' }

  return (
    <div className="relative">
      {/* HERO */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#e50914]/20 via-[#141414] to-[#141414]" />
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
            {hasActive ? 'Langganan Anda Aktif' : 'Pilih Paket yang Tepat'}
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto mb-2">
            {hasActive
              ? `Anda sedang berlangganan paket ${activeSubscription?.plan?.name}. Upgrade atau ubah kapan saja.`
              : 'Mulai dari Rp 99.000/bulan. Batal kapan saja, tanpa kontrak.'
            }
          </p>
          {hasActive && activeSubscription?.endDate && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mt-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">Berlaku hingga {fmtDate(activeSubscription.endDate)}</span>
            </div>
          )}
        </div>
      </div>

      {/* PLANS GRID */}
      <div className="max-w-6xl mx-auto px-4 pb-20 -mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, idx) => {
            const isPopular = idx === 2
            const isCurrentPlan = plan.name === activeSubscription?.plan?.name
            return (
              <div key={plan.id} className={`relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.03] ${
                isPopular ? 'ring-2 ring-[#e50914] scale-[1.02]' : 'bg-[#1f1f1f] hover:bg-[#262626]'
              }`}>
                {isPopular && (
                  <div className="bg-[#e50914] text-center text-xs font-bold py-1.5 tracking-wide uppercase">
                    Paling Populer
                  </div>
                )}
                <div className="p-5 sm:p-6">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      {isPopular && <Star className="w-4 h-4 text-[#e50914] fill-[#e50914]" />}
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black">{fmtRp(plan.price)}</span>
                      <span className="text-sm text-gray-500">{intervalLabels[plan.interval]}</span>
                    </div>
                    {plan.interval === 'yearly' && (
                      <p className="text-xs text-emerald-400 mt-1 font-medium">
                        Hemat {Math.round((1 - plan.price / (Number(plan.price.toString().charAt(0)) * 149000)) * 100)}% dibanding bulanan
                      </p>
                    )}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {JSON.parse(plan.features).map((f: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <Check className="w-3.5 h-3.5 text-[#e50914] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => { setStep('confirm'); onSelect(plan) }}
                    disabled={paying || isCurrentPlan}
                    className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                      isCurrentPlan
                        ? 'bg-gray-700 text-gray-400 cursor-default'
                        : isPopular
                          ? 'bg-[#e50914] hover:bg-[#f6121d] text-white'
                          : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}>
                    {isCurrentPlan ? 'Paket Saat Ini' : paying && selectedPlan?.id === plan.id ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Memproses...</span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">Mulai {plan.name} <ChevronRight className="w-4 h-4" /></span>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* FEATURES SECTION */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: Shield, title: 'Tanpa Kontrak', desc: 'Batal kapan saja tanpa denda. Tidak ada ikatan apapun.' },
            { icon: Zap, title: 'Auto Billing', desc: 'Pembayaran otomatis setiap bulan. Tidak perlu bayar manual.' },
            { icon: RefreshCw, title: 'Retry Otomatis', desc: 'Jika gagal, sistem otomatis mencoba ulang hingga 3x.' },
          ].map((f, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-xl p-6">
              <f.icon className="w-8 h-8 text-[#e50914] mx-auto mb-3" />
              <h4 className="font-bold mb-1">{f.title}</h4>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PAYMENT RESULT MODAL */}
      {payResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClosePayResult}>
          <div className="bg-[#1f1f1f] rounded-2xl max-w-md w-full p-6 border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Pembayaran</h3>
              <button onClick={onClosePayResult} className="p-1 hover:bg-white/10 rounded-md"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-[#141414] rounded-xl p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Paket</span>
                <span className="text-sm font-bold">{payResult.planName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-lg font-black text-[#e50914]">{fmtRp(payResult.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Batas Waktu</span>
                <span className="text-xs text-gray-300">{payResult.expiredAt ? fmtDate(payResult.expiredAt) : '24 jam'}</span>
              </div>
            </div>
            {payResult.simulated && payResult.paymentInstructions && (
              <div className="mb-4">
                <h4 className="text-sm font-bold mb-2">{payResult.paymentInstructions.title}</h4>
                {payResult.paymentInstructions.vaNumber && (
                  <div className="bg-[#141414] rounded-lg p-3 mb-3 flex items-center justify-between">
                    <span className="text-lg font-mono font-bold tracking-wider">{payResult.paymentInstructions.vaNumber}</span>
                    <button onClick={() => { navigator.clipboard.writeText(payResult.paymentInstructions.vaNumber); toast.success('Disalin!') }}
                      className="p-1.5 hover:bg-white/10 rounded-md"><Copy className="w-4 h-4 text-gray-400" /></button>
                  </div>
                )}
                <ol className="space-y-1.5">
                  {payResult.paymentInstructions.steps.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <span className="bg-[#e50914]/20 text-[#e50914] w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => onSimulatePay(payResult.paymentRecordId)}
                className="flex-1 bg-[#e50914] hover:bg-[#f6121d] text-white py-2.5 rounded-lg text-sm font-bold transition-colors">
                Simulasi Bayar
              </button>
              <button onClick={onClosePayResult}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm font-bold transition-colors">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================
   BILLING VIEW
   ================================================================ */
function BillingView({ subscription, payments, paymentMethods, onRetry, onSimulatePay, onRefresh }: {
  subscription: Subscription | null
  payments: Payment[]
  paymentMethods: PaymentMethod[]
  onRetry: (id: string) => void
  onSimulatePay: (id: string) => void
  onRefresh: () => void
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Billing & Pembayaran</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola langganan dan riwayat pembayaran</p>
        </div>
        <button onClick={onRefresh} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Active Subscription */}
      {subscription && (
        <div className="bg-gradient-to-r from-[#e50914]/10 to-[#1f1f1f] rounded-xl p-5 sm:p-6 mb-6 border border-[#e50914]/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-[#e50914]" />
                <h3 className="text-lg font-bold">{subscription.plan.name}</h3>
                {(() => { const s = statusBadge(subscription.status); return <span className={`${s.bg} text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}><s.icon className="w-3 h-3" />{s.label}</span> })()}
              </div>
              <p className="text-sm text-gray-400">
                {fmtDate(subscription.startDate)} — {subscription.endDate ? fmtDate(subscription.endDate) : 'Tanpa batas'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Auto-renewal: {subscription.autoRenew ? 'Aktif' : 'Nonaktif'}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black">{fmtRp(subscription.plan.price)}</p>
              <p className="text-xs text-gray-500">
                {subscription.plan.interval === 'monthly' ? '/bulan' : subscription.plan.interval === 'yearly' ? '/tahun' : 'sekali'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-gray-400" />Metode Pembayaran</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {paymentMethods.map(m => (
            <div key={m.id} className={`bg-[#1f1f1f] rounded-lg p-4 flex items-center gap-3 border ${m.isDefault ? 'border-[#e50914]/40' : 'border-white/5'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                m.type === 'bank_transfer' ? 'bg-blue-500/20 text-blue-400' :
                m.type === 'ewallet' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                {m.type === 'bank_transfer' ? <Building2 className="w-5 h-5" /> :
                 m.type === 'ewallet' ? <Smartphone className="w-5 h-5" /> :
                 <CreditCard className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{m.label}</p>
                  {m.isDefault && <span className="text-[10px] bg-[#e50914]/20 text-[#e50914] px-1.5 py-0.5 rounded font-bold">Default</span>}
                </div>
                <p className="text-xs text-gray-500 truncate">{m.accountNumber}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Receipt className="w-5 h-5 text-gray-400" />Riwayat Pembayaran</h3>
        <div className="bg-[#1f1f1f] rounded-xl overflow-hidden border border-white/5">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium">Paket</th>
                  <th className="text-left px-4 py-3 font-medium">Metode</th>
                  <th className="text-right px-4 py-3 font-medium">Jumlah</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const meta = JSON.parse(p.metadata || '{}')
                  const s = statusBadge(p.status)
                  return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-300">{fmtDate(p.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{meta.planName || '-'}</td>
                      <td className="px-4 py-3 text-gray-400 capitalize">{p.provider || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{fmtRp(p.amount)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`${s.bg} text-[11px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1`}>
                          <s.icon className="w-3 h-3" />{s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === 'failed' && p.retryCount < p.maxRetry && (
                            <button onClick={() => onRetry(p.id)} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white" title="Coba Lagi">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {p.status === 'pending' && (
                            <button onClick={() => onSimulatePay(p.id)} className="p-1.5 hover:bg-emerald-500/20 rounded-md text-gray-400 hover:text-emerald-400" title="Simulasi Bayar">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-white/5">
            {payments.map(p => {
              const meta = JSON.parse(p.metadata || '{}')
              const s = statusBadge(p.status)
              return (
                <div key={p.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">{fmtDate(p.createdAt)}</span>
                    <span className={`${s.bg} text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1`}>
                      <s.icon className="w-3 h-3" />{s.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{meta.planName || 'Pembayaran'}</p>
                      <p className="text-xs text-gray-500 capitalize">{p.provider}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{fmtRp(p.amount)}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {p.status === 'failed' && p.retryCount < p.maxRetry && (
                          <button onClick={() => onRetry(p.id)} className="text-[10px] text-[#e50914] font-bold">Coba Lagi</button>
                        )}
                        {p.status === 'pending' && (
                          <button onClick={() => onSimulatePay(p.id)} className="text-[10px] text-emerald-400 font-bold">Bayar</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {payments.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">Belum ada riwayat pembayaran</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ================================================================
   NOTIFICATIONS VIEW
   ================================================================ */
function NotificationsView({ notifications, onMarkAllRead }: {
  notifications: Notification[]
  onMarkAllRead: () => void
}) {
  const unread = notifications.filter(n => !n.isRead)
  const typeIcons: Record<string, { icon: any; bg: string; color: string }> = {
    success: { icon: CheckCircle2, bg: 'bg-emerald-500/20', color: 'text-emerald-400' },
    error: { icon: XCircle, bg: 'bg-red-500/20', color: 'text-red-400' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-500/20', color: 'text-amber-400' },
    info: { icon: Bell, bg: 'bg-blue-500/20', color: 'text-blue-400' },
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Notifikasi</h2>
          {unread.length > 0 && (
            <span className="bg-[#e50914] text-white text-xs font-bold px-2 py-0.5 rounded-full">{unread.length} baru</span>
          )}
        </div>
        {unread.length > 0 && (
          <button onClick={onMarkAllRead} className="text-sm text-[#e50914] hover:underline font-medium">
            Tandai semua dibaca
          </button>
        )}
      </div>
      <div className="space-y-2">
        {notifications.map(n => {
          const t = typeIcons[n.type] || typeIcons.info
          return (
            <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${!n.isRead ? 'bg-[#1f1f1f] border border-white/5' : 'bg-[#181818] opacity-60'}`}>
              <div className={`w-9 h-9 rounded-lg ${t.bg} flex items-center justify-center shrink-0`}>
                <t.icon className={`w-4 h-4 ${t.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#e50914]" />}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-gray-600 mt-1">{fmtRelative(n.createdAt)}</p>
              </div>
            </div>
          )
        })}
        {notifications.length === 0 && (
          <div className="text-center py-20">
            <BellOff className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada notifikasi</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   ADMIN VIEW
   ================================================================ */
function AdminView({ stats, payments, plans }: {
  stats: AdminStats | null
  payments: Payment[]
  plans: Plan[]
}) {
  if (!stats) return null

  const cards = [
    { label: 'Total Revenue', value: fmtRp(stats.totalRevenue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Subscriber Aktif', value: stats.activeSubscribers.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Transaksi', value: stats.totalPayments.toString(), icon: Receipt, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Churn Rate', value: `${stats.churnRate}%`, icon: AlertTriangle, color: stats.churnRate > '10' ? 'text-red-400' : 'text-amber-400', bg: stats.churnRate > '10' ? 'bg-red-500/10' : 'bg-amber-500/10' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-1">Admin Dashboard</h2>
      <p className="text-sm text-gray-500 mb-8">Monitor performa langganan dan pembayaran</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className="bg-[#1f1f1f] rounded-xl p-4 sm:p-5 border border-white/5">
            <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-xl sm:text-2xl font-black">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-[#1f1f1f] rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gray-400" />Distribusi Paket</h3>
          <div className="space-y-3">
            {stats.planDistribution.map((p, i) => {
              const plan = plans.find(pl => pl.id === p.planId)
              const total = stats.planDistribution.reduce((s, x) => s + x.count, 0)
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.planName}</span>
                    <span className="text-xs text-gray-400">{p.count} subscriber ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#141414] rounded-full overflow-hidden">
                    <div className="h-full bg-[#e50914] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {stats.planDistribution.length === 0 && <p className="text-xs text-gray-500">Belum ada data</p>}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-[#1f1f1f] rounded-xl p-5 border border-white/5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />Pembayaran Terbaru</h3>
          <div className="space-y-2">
            {payments.slice(0, 8).map(p => {
              const meta = JSON.parse(p.metadata || '{}')
              const s = statusBadge(p.status)
              return (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{meta.planName || p.transactionId}</p>
                    <p className="text-[10px] text-gray-500">{fmtRelative(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{fmtRp(p.amount)}</span>
                    <span className={`${s.bg} text-[10px] font-bold px-1.5 py-0.5 rounded-full`}>
                      <s.icon className="w-3 h-3 inline mr-0.5" />{s.label}
                    </span>
                  </div>
                </div>
              )
            })}
            {payments.length === 0 && <p className="text-xs text-gray-500">Belum ada data</p>}
          </div>
        </div>
      </div>

      {/* Payment Status Summary */}
      <div className="mt-6 bg-[#1f1f1f] rounded-xl p-5 border border-white/5">
        <h3 className="text-sm font-bold mb-4">Status Pembayaran</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Berhasil', count: stats.totalPayments - stats.failedPayments - stats.pendingPayments, color: 'bg-emerald-500' },
            { label: 'Menunggu', count: stats.pendingPayments, color: 'bg-amber-500' },
            { label: 'Gagal', count: stats.failedPayments, color: 'bg-red-500' },
            { label: 'Total', count: stats.totalPayments, color: 'bg-blue-500' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <div>
                <p className="text-lg font-bold">{item.count}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
