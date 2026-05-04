'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronDown,
  Copy,
  Check,
  CreditCard,
  Building2,
  Wallet,
  Shield,
  Smartphone,
  Landmark,
  QrCode,
} from 'lucide-react';

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

/* ─── data rekening per bank ─── */
interface BankAccount {
  bank: string;
  number: string;
  holder: string;
  code?: string;
}

const TRANSFER_ACCOUNTS: BankAccount[] = [
  { bank: 'Bank BCA', number: '1234 5678 9012', holder: 'PT Darrell Soft Indonesia', code: '014' },
  { bank: 'Bank BNI', number: '0123 4567 8901', holder: 'PT Darrell Soft Indonesia', code: '009' },
  { bank: 'Bank Mandiri', number: '1300 0123 4567', holder: 'PT Darrell Soft Indonesia', code: '008' },
  { bank: 'Bank BRI', number: '0012 3456 7890', holder: 'PT Darrell Soft Indonesia', code: '002' },
];

const VA_ACCOUNTS: BankAccount[] = [
  { bank: 'Virtual Account BCA', number: '8800 1234 5678 9012', holder: 'PT Darrell Soft Indonesia' },
  { bank: 'Virtual Account Permata', number: '7210 1234 5678 9012', holder: 'PT Darrell Soft Indonesia' },
  { bank: 'Virtual Account BSI', number: '9170 0123 4567 8901', holder: 'PT Darrell Soft Indonesia' },
];

const EMONEY_LIST = [
  { id: 'gopay', label: 'GoPay', desc: 'Bayar melalui aplikasi Gojek → GoPay → Transfer → ke nomor 0812-3456-7890 a.n. Darrell Soft', color: '#00AED6' },
  { id: 'shopeepay', label: 'ShopeePay', desc: 'Bayar melalui aplikasi Shopee → ShopeePay → Transfer → ke nomor 0812-3456-7890 a.n. Darrell Soft', color: '#EE4D2D' },
  { id: 'dana', label: 'DANA', desc: 'Bayar melalui aplikasi DANA → Transfer → ke nomor 0812-3456-7890 a.n. Darrell Soft', color: '#108EE9' },
  { id: 'ovo', label: 'OVO', desc: 'Bayar melalui aplikasi OVO → Transfer → ke nomor 0812-3456-7890 a.n. Darrell Soft', color: '#4C3494' },
];

/* ─── kategori metode bayar ─── */
interface PaymentCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: PaymentCategory[] = [
  { id: 'transfer', label: 'Transfer Bank', icon: <Landmark className="w-4 h-4" />, color: '#3b82f6' },
  { id: 'va', label: 'Virtual Account', icon: <Building2 className="w-4 h-4" />, color: '#8b5cf6' },
  { id: 'emoney', label: 'E-Money', icon: <Wallet className="w-4 h-4" />, color: '#f59e0b' },
  { id: 'debit', label: 'Debit', icon: <CreditCard className="w-4 h-4" />, color: '#10b981' },
  { id: 'kredit', label: 'Kredit', icon: <CreditCard className="w-4 h-4" />, color: '#ef4444' },
  { id: 'qris', label: 'QRIS', icon: <QrCode className="w-4 h-4" />, color: '#06b6d4' },
];

