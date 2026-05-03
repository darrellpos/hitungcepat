'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Calculator,
  DollarSign,
  Zap,
  Monitor,
  Smartphone,
  Shield,
  X,
  CheckCircle2,
  ChevronRight,
  Star,
  TrendingUp,
  Package,
  MousePointerClick,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
function FadeIn({
  children,
  delay = 0,
  className = '',
  direction = 'up',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  const dirMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };
  const { x, y } = dirMap[direction];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={isInView ? { opacity: 0, x, y } : false}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ end, suffix = '', prefix = '', duration = 2000 }: { end: number; suffix?: string; prefix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.span
      ref={ref}
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {isInView ? (
        <Counter end={end} suffix={suffix} prefix={prefix} duration={duration} />
      ) : (
        <span>{prefix}{end.toLocaleString('id-ID')}{suffix}</span>
      )}
    </motion.span>
  );
}

function Counter({ end, suffix, prefix, duration }: { end: number; suffix: string; prefix: string; duration: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useInView(ref, { once: true });

  if (!started.current) {
    started.current = true;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return <span ref={ref}>{prefix}{count.toLocaleString('id-ID')}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/*  Section Wrapper                                                    */
/* ------------------------------------------------------------------ */
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`w-full py-16 md:py-24 px-4 md:px-8 ${className}`}>
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature Card                                                       */
/* ------------------------------------------------------------------ */
function FeatureCard({
  icon: Icon,
  title,
  desc,
  delay = 0,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  delay?: number;
}) {
  return (
    <FadeIn delay={delay}>
      <Card className="card-tap group relative overflow-hidden border-0 bg-white shadow-lg hover:shadow-2xl transition-all duration-500 h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardContent className="relative p-6 pt-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:scale-110 transition-transform duration-500">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-gray-600 leading-relaxed text-sm">{desc}</p>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing Card                                                       */
/* ------------------------------------------------------------------ */
function PricingCard({
  title,
  price,
  period,
  description,
  descriptionExtra,
  features,
  popular = false,
  periodBelow = false,
  delay = 0,
  onSelect,
}: {
  title: string;
  price: string;
  period: string;
  description: string;
  descriptionExtra?: string;
  features: string[];
  popular?: boolean;
  periodBelow?: boolean;
  delay?: number;
  onSelect: () => void;
}) {
  return (
    <FadeIn delay={delay}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="h-full"
      >
      <Card
        onClick={onSelect}
        className={`relative overflow-hidden h-full flex flex-col cursor-pointer transition-all duration-500 hover:-translate-y-2 active:shadow-xl ${
          popular
            ? 'border-2 border-orange-500 shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/40'
            : 'border border-gray-200 shadow-lg hover:shadow-xl'
        }`}
      >
        {popular && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-amber-500" />
        )}
        <CardHeader className="relative p-4 pb-3 text-center">
          {popular && (
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 px-3 py-0.5 text-xs font-semibold shadow-lg">
              <Star className="w-3 h-3 mr-1" /> Hemat Banget!
            </Badge>
          )}
          <h3 className="text-base font-bold text-gray-900 mt-1">{title}</h3>
          <p className="text-gray-500 text-xs mt-0.5">{description}{descriptionExtra && <><br />{descriptionExtra}</>}</p>
          <div className="mt-3">
            <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {price}
            </span>
            {periodBelow ? (
              <p className="text-gray-400 text-xs mt-1">{period}</p>
            ) : (
              <span className="text-gray-500 text-xs ml-1">/{period}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="relative p-4 pt-0 flex-1">
          <Separator className="mb-4" />
          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="relative p-4 pt-0">
          <Button
            className={`ripple-btn w-full py-2 text-xs font-semibold transition-all duration-300 ${
              popular
                ? 'cta-glow bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30'
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            Pilih Paket <ArrowRight className="ml-1.5 w-3 h-3" />
          </Button>
        </CardFooter>
      </Card>
      </motion.div>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonial Card                                                   */
/* ------------------------------------------------------------------ */
function TestimonialCard({
  name,
  role,
  quote,
  avatar,
  delay = 0,
}: {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  delay?: number;
}) {
  return (
    <FadeIn delay={delay}>
      <Card className="card-tap bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 h-full">
        <CardContent className="p-6 flex flex-col gap-4">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-gray-700 text-sm leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
          <div className="flex items-center gap-3 mt-auto pt-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-sm">
              {avatar}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{name}</p>
              <p className="text-gray-500 text-xs">{role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  );
}

/* ------------------------------------------------------------------ */
/*  Login Page                                                         */
/* ------------------------------------------------------------------ */
function LoginPage({ onBack }: { onBack: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50/80 via-white to-amber-50/50 relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-orange-200/25 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-amber-200/20 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Darrell</span>
              <span className="text-gray-900"> POS</span>
            </span>
          </button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="mr-1 w-4 h-4" />
            Kembali
          </Button>
        </div>
      </nav>

      {/* Login content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-2xl shadow-orange-500/10 overflow-hidden">
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-4"
              >
                <Printer className="w-9 h-9 text-white" />
              </motion.div>
              <h1 className="text-2xl font-extrabold text-white">Selamat Datang!</h1>
              <p className="text-white/80 text-sm mt-1">Masuk ke akun Darrell POS kamu</p>
            </div>

            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Email */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@email.com"
                      className="pl-10 h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                      required
                    />
                  </div>
                </motion.div>

                {/* Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Masukkan password"
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-orange-400 focus:ring-orange-400/20 transition-all duration-300"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400/20" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Ingat saya</span>
                  </label>
                  <button type="button" className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors">
                    Lupa password?
                  </button>
                </div>

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="ripple-btn cta-glow w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-base shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-300"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        Masuk <ArrowRight className="ml-2 w-4 h-4" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <Separator />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
                  atau
                </span>
              </div>

              {/* Register link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                className="text-center"
              >
                <p className="text-sm text-gray-600">
                  Belum punya akun?{' '}
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                    Daftar sekarang
                  </a>
                </p>
              </motion.div>
            </CardContent>
          </Card>

          {/* Footer trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="flex items-center justify-center gap-4 mt-6"
          >
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Shield className="w-3.5 h-3.5 text-green-500" />
              <span>Data terenkripsi</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Lock className="w-3.5 h-3.5 text-green-500" />
              <span>Koneksi aman</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full py-4 text-center">
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Darrell POS. All rights reserved.
        </p>
      </footer>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
const WHATSAPP_URL = 'https://wa.me/6285888082208?text=Halo%20Darrell%20POS%2C%20saya%20tertarik%20untuk%20berlangganan!';

interface PackageInfo {
  type: string;
  name: string;
  price: number;
  priceFormatted: string;
  period: string;
}

const PACKAGES: Record<string, PackageInfo> = {
  bulanan: { type: 'bulanan', name: 'Langganan Bulanan', price: 128000, priceFormatted: 'Rp 128.000', period: 'per bulan' },
  tahunan: { type: 'tahunan', name: 'Langganan Tahunan', price: 888000, priceFormatted: 'Rp 888.000', period: 'per tahun' },
  lifetime: { type: 'lifetime', name: 'Tanpa Langganan', price: 3888000, priceFormatted: 'Rp 3.888.000', period: 'sekali bayar' },
};

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginTransition, setLoginTransition] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<PackageInfo | null>(null);

  const router = useRouter();

  const goToLogin = () => {
    setLoginTransition(true);
    setTimeout(() => {
      router.push('/login');
    }, 500);
  };

  const openPayment = (pkgType: string) => {
    const pkg = PACKAGES[pkgType];
    if (pkg) {
      setSelectedPkg(pkg);
      setPaymentOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50/50 via-white to-white">
      {/* =================== TRANSITION OVERLAY =================== */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loginTransition ? 1 : 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-[100] bg-gradient-to-br from-orange-500 to-amber-500 pointer-events-none"
        style={{ pointerEvents: loginTransition ? 'auto' : 'none' }}
      />

      <motion.div
        initial={false}
        animate={loginTransition ? { opacity: 0, scale: 0.95, filter: 'blur(8px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.4 }}
      >
      {/* =================== NAVBAR =================== */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Darrell</span>
              <span className="text-gray-900"> POS</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#fitur" className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Fitur</a>
            <a href="#keunggulan" className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Keunggulan</a>
            <a href="#harga" className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Harga</a>
            <a href="#testimoni" className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors">Testimoni</a>
            <Button onClick={goToLogin} className="ripple-btn bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300">
              Masuk <ChevronRight className="ml-1 w-4 h-4" />
            </Button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <div className="w-5 h-5 flex flex-col justify-center gap-1">
              <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 w-5 bg-gray-700 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-100 bg-white"
          >
            <div className="px-4 py-4 flex flex-col gap-3">
              <a href="#fitur" onClick={() => setMobileMenuOpen(false)} className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 py-2">Fitur</a>
              <a href="#keunggulan" onClick={() => setMobileMenuOpen(false)} className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 py-2">Keunggulan</a>
              <a href="#harga" onClick={() => setMobileMenuOpen(false)} className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 py-2">Harga</a>
              <a href="#testimoni" onClick={() => setMobileMenuOpen(false)} className="nav-link text-sm font-medium text-gray-600 hover:text-orange-600 py-2">Testimoni</a>
              <Button onClick={goToLogin} className="w-full ripple-btn bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white mt-1">
                Masuk <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </nav>

      {/* =================== HERO =================== */}
      <section className="relative w-full overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-12 md:pt-20 pb-16 md:pb-24">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left - Text */}
            <FadeIn direction="right">
              <div className="flex flex-col gap-6">
                <Badge variant="secondary" className="w-fit bg-orange-100 text-orange-700 border-orange-200 px-3 py-1 text-xs font-semibold">
                  <Zap className="w-3 h-3 mr-1" /> Sistem Hitung Cepat Percetakan
                </Badge>

                <h1 className="text-4xl md:text-5xl lg:text-6xl text-gray-900 leading-tight" style={{ fontWeight: 900 }}>
                  Pusing Hitung{' '}
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Cetakan</span>{' '}
                  Sampai Sering{' '}
                  <span className="bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">Rugi</span>?
                </h1>

                <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                  Pakai <span className="font-bold text-gray-900">Darrell POS</span>! Dulu cuma yang ahli yang bisa hitung modal cetak.
                  Sekarang, <span className="font-semibold text-orange-600">siapapun bisa</span> jadi pengusaha percetakan sukses!
                </p>

                <p className="text-base text-gray-500 leading-relaxed">
                  Lupakan kalkulator manual yang bikin pusing. Dengan Darrell POS, hitung modal jadi semudah mengetik.
                </p>



                {/* Trust signals */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                  <div className="flex items-center gap-1.5 font-bold" style={{ fontSize: '1.375rem', color: '#000' }}>
                    <Shield className="w-5 h-5 text-green-500" />
                    <span className="font-extrabold">Tanpa ikatan kontrak</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold" style={{ fontSize: '1.375rem', color: '#000' }}>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-extrabold">Bisa batal kapan saja</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold" style={{ fontSize: '1.375rem', color: '#000' }}>
                    <X className="w-5 h-5 text-red-400" />
                    <span className="font-extrabold">Tanpa denda</span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Right - Hero image */}
            <FadeIn direction="left" delay={0.2}>
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-orange-500/10 border border-orange-100">
                  <img
                    src="/hero-printing.png"
                    alt="Darrell POS - Sistem Kasir Percetakan"
                    className="w-full h-auto object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-900/10 to-transparent" />
                </div>
                {/* Floating badge */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-4 -left-4 md:-left-6 bg-white rounded-xl shadow-xl p-3 md:p-4 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Profit Naik</p>
                      <p className="text-lg font-bold text-green-600">+40%</p>
                    </div>
                  </div>
                </motion.div>
                {/* Another floating badge */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                  className="absolute -top-4 -right-4 md:-right-6 bg-white rounded-xl shadow-xl p-3 md:p-4 border border-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Calculator className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Hitung Cepat</p>
                      <p className="text-lg font-bold text-orange-600">&lt; 3 detik</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* =================== STATS BAR =================== */}
      <section className="w-full bg-gradient-to-r from-gray-900 to-gray-800 py-8 md:py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: 7168, suffix: '+', label: 'Pengguna Aktif', icon: Printer },
              { value: 98, suffix: '%', label: 'Tingkat Kepuasan', icon: Star },
              { value: 1000000, suffix: '+', label: 'Transaksi Sukses', icon: Package },
              { value: 24, suffix: '/7', label: 'Support Online', icon: Shield },
            ].map((stat, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="flex flex-col md:flex-row items-center md:items-center gap-2 md:gap-3 text-center md:text-left">
                  <stat.icon className="w-8 h-8 text-orange-400 hidden md:block" />
                  <div>
                    <p className="text-2xl md:text-3xl font-extrabold text-white">
                      <CountUp end={stat.value} suffix={stat.suffix} />
                    </p>
                    <p className="text-xs md:text-sm text-gray-400 mt-0.5">{stat.label}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* =================== FITUR =================== */}
      <Section id="fitur" className="bg-white">
        <FadeIn>
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-4">
              Fitur Unggulan
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Hitung Modal Jadi{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Semudah Mengetik</span>
            </h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto text-base md:text-lg">
              Semua yang kamu butuhkan untuk mengelola bisnis percetakan, dalam satu aplikasi yang powerful.
            </p>
          </div>
        </FadeIn>

        {/* 2 Fitur Images - small */}
        <FadeIn delay={0.05}>
          <div className="flex justify-center gap-3 sm:gap-5 mb-10 md:mb-12">
            {[
              { src: '/fitur-small-1.jpeg', alt: 'Tampilan aplikasi Darrell POS' },
              { src: '/fitur-small-2.jpeg', alt: 'Fitur kalkulasi Darrell POS' },
            ].map((img, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05, y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative rounded-xl overflow-hidden shadow-md shadow-orange-500/10 border border-orange-100 w-[160px] sm:w-[200px] md:w-[260px]"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-auto object-contain"
                />
              </motion.div>
            ))}
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <FeatureCard
            icon={MousePointerClick}
            title="Update Harga Sekali Klik"
            desc="Update harga kertas dan ongkos cetak sekali klik. Tidak perlu edit satu-satu, semua otomatis tersinkronisasi."
            delay={0}
          />
          <FeatureCard
            icon={Calculator}
            title="Ketik Ukuran → Langsung Harga"
            desc="Ketik ukuran bahan, aplikasi langsung kasih harga modal. Otomatis dan akurat, tanpa kalkulator manual."
            delay={0.15}
          />
          <FeatureCard
            icon={DollarSign}
            title="Tentukan Profit, Harga Jual Muncul"
            desc="Tentukan profit yang kamu mau, harga jual langsung muncul. Kontrol penuh atas margin keuntunganmu."
            delay={0.3}
          />
        </div>
      </Section>

      {/* =================== KEUNGGULAN =================== */}
      <Section id="keunggulan" className="bg-gradient-to-b from-orange-50/30 to-white">
        <FadeIn>
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-4">
              Kenapa Darrell POS?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Cepat, Akurat,</span> dan Fleksibel!
            </h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto text-base md:text-lg">
              Bisa diakses via Desktop maupun HP, kapan saja dan di mana saja.
            </p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {[
            {
              icon: Monitor,
              title: 'Akses via Desktop',
              desc: 'Tampilan penuh yang nyaman untuk penggunaan di kantor atau toko. Semua fitur lengkap tersedia.',
              color: 'from-orange-500 to-red-500',
            },
            {
              icon: Smartphone,
              title: 'Akses via HP',
              desc: 'Mobile-friendly! Kelola bisnis percetakanmu langsung dari smartphone, di mana saja kamu berada.',
              color: 'from-amber-500 to-orange-500',
            },
            {
              icon: Zap,
              title: 'Kecepatan Tinggi',
              desc: 'Proses kalkulasi instan. Tidak perlu menunggu lama, semua perhitungan selesai dalam hitungan detik.',
              color: 'from-yellow-500 to-amber-500',
            },
            {
              icon: Shield,
              title: 'Data Aman',
              desc: 'Data bisnismu tersimpan dengan aman. Backup otomatis dan enkripsi untuk keamanan maksimal.',
              color: 'from-green-500 to-emerald-500',
            },
            {
              icon: Download,
              title: 'Install di Windows & Mac',
              desc: 'Bisa diinstall langsung di komputer Windows dan MacBook. Tampil seperti aplikasi desktop asli.',
              color: 'from-blue-500 to-indigo-500',
            },
            {
              icon: Smartphone,
              title: 'Install di Android & iOS',
              desc: 'Install langsung di HP Android dan iPhone. Gampang digunakan, tidak usah buka browser lagi.',
              color: 'from-purple-500 to-pink-500',
            },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="advantage-tap group flex items-start gap-4 p-5 rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200 cursor-pointer">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                  <p className="text-gray-600 text-sm mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* =================== CARA KERJA =================== */}
      <Section className="bg-white">
        <FadeIn>
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-4">
              Cara Kerja
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Semudah{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">1-2-3</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {[
            { step: '01', title: 'Masukkan Spesifikasi', desc: 'Ketik ukuran bahan, jenis kertas, dan jumlah cetak yang diinginkan.', icon: Package },
            { step: '02', title: 'Sistem Hitung Otomatis', desc: 'Aplikasi langsung menghitung modal berdasarkan spesifikasi yang dimasukkan.', icon: Calculator },
            { step: '03', title: 'Tentukan & Jual', desc: 'Atur profit yang diinginkan, harga jual otomatis muncul. Siap cetak!', icon: DollarSign },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 0.15}>
              <div className="relative text-center">
                {/* Step number */}
                <div className="text-7xl font-black text-orange-100 absolute -top-4 left-1/2 -translate-x-1/2 select-none">
                  {item.step}
                </div>
                <div className="relative z-10 flex flex-col items-center gap-3 pt-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed max-w-xs">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-10 -right-4 w-8">
                    <ChevronRight className="w-8 h-8 text-orange-300" />
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* =================== HARGA =================== */}
      <Section id="harga" className="bg-gradient-to-b from-orange-50/40 to-white">
        <FadeIn>
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-4">
              Pilihan Paket
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Paket Harga{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Tanpa Ribet</span>
            </h2>
            <p className="text-gray-600 mt-4 max-w-2xl mx-auto text-base md:text-lg">
              Pilih paket yang sesuai dengan kebutuhan bisnismu. Bisa batal kapan saja!
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-5xl mx-auto">
          <PricingCard
            title="Demo Gratis"
            price="Rp 0"
            period="gratis"
            description="Coba dulu sebelum berlangganan"
            features={[
              'Semua fitur kalkulasi cetak',
              'Coba selama 3 hari',
              'Tanpa kartu kredit',
              'Akses Desktop & Mobile',
              'Boleh langganan kapan saja',
            ]}
            delay={0}
            onSelect={goToLogin}
          />
          <PricingCard
            title="Langganan Bulanan"
            price="Rp 128.000"
            period="per bulan"
            description="Langganan bulanan, sangat fleksibel"
            periodBelow
            features={[
              'Semua fitur kalkulasi cetak',
              'Update harga kertas & ongkos',
              'Hitung otomatis harga modal',
              'Akses Desktop & Mobile',
              <span className="font-bold">Boleh langganan 1 bulan saja</span>,
              'Tidak ada biaya denda sama sekali',
            ]}
            delay={0}
            onSelect={() => openPayment('bulanan')}
          />
          <PricingCard
            title="Langganan Tahunan"
            price="Rp 888.000"
            period="per tahun"
            description="Hanya Rp 74.000/bulan"
            descriptionExtra="— hemat 37%!"
            popular
            periodBelow
            features={[
              'Semua fitur kalkulasi cetak',
              'Update harga kertas & ongkos',
              'Hitung otomatis harga modal',
              'Akses Desktop & Mobile',
              'Priority Support 24/7',
              'Laporan bulanan lengkap',
              'Backup data otomatis',
            ]}
            delay={0.15}
            onSelect={() => openPayment('tahunan')}
          />
          <PricingCard
            title="Tanpa Langganan"
            price="Rp 3.888.000"
            period="sekali bayar"
            description="Beli putus, tidak perlu langganan"
            periodBelow
            features={[
              'Semua fitur kalkulasi cetak',
              'Update harga kertas & ongkos',
              'Hitung otomatis harga modal',
              'Akses Desktop & Mobile',
              'Beli sekali, pakai selamanya',
              'Tidak ada biaya berlangganan',
              'Priority Support 24/7',
            ]}
            delay={0}
            onSelect={() => openPayment('lifetime')}
          />
        </div>

        {/* Guarantee */}
        <FadeIn delay={0.3}>
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-6 py-3">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                Tanpa Ikatan Apapun! Bisa batal kapan saja tanpa denda.
              </span>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* =================== TESTIMONI =================== */}
      <Section id="testimoni" className="bg-white">
        <FadeIn>
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-4">
              Testimoni
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Dipercaya{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Ratusan Pengusaha</span> Percetakan
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
          <TestimonialCard
            name="Budi Santoso"
            role="Pemilik CV Cetak Jaya"
            quote="Dulu hitung modal cetak pakai kalkulator, sering salah dan rugi. Sekarang pakai Darrell POS, semua otomatis dan akurat. Profit naik 40%!"
            avatar="BS"
            delay={0}
          />
          <TestimonialCard
            name="Siti Rahayu"
            role="Pengusaha Percetakan Mandiri"
            quote="Aplikasinya super mudah dipakai. Saya yang nggak paham komputer pun bisa langsung pakai. Harga paketnya juga sangat terjangkau."
            avatar="SR"
            delay={0.15}
          />
          <TestimonialCard
            name="Ahmad Fauzi"
            role="Owner Print House Express"
            quote="Support-nya responsif banget! Setiap ada pertanyaan langsung dijawab. Darrell POS memang solusi tepat untuk percetakan."
            avatar="AF"
            delay={0.3}
          />
          <TestimonialCard
            name="Gunawan"
            role="Pemilik One Printing"
            quote="Bayar 1 bulan aja gpp, bulan berikutnya tidak usah, tidak ada denda. Seperti langganan Netflix. Fleksibel banget!"
            avatar="GP"
            delay={0.45}
          />
        </div>
      </Section>

      {/* =================== CTA =================== */}
      <section className="w-full bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 py-16 md:py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border-2 border-white rounded-full" />
          <div className="absolute bottom-10 right-10 w-60 h-60 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-white rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Siap Bikin Bisnis Cetakmu<br className="hidden md:block" /> Lebih{' '}
              <span className="underline decoration-white/50 decoration-4 underline-offset-4">Cuan</span> Hari Ini?
            </h2>
            <p className="text-white/90 mt-6 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Bergabung dengan ratusan pengusaha percetakan yang sudah merasakan kemudahan Darrell POS.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Button
                size="lg"
                onClick={goToLogin}
                className="ripple-btn ripple-btn-dark cta-glow bg-white text-orange-600 hover:bg-orange-50 shadow-2xl shadow-orange-700/20 hover:shadow-3xl transition-all duration-300 text-lg font-bold py-7 px-10"
              >
                Coba Gratis Sekarang <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                asChild
                className="ripple-btn bg-green-500 hover:bg-green-600 text-white font-bold shadow-lg shadow-green-700/25 hover:shadow-xl transition-all duration-300 text-lg py-7 px-10"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 w-5 h-5" /> WhatsApp Admin
                </a>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* =================== FAQ =================== */}
      <Section className="bg-white">
        <FadeIn>
          <div className="text-center mb-12 md:mb-16">
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Pertanyaan yang{' '}
              <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Sering Ditanyakan</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            {
              q: 'Apakah bisa dicoba dulu sebelum berlangganan?',
              a: 'Tentu! Kami menyediakan masa trial gratis agar kamu bisa merasakan semua fitur Darrell POS sebelum memutuskan berlangganan.',
            },
            {
              q: 'Bagaimana cara berlangganan?',
              a: 'Sangat mudah! Cukup DM kami, pilih paket yang sesuai, dan lakukan pembayaran. Akun kamu akan langsung aktif.',
            },
            {
              q: 'Apakah data saya aman?',
              a: 'Keamanan data adalah prioritas kami. Semua data dienkripsi dan kami melakukan backup otomatis secara berkala.',
            },
            {
              q: 'Bisa dibatalkan kapan saja?',
              a: 'Ya, tanpa ikatan apapun! Kamu bisa membatalkan langganan kapan saja tanpa denda atau biaya tambahan.',
            },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="faq-tap p-5 rounded-xl bg-gradient-to-br from-orange-50/50 to-amber-50/50 border border-orange-100 cursor-pointer">
                <h4 className="font-bold text-gray-900 text-sm md:text-base flex items-start gap-2">
                  <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    Q
                  </span>
                  {item.q}
                </h4>
                <p className="text-gray-600 text-sm mt-2 ml-8 leading-relaxed">{item.a}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* =================== FOOTNOTE / FOOTER =================== */}
      <footer className="w-full bg-black text-gray-400 mt-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/20">
                  <Printer className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold tracking-tight">
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Darrell</span>
                  <span className="text-white"> POS</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sistem kasir percetakan #1 di Indonesia. Hitung modal, tentukan profit, dan kelola bisnis cetakmu dengan mudah.
              </p>
            </div>

            {/* Produk */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Produk</h4>
              <ul className="space-y-2.5">
                <li><a href="#fitur" className="text-sm text-gray-500 hover:text-orange-400 transition-colors">Fitur</a></li>
                <li><a href="#harga" className="text-sm text-gray-500 hover:text-orange-400 transition-colors">Harga</a></li>
                <li><a href="#testimoni" className="text-sm text-gray-500 hover:text-orange-400 transition-colors">Testimoni</a></li>
                <li><a href="#faq" className="text-sm text-gray-500 hover:text-orange-400 transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Perusahaan */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Perusahaan</h4>
              <ul className="space-y-2.5">
                <li><a href="#keunggulan" className="text-sm text-gray-500 hover:text-orange-400 transition-colors">Tentang Kami</a></li>
                <li><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-orange-400 transition-colors">Kontak</a></li>
                <li><span className="text-sm text-gray-500">Kebijakan Privasi</span></li>
                <li><span className="text-sm text-gray-500">Syarat & Ketentuan</span></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Support</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-orange-400 transition-colors flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </li>
                <li>
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-green-500" /> 24/7 Online
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-8 border-t border-gray-800">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-gray-600 text-center md:text-left">
                &copy; {new Date().getFullYear()} Darrell POS. All rights reserved.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span>Data Terenkripsi</span>
                </div>
                <span className="text-gray-700">•</span>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Lock className="w-3 h-3 text-green-500" />
                  <span>Koneksi Aman</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      </motion.div>


      </div>
  );
}
