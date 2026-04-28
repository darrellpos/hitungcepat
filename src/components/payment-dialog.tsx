'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  CreditCard,
  User,
  Mail,
  Phone,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { authFetch } from '@/lib/auth-fetch';

declare global {
  interface Window {
    snap: {
      pay: (token: string, options: { onSuccess: (result: any) => void; onPending: (result: any) => void; onError: (result: any) => void; onClose: () => void }) => void;
    };
  }
}

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

export default function PaymentDialog({ open, onClose, pkg }: PaymentDialogProps) {
  const [step, setStep] = useState<'form' | 'loading' | 'pending' | 'success' | 'error'>('form');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [snapLoaded, setSnapLoaded] = useState(false);

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

  // Load Midtrans Snap.js
  useEffect(() => {
    if (!open || snapLoaded || !clientKey || clientKey.includes('XXXXXXXX')) return;

    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.async = true;
    script.onload = () => {
      setSnapLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Midtrans Snap.js');
    };
    document.body.appendChild(script);

    return () => {
      // Don't remove script on unmount to allow re-use
    };
  }, [open, snapLoaded, clientKey]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('form');
      setErrorMsg('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handlePay = useCallback(async () => {
    // Validate
    if (!customerName.trim()) {
      setErrorMsg('Nama harus diisi');
      return;
    }
    if (!customerEmail.trim()) {
      setErrorMsg('Email harus diisi');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMsg('Nomor HP harus diisi');
      return;
    }

    if (!snapLoaded) {
      setErrorMsg('Payment gateway sedang dimuat, coba beberapa saat lagi...');
      return;
    }

    if (clientKey.includes('XXXXXXXX')) {
      setErrorMsg('Payment gateway belum dikonfigurasi. Silakan hubungi admin via WhatsApp.');
      return;
    }

    setErrorMsg('');
    setStep('loading');

    try {
      const res = await authFetch('/api/payment/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType: pkg.type,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal membuat transaksi');
        setStep('form');
        return;
      }

      // Open Snap payment popup
      window.snap.pay(data.token, {
        onSuccess: (result: any) => {
          console.log('Payment success:', result);
          setStep('success');
        },
        onPending: (result: any) => {
          console.log('Payment pending:', result);
          setStep('pending');
        },
        onError: (result: any) => {
          console.log('Payment error:', result);
          setErrorMsg('Pembayaran gagal. Silakan coba lagi.');
          setStep('error');
        },
        onClose: () => {
          // User closed the Snap popup without paying
          setStep('form');
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMsg('Terjadi kesalahan koneksi. Silakan coba lagi.');
      setStep('form');
    }
  }, [customerName, customerEmail, customerPhone, snapLoaded, clientKey, pkg]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === 'loading' ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Pembayaran</h2>
          </div>
          {step !== 'loading' && (
            <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <CardContent className="p-6">
          {/* FORM STEP */}
          {step === 'form' && (
            <div className="flex flex-col gap-5">
              {/* Package Summary */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <p className="text-sm font-semibold text-orange-800">{pkg.name}</p>
                <p className="text-2xl font-extrabold text-orange-600 mt-1">{pkg.priceFormatted}</p>
                <p className="text-xs text-orange-500 mt-0.5">{pkg.period}</p>
              </div>

              {/* Customer Form */}
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="pay-name" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    <User className="w-3.5 h-3.5 inline mr-1.5" />Nama Lengkap
                  </Label>
                  <Input
                    id="pay-name"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="pay-email" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    <Mail className="w-3.5 h-3.5 inline mr-1.5" />Email
                  </Label>
                  <Input
                    id="pay-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="h-11"
                  />
                </div>

                <div>
                  <Label htmlFor="pay-phone" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    <Phone className="w-3.5 h-3.5 inline mr-1.5" />Nomor HP
                  </Label>
                  <Input
                    id="pay-phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{errorMsg}</p>
                </div>
              )}

              {/* Pay Button */}
              <Button
                onClick={handlePay}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg shadow-orange-500/25"
              >
                <Lock className="w-4 h-4 mr-2" />
                Bayar {pkg.priceFormatted}
              </Button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Lock className="w-3 h-3" />
                <span>Pembayaran aman & terenkripsi via Midtrans</span>
              </div>
            </div>
          )}

          {/* LOADING STEP */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="text-sm font-medium text-gray-600">Memproses pembayaran...</p>
              <p className="text-xs text-gray-400">Menyiapkan halaman pembayaran</p>
            </div>
          )}

          {/* PENDING STEP */}
          {step === 'pending' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Menunggu Pembayaran</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Silakan selesaikan pembayaran Anda. Sistem akan otomatis mengaktifkan akun Anda setelah pembayaran berhasil.
              </p>
              <Button
                onClick={onClose}
                className="mt-2 bg-gray-900 hover:bg-gray-800 text-white"
              >
                Kembali
              </Button>
            </div>
          )}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pembayaran Berhasil!</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Terima kasih! Paket <span className="font-semibold text-orange-600">{pkg.name}</span> sudah aktif. Silakan login untuk mulai menggunakan aplikasi.
              </p>
              <Button
                onClick={onClose}
                className="mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" /> Selesai
              </Button>
            </div>
          )}

          {/* ERROR STEP */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Pembayaran Gagal</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                {errorMsg || 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.'}
              </p>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={onClose}>
                  Kembali
                </Button>
                <Button
                  onClick={() => { setErrorMsg(''); setStep('form'); }}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