/* ─── komponen utama ─── */
export default function PaymentDialog({ open, onClose, pkg }: PaymentDialogProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setExpanded(null);
      setCopiedId(null);
    }
  }, [open]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, '')).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const toggle = (id: string) => {
    setExpanded(prev => (prev === id ? null : id));
  };

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
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[5%] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-[101]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#141414] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 max-h-[85vh] flex flex-col">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white text-base font-bold">Cara Pembayaran</h2>
                    <p className="text-gray-500 text-[11px]">Pilih metode dan ikuti petunjuk pembayaran</p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-white/10">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Total */}
              <div className="px-6 py-3 bg-gradient-to-r from-orange-500/10 to-red-500/5 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Total Pembayaran</p>
                    <p className="text-xs text-gray-400 mt-0.5">{pkg.name} — {pkg.period}</p>
                  </div>
                  <span className="text-xl font-black text-white">{pkg.priceFormatted}</span>
                </div>
              </div>

              {/* Content — scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">

                {/* ── Transfer Bank ── */}
                <CategoryBlock
                  cat={CATEGORIES[0]}
                  expanded={expanded === 'transfer'}
                  onClick={() => toggle('transfer')}
                >
                  <div className="space-y-2 pt-1">
                    {TRANSFER_ACCOUNTS.map((acc, i) => (
                      <AccountCard key={i} acc={acc} copiedId={copiedId} onCopy={copyToClipboard} prefix="trf" index={i} />
                    ))}
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                      Transfer melalui ATM, Mobile Banking, atau Internet Banking ke rekening di atas. Pastikan nominal transfer sesuai dengan total pembayaran.
                    </p>
                  </div>
                </CategoryBlock>

                {/* ── Virtual Account ── */}
                <CategoryBlock
                  cat={CATEGORIES[1]}
                  expanded={expanded === 'va'}
                  onClick={() => toggle('va')}
                >
                  <div className="space-y-2 pt-1">
                    {VA_ACCOUNTS.map((acc, i) => (
                      <AccountCard key={i} acc={acc} copiedId={copiedId} onCopy={copyToClipboard} prefix="va" index={i} />
                    ))}
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                      Bayar melalui ATM, Mobile Banking, atau Internet Banking menggunakan nomor Virtual Account di atas. Nominal harus exact match.
                    </p>
                  </div>
                </CategoryBlock>

                {/* ── E-Money ── */}
                <CategoryBlock
                  cat={CATEGORIES[2]}
                  expanded={expanded === 'emoney'}
                  onClick={() => toggle('emoney')}
                >
                  <div className="space-y-2 pt-1">
                    {EMONEY_LIST.map((em, i) => (
                      <div key={em.id} className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: em.color }}>
                            {em.label.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-white">{em.label}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{em.desc}</p>
                      </div>
                    ))}
                    <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                      Transfer e-money dari aplikasi masing-masing ke nomor yang tertera. Pastikan nominal sesuai.
                    </p>
                  </div>
                </CategoryBlock>

                {/* ── Debit ── */}
                <CategoryBlock
                  cat={CATEGORIES[3]}
                  expanded={expanded === 'debit'}
                  onClick={() => toggle('debit')}
                >
                  <div className="pt-1">
                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Shield className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-semibold text-white">Kartu Debit Online</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Gunakan kartu debit Visa atau Mastercard yang sudah aktif fitur transaksi online (debit online / 3DS). Hubungi bank penerbit kartu untuk mengaktifkan fitur ini.
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          <span className="text-gray-300 font-medium">Langkah:</span>
                          <ol className="list-decimal list-inside mt-1 space-y-0.5">
                            <li>Pilih menu &quot;Bayar dengan Kartu Debit&quot;</li>
                            <li>Masukkan nomor kartu debit 16 digit</li>
                            <li>Masukkan expiry date dan CVV</li>
                            <li>Verifikasi OTP dari bank Anda</li>
                            <li>Pembayaran selesai</li>
                          </ol>
                        </p>
                      </div>
                    </div>
                  </div>
                </CategoryBlock>

                {/* ── Kredit ── */}
                <CategoryBlock
                  cat={CATEGORIES[4]}
                  expanded={expanded === 'kredit'}
                  onClick={() => toggle('kredit')}
                >
                  <div className="pt-1">
                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CreditCard className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-semibold text-white">Kartu Kredit</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Diterima: Visa, Mastercard, JCB, dan AMEX. Proses verifikasi instan. Pastikan limit kartu mencukupi.
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <CreditCard className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-semibold text-white">Cicilan 0%</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Tersedia opsi cicilan 3, 6, dan 12 bulan bunga 0% untuk paket Tahunan dan Lifetime. Pada langkah pembayaran, pilih tenor cicilan yang diinginkan.
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          <span className="text-gray-300 font-medium">Langkah:</span>
                          <ol className="list-decimal list-inside mt-1 space-y-0.5">
                            <li>Pilih menu &quot;Bayar dengan Kartu Kredit&quot;</li>
                            <li>Masukkan nomor kartu kredit 16 digit</li>
                            <li>Masukkan expiry date dan CVV</li>
                            <li>Pilih tenor cicilan (lumpsum / 3 / 6 / 12 bulan)</li>
                            <li>Verifikasi OTP dari bank Anda</li>
                            <li>Pembayaran selesai</li>
                          </ol>
                        </p>
                      </div>
                    </div>
                  </div>
                </CategoryBlock>

                {/* ── QRIS ── */}
                <CategoryBlock
                  cat={CATEGORIES[5]}
                  expanded={expanded === 'qris'}
                  onClick={() => toggle('qris')}
                >
                  <div className="pt-1">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/5 text-center">
                      {/* QR code placeholder */}
                      <div className="w-40 h-40 mx-auto bg-white rounded-xl flex items-center justify-center mb-3">
                        <div className="text-center">
                          <QrCode className="w-16 h-16 text-gray-800 mx-auto" />
                          <p className="text-[10px] text-gray-500 mt-1 font-medium">Scan QRIS</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-white mb-1">Scan QR Code</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Buka aplikasi mobile banking, e-wallet, atau aplikasi pembayaran lainnya. Scan QR code di atas untuk membayar. QRIS diterima oleh semua bank dan e-wallet di Indonesia.
                      </p>
                    </div>
                    <div className="mt-2 bg-white/5 rounded-lg p-3 border border-white/5">
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        <span className="text-gray-300 font-medium">Aplikasi yang mendukung QRIS:</span> GoPay, ShopeePay, Dana, OVO, LinkAja, M-Banking BCA, BNI, Mandiri, BRI, BSI, dan lainnya.
                      </p>
                    </div>
                  </div>
                </CategoryBlock>

              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-white/10 shrink-0">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-[11px]">
                  <Shield className="w-3 h-3" />
                  <span>Setelah membayar, konfirmasi ke admin via WhatsApp</span>
                </div>
                <button
                  onClick={onClose}
                  className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-orange-500/20"
                >
                  Tutup
                </button>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── sub-components ─── */

