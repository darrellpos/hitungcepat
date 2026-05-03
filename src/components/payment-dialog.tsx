'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  CreditCard,
  Building2,
  Wallet,
  Shield,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Smartphone,
  User,
  Mail,
  Phone,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PackageInfo {
  type: string;
  name: string;
  price: number;
  priceFormatted: string;
  period: string;
}

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  pkg: PackageInfo;
}

type Step = 'confirm' | 'info' | 'method' | 'paying' | 'result';
type PaymentResult = 'success' | 'pending' | 'error' | null;

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */
function formatRupiah(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

/* ------------------------------------------------------------------ */
/*  Payment methods (Netflix-style)                                    */
/* ------------------------------------------------------------------ */
const PAYMENT_METHODS = [
  {
    id: 'gopay',
    label: 'GoPay',
    sublabel: 'Bayar via aplikasi Gojek',
    icon: '💳',
    category: 'e-wallet',
    popular: true,
  },
  {
    id: 'shopeepay',
    label: 'ShopeePay',
    sublabel: 'Bayar via aplikasi Shopee',
    icon: '🛒',
    category: 'e-wallet',
    popular: false,
  },
  {
    id: 'bca_va',
    label: 'Virtual Account BCA',
    sublabel: 'Transfer via ATM / M-Banking BCA',
    icon: '🏦',
    category: 'bank_transfer',
    popular: true,
  },
  {
    id: 'bni_va',
    label: 'Virtual Account BNI',
    sublabel: 'Transfer via ATM / M-Banking BNI',
    icon: '🏦',
    category: 'bank_transfer',
    popular: false,
  },
  {
    id: 'mandiri_va',
    label: 'Virtual Account Mandiri',
    sublabel: 'Transfer via ATM / M-Banking Mandiri',
    icon: '🏦',
    category: 'bank_transfer',
    popular: false,
  },
  {
    id: 'bri_va',
    label: 'Virtual Account BRI',
    sublabel: 'Transfer via ATM / M-Banking BRI',
    icon: '🏦',
    category: 'bank_transfer',
    popular: false,
  },
  {
    id: 'cc',
    label: 'Kartu Kredit / Debit',
    sublabel: 'Visa, Mastercard, JCB, AMEX',
    icon: '💳',
    category: 'credit_card',
    popular: true,
  },
  {
    id: 'qris',
    label: 'QRIS',
    sublabel: 'Scan QR dari aplikasi bank manapun',
    icon: '📱',
    category: 'qris',
    popular: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function PaymentDialog({ open, onClose, pkg }: PaymentDialogProps) {
  const [step, setStep] = useState<Step>('confirm');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaymentResult>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [orderId, setOrderId] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('confirm');
      setSelectedMethod('');
      setLoading(false);
      setResult(null);
      setResultMessage('');
      setOrderId('');
      setName('');
      setEmail('');
      setPhone('');
      setFormErrors({});
    }
  }, [open]);

  // Handle URL params for payment callback
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const savedOrderId = sessionStorage.getItem('lastPaymentOrderId');

    if (paymentStatus && savedOrderId) {
      if (paymentStatus === 'finish') {
        checkPaymentResult(savedOrderId);
      } else if (paymentStatus === 'pending') {
        setStep('result');
        setResult('pending');
        setResultMessage('Menunggu pembayaran Anda. Silakan selesaikan pembayaran untuk mengaktifkan langganan.');
      } else if (paymentStatus === 'error') {
        setStep('result');
        setResult('error');
        setResultMessage('Pembayaran dibatalkan atau gagal. Silakan coba lagi.');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      sessionStorage.removeItem('lastPaymentOrderId');
    }
  }, [open]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Nama wajib diisi';
    if (!email.trim()) errors.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Format email tidak valid';
    if (!phone.trim()) errors.phone = 'Nomor HP wajib diisi';
    else if (!/^[0-9+\-\s]{8,15}$/.test(phone)) errors.phone = 'Format nomor HP tidak valid';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, phone]);

  // Create Midtrans transaction & open Snap
  const handlePay = useCallback(async () => {
    if (!selectedMethod) return;
    setLoading(true);
    setResultMessage('');

    try {
      const res = await fetch('/api/midtrans/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageName: pkg.name,
          packageType: pkg.type,
          price: pkg.price,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Gagal membuat transaksi');
      }

      setOrderId(data.orderId);
      sessionStorage.setItem('lastPaymentOrderId', data.orderId);
      setStep('paying');

      // Load Midtrans Snap script
      await new Promise<void>((resolve, reject) => {
        if ((window as unknown as Record<string, unknown>).snap) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Gagal memuat payment gateway'));
        document.body.appendChild(script);
      });

      // Open Midtrans Snap popup
      const snap = (window as unknown as Record<string, Record<string, (token: string) => void>>).snap;
      if (snap && snap.pay) {
        snap.pay(data.token, {
          onSuccess: () => {
            setStep('result');
            setResult('success');
            setResultMessage('Pembayaran berhasil! Langganan Anda telah aktif.');
            setLoading(false);
          },
          onPending: () => {
            setStep('result');
            setResult('pending');
            setResultMessage('Menunggu pembayaran Anda. Silakan selesaikan pembayaran untuk mengaktifkan langganan.');
            setLoading(false);
          },
          onError: () => {
            setStep('result');
            setResult('error');
            setResultMessage('Pembayaran gagal. Silakan coba lagi dengan metode pembayaran lain.');
            setLoading(false);
          },
          onClose: () => {
            // User closed the popup manually, go back to payment method
            setStep('method');
            setLoading(false);
          },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setResultMessage(message);
      setStep('result');
      setResult('error');
      setLoading(false);
    }
  }, [selectedMethod, pkg, name, email, phone]);

  // Check payment result from callback
  const checkPaymentResult = async (oid: string) => {
    try {
      const res = await fetch(`/api/midtrans/check-status?order_id=${oid}`);
      const data = await res.json();
      if (data.success) {
        const status = data.data.transactionStatus;
        if (status === 'success') {
          setStep('result');
          setResult('success');
          setResultMessage('Pembayaran berhasil! Langganan Anda telah aktif.');
        } else if (status === 'pending') {
          setStep('result');
          setResult('pending');
          setResultMessage('Menunggu pembayaran Anda.');
        } else {
          setStep('result');
          setResult('error');
          setResultMessage('Pembayaran gagal atau expired.');
        }
      }
    } catch {
      setStep('result');
      setResult('error');
      setResultMessage('Gagal mengecek status pembayaran.');
    }
  };

  // Steps navigation
  const goNext = () => {
    if (step === 'confirm') {
      setStep('info');
    } else if (step === 'info') {
      if (validateForm()) setStep('method');
    } else if (step === 'method') {
      handlePay();
    }
  };

  const goBack = () => {
    if (step === 'info') setStep('confirm');
    else if (step === 'method') setStep('info');
    else if (step === 'paying') {
      setStep('method');
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 'confirm') return true;
    if (step === 'info') return name.trim() && email.trim() && phone.trim();
    if (step === 'method') return !!selectedMethod;
    return false;
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            onClick={step === 'result' ? onClose : undefined}
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-[101]"
          >
            <div className="bg-[#141414] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-white text-lg font-bold">Langganan</h2>
                </div>
                {step !== 'paying' && (
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Step indicator */}
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  {(['confirm', 'info', 'method'] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          step === s
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                            : ['confirm', 'info', 'method'].indexOf(step) > i
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white/10 text-gray-500'
                        }`}
                      >
                        {['confirm', 'info', 'method'].indexOf(step) > i ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      {i < 2 && (
                        <div
                          className={`h-px w-8 transition-colors duration-300 ${
                            ['confirm', 'info', 'method'].indexOf(step) > i
                              ? 'bg-emerald-500'
                              : 'bg-white/10'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                  <span className="ml-2 text-xs text-gray-400">
                    {step === 'confirm' && 'Paket'}
                    {step === 'info' && 'Data Diri'}
                    {step === 'method' && 'Pembayaran'}
                    {(step === 'paying' || step === 'result') && 'Proses'}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <AnimatePresence mode="wait">
                  {/* ========== STEP: Confirm ========== */}
                  {step === 'confirm' && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3 className="text-white text-xl font-bold mb-1">Pilih Paket Anda</h3>
                      <p className="text-gray-400 text-sm mb-6">
                        Mulai berlangganan dan nikmati semua fitur premium
                      </p>

                      {/* Package Card */}
                      <div className="relative rounded-xl overflow-hidden border-2 border-orange-500/50 bg-gradient-to-br from-orange-500/10 to-red-500/5 p-5 mb-4">
                        <div className="absolute top-3 right-3">
                          <span className="bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Dipilih
                          </span>
                        </div>
                        <h4 className="text-white text-lg font-bold mb-1">{pkg.name}</h4>
                        <div className="flex items-baseline gap-2 mb-3">
                          <span className="text-3xl font-black text-white">{pkg.priceFormatted}</span>
                          <span className="text-gray-400 text-sm">/ {pkg.period}</span>
                        </div>
                        <div className="space-y-2">
                          {pkg.type === 'bulanan' && (
                            <>
                              <FeatureItem text="Akses semua fitur premium" />
                              <FeatureItem text="Hitung otomatis harga modal" />
                              <FeatureItem text="Akses Desktop & Mobile" />
                              <FeatureItem text="Boleh langganan 1 bulan saja" />
                              <FeatureItem text="Tidak ada biaya denda" />
                            </>
                          )}
                          {pkg.type === 'tahunan' && (
                            <>
                              <FeatureItem text="Semua fitur Bulanan" />
                              <FeatureItem text="Hemat 42% dibanding bulanan" />
                              <FeatureItem text="Priority Support 24/7" />
                              <FeatureItem text="Laporan bulanan lengkap" />
                              <FeatureItem text="Backup data otomatis" />
                            </>
                          )}
                          {pkg.type === 'lifetime' && (
                            <>
                              <FeatureItem text="Semua fitur Tahunan" />
                              <FeatureItem text="Bayar sekali, pakai selamanya" />
                              <FeatureItem text="Tidak ada biaya berlangganan" />
                              <FeatureItem text="Update fitur gratis selamanya" />
                              <FeatureItem text="Priority Support 24/7" />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Trust badges */}
                      <div className="grid grid-cols-3 gap-3">
                        <TrustBadge icon={<Shield className="w-4 h-4" />} text="Pembayaran Aman" />
                        <TrustBadge icon={<Lock className="w-4 h-4" />} text="Data Terenkripsi" />
                        <TrustBadge icon={<CheckCircle2 className="w-4 h-4" />} text="Garansi 7 Hari" />
                      </div>
                    </motion.div>
                  )}

                  {/* ========== STEP: Info ========== */}
                  {step === 'info' && (
                    <motion.div
                      key="info"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3 className="text-white text-xl font-bold mb-1">Data Pembayaran</h3>
                      <p className="text-gray-400 text-sm mb-6">
                        Lengkapi data Anda untuk melanjutkan pembayaran
                      </p>

                      <div className="space-y-4">
                        {/* Name */}
                        <div>
                          <label className="text-sm text-gray-300 font-medium mb-1.5 flex items-center gap-2">
                            <User className="w-4 h-4 text-orange-400" />
                            Nama Lengkap
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' })); }}
                            placeholder="Masukkan nama lengkap"
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all ${
                              formErrors.name ? 'border-red-500' : 'border-white/10'
                            }`}
                          />
                          {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
                        </div>

                        {/* Email */}
                        <div>
                          <label className="text-sm text-gray-300 font-medium mb-1.5 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-orange-400" />
                            Email
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' })); }}
                            placeholder="contoh@email.com"
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all ${
                              formErrors.email ? 'border-red-500' : 'border-white/10'
                            }`}
                          />
                          {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="text-sm text-gray-300 font-medium mb-1.5 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-orange-400" />
                            Nomor HP
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => { setPhone(e.target.value); if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' })); }}
                            placeholder="08xx atau +628xx"
                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all ${
                              formErrors.phone ? 'border-red-500' : 'border-white/10'
                            }`}
                          />
                          {formErrors.phone && <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>}
                        </div>
                      </div>

                      {/* Order summary */}
                      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Ringkasan Pesanan</h4>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">{pkg.name}</span>
                          <span className="text-white font-bold">{pkg.priceFormatted}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ========== STEP: Method ========== */}
                  {step === 'method' && (
                    <motion.div
                      key="method"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.25 }}
                    >
                      <h3 className="text-white text-xl font-bold mb-1">Metode Pembayaran</h3>
                      <p className="text-gray-400 text-sm mb-5">
                        Pilih metode pembayaran yang Anda inginkan
                      </p>

                      {/* E-Wallet */}
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Wallet className="w-3.5 h-3.5" /> E-Wallet
                        </h4>
                        <div className="space-y-2">
                          {PAYMENT_METHODS.filter(m => m.category === 'e-wallet').map(m => (
                            <PaymentMethodCard
                              key={m.id}
                              method={m}
                              selected={selectedMethod === m.id}
                              onClick={() => setSelectedMethod(m.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Virtual Account */}
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5" /> Virtual Account
                        </h4>
                        <div className="space-y-2">
                          {PAYMENT_METHODS.filter(m => m.category === 'bank_transfer').map(m => (
                            <PaymentMethodCard
                              key={m.id}
                              method={m}
                              selected={selectedMethod === m.id}
                              onClick={() => setSelectedMethod(m.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* QRIS */}
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5" /> QRIS
                        </h4>
                        <div className="space-y-2">
                          {PAYMENT_METHODS.filter(m => m.category === 'qris').map(m => (
                            <PaymentMethodCard
                              key={m.id}
                              method={m}
                              selected={selectedMethod === m.id}
                              onClick={() => setSelectedMethod(m.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Credit Card */}
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5" /> Kartu Kredit / Debit
                        </h4>
                        <div className="space-y-2">
                          {PAYMENT_METHODS.filter(m => m.category === 'credit_card').map(m => (
                            <PaymentMethodCard
                              key={m.id}
                              method={m}
                              selected={selectedMethod === m.id}
                              onClick={() => setSelectedMethod(m.id)}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 mt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Total Pembayaran</span>
                          <span className="text-xl font-black text-white">{pkg.priceFormatted}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-gray-500 text-xs">{pkg.name}</span>
                          <span className="text-gray-500 text-xs">{pkg.period}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ========== STEP: Paying ========== */}
                  {step === 'paying' && (
                    <motion.div
                      key="paying"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 animate-pulse">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      </div>
                      <h3 className="text-white text-xl font-bold mb-2">Memproses Pembayaran</h3>
                      <p className="text-gray-400 text-sm text-center max-w-xs">
                        Jendela pembayaran Midtrans terbuka. Silakan selesaikan pembayaran Anda.
                      </p>
                      <p className="text-gray-500 text-xs mt-4">Menutup popup akan kembali ke pilihan metode</p>
                    </motion.div>
                  )}

                  {/* ========== STEP: Result ========== */}
                  {step === 'result' && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col items-center justify-center py-8"
                    >
                      {/* Result icon */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ${
                          result === 'success'
                            ? 'bg-emerald-500/20'
                            : result === 'pending'
                            ? 'bg-amber-500/20'
                            : 'bg-red-500/20'
                        }`}
                      >
                        {result === 'success' && <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
                        {result === 'pending' && <Clock className="w-10 h-10 text-amber-500" />}
                        {result === 'error' && <XCircle className="w-10 h-10 text-red-500" />}
                      </motion.div>

                      {/* Result text */}
                      <h3 className="text-white text-xl font-bold mb-2">
                        {result === 'success' && 'Pembayaran Berhasil!'}
                        {result === 'pending' && 'Menunggu Pembayaran'}
                        {result === 'error' && 'Pembayaran Gagal'}
                      </h3>
                      <p className="text-gray-400 text-sm text-center max-w-xs mb-2">
                        {resultMessage}
                      </p>
                      {result === 'pending' && (
                        <p className="text-gray-500 text-xs text-center max-w-xs mb-4">
                          Anda akan menerima konfirmasi setelah pembayaran berhasil diverifikasi. Ini mungkin memakan waktu beberapa menit.
                        </p>
                      )}

                      {/* Order ID */}
                      {orderId && (
                        <div className="w-full p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider">ID Pesanan</span>
                          <p className="text-sm text-gray-300 font-mono mt-0.5">{orderId}</p>
                        </div>
                      )}

                      {/* Package info */}
                      <div className="w-full p-3 rounded-lg bg-white/5 border border-white/10 mb-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-gray-500">Paket</p>
                            <p className="text-sm text-white font-medium">{pkg.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Jumlah</p>
                            <p className="text-sm text-white font-bold">{pkg.priceFormatted}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              {step !== 'paying' && (
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between gap-3">
                  {step === 'result' ? (
                    <button
                      onClick={onClose}
                      className="w-full py-3 rounded-xl bg-white text-[#141414] font-bold text-sm hover:bg-gray-200 transition-colors"
                    >
                      {result === 'success' ? 'Mulai Gunakan' : 'Tutup'}
                    </button>
                  ) : (
                    <>
                      {step !== 'confirm' && (
                        <button
                          onClick={goBack}
                          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Kembali
                        </button>
                      )}
                      {step === 'confirm' && <div />}
                      <button
                        onClick={goNext}
                        disabled={!canProceed() || loading}
                        className={`ml-auto flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                          canProceed() && !loading
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/20'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            {step === 'confirm' && 'Lanjutkan'}
                            {step === 'info' && 'Pilih Pembayaran'}
                            {step === 'method' && `Bayar ${formatRupiah(pkg.price)}`}
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */
function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
      <span className="text-gray-300 text-sm">{text}</span>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-lg bg-white/5 border border-white/5">
      <span className="text-gray-400">{icon}</span>
      <span className="text-[10px] text-gray-500 font-medium text-center leading-tight">{text}</span>
    </div>
  );
}

interface PaymentMethodItem {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  category: string;
  popular: boolean;
}

function PaymentMethodCard({
  method,
  selected,
  onClick,
}: {
  method: PaymentMethodItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200 text-left ${
        selected
          ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
      }`}
    >
      <span className="text-2xl">{method.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${selected ? 'text-white' : 'text-gray-200'}`}>
            {method.label}
          </span>
          {method.popular && (
            <span className="bg-orange-500/20 text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
              Populer
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{method.sublabel}</span>
      </div>
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          selected
            ? 'border-orange-500 bg-orange-500'
            : 'border-gray-600'
        }`}
      >
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </motion.button>
  );
}