function CategoryBlock({
  cat,
  expanded,
  onClick,
  children,
}: {
  cat: PaymentCategory;
  expanded: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-hidden transition-all duration-200">
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-200 ${
          expanded ? 'bg-white/5' : 'hover:bg-white/[0.03]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: expanded ? cat.color : `${cat.color}20`, color: expanded ? 'white' : cat.color }}
          >
            {cat.icon}
          </div>
          <span className={`text-sm font-semibold transition-colors ${expanded ? 'text-white' : 'text-gray-200'}`}>
            {cat.label}
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-4 h-4 transition-colors ${expanded ? 'text-white' : 'text-gray-500'}`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountCard({
  acc,
  copiedId,
  onCopy,
  prefix,
  index,
}: {
  acc: BankAccount;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  prefix: string;
  index: number;
}) {
  const id = `${prefix}-${index}`;
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-white">{acc.bank}</span>
        {copiedId === id ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
            <Check className="w-3 h-3" /> Tersalin
          </span>
        ) : (
          <button
            onClick={() => onCopy(acc.number, id)}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors font-medium"
          >
            <Copy className="w-3 h-3" /> Salin
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono text-gray-200 tracking-wide">{acc.number}</code>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">a.n. <span className="text-gray-400">{acc.holder}</span></p>
    </div>
  );
}
