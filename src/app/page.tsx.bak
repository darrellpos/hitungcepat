'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator } from 'lucide-react'
import { getAuthUser } from '@/lib/auth'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { calculateCuts } from '@/lib/cutting-engine'
import type { Customer, Paper, CuttingResult } from '@/lib/cutting-engine'
import { CuttingResults } from '@/components/cutting-results'

// Calculator Page Component
function CalculatorPage() {
  const [paperWidth, setPaperWidth] = useState('')
  const [paperHeight, setPaperHeight] = useState('')
  const [cutWidth, setCutWidth] = useState('')
  const [cutHeight, setCutHeight] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [selectedPaperId, setSelectedPaperId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [papers, setPapers] = useState<Paper[]>([])
  const [grammage, setGrammage] = useState('')
  const [pricePerSheet, setPricePerSheet] = useState('')
  const [quantity, setQuantity] = useState('')
  const [isCustomPaper, setIsCustomPaper] = useState(false)
  const [results, setResults] = useState<CuttingResult | null>(null)
  const [optimizationMode, setOptimizationMode] = useState<'fast' | 'maximal'>('maximal')
  const [isCalculating, setIsCalculating] = useState(false)

  useEffect(() => {
    fetch('/api/customers')
      .then(res => {
        if (!res.ok) {
          console.error('Error fetching customers:', res.status)
          return []
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCustomers(data)
        } else {
          console.error('Invalid customers data:', data)
          setCustomers([])
        }
      })
      .catch(err => {
        console.error('Error fetching customers:', err)
        setCustomers([])
      })

    fetch('/api/papers')
      .then(res => {
        if (!res.ok) {
          console.error('Error fetching papers:', res.status)
          return []
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setPapers(data)
        } else {
          console.error('Invalid papers data:', data)
          setPapers([])
        }
      })
      .catch(err => {
        console.error('Error fetching papers:', err)
        setPapers([])
      })
  }, [])

  const selectedPaper = papers.find(p => p.id === selectedPaperId)
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)

  useEffect(() => {
    if (selectedPaper) {
      requestAnimationFrame(() => {
        setGrammage(selectedPaper.grammage.toString())
        setPricePerSheet((selectedPaper.pricePerRim / 500).toString())
        setPaperWidth(selectedPaper.width.toString())
        setPaperHeight(selectedPaper.height.toString())
        setIsCustomPaper(false)
      })
    }
  }, [selectedPaper])

  const handlePaperChange = (value: string) => {
    if (value === 'custom') {
      setSelectedPaperId('custom')
      setIsCustomPaper(true)
      setPaperWidth('')
      setPaperHeight('')
      setGrammage('')
      setPricePerSheet('')
    } else {
      setSelectedPaperId(value)
      setIsCustomPaper(false)
    }
  }

  const handleCalculateCuts = async () => {
    setIsCalculating(true)

    // Small delay to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 50))

    const pw = parseFloat(paperWidth)
    const ph = parseFloat(paperHeight)
    const cw = parseFloat(cutWidth)
    const ch = parseFloat(cutHeight)
    const qty = parseInt(quantity) || 0
    const price = parseFloat(pricePerSheet) || 0

    if (!pw || !ph || !cw || !ch) {
      alert('Mohon lengkapi semua ukuran!')
      setIsCalculating(false)
      return
    }

    if (cw > pw || ch > ph) {
      alert('Ukuran potongan lebih besar dari ukuran kertas!')
      setIsCalculating(false)
      return
    }

    const result = calculateCuts({
      paperWidth: pw,
      paperHeight: ph,
      cutWidth: cw,
      cutHeight: ch,
      quantity: qty,
      pricePerSheet: price,
      optimizationMode,
      customerName: selectedCustomer?.name || '',
      paperMaterial: selectedPaper?.name || '',
      grammage: selectedPaper?.grammage || 0,
    })

    setResults(result)
    setIsCalculating(false)
  }

  return (
    <DashboardLayout
      title="Potong Kertas"
      subtitle="Kalkulator pemotongan kertas profesional"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Informasi Cetak</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Cetakan / Customer
              </label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Bahan Kertas
              </label>
              <Select value={selectedPaperId} onValueChange={handlePaperChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kertas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Custom (Input Manual)
                    </div>
                  </SelectItem>
                  {papers.map((paper) => (
                    <SelectItem key={paper.id} value={paper.id}>
                      {paper.name} ({paper.width}×{paper.height} cm, {paper.grammage} gsm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Gramatur (gsm)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="150"
                  value={grammage}
                  onChange={(e) => setGrammage(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Harga / Lembar (Rp)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={pricePerSheet}
                  onChange={(e) => setPricePerSheet(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            {pricePerSheet && (
              <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span className="font-medium">Harga per Rim (500 lembar):</span>{' '}
                <span className="text-emerald-600 font-semibold">
                  Rp {(parseFloat(pricePerSheet) * 500).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </p>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Ukuran Kertas</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lebar Kertas (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="21.0"
                  value={paperWidth}
                  onChange={(e) => setPaperWidth(e.target.value)}
                  disabled={!isCustomPaper}
                  className={`w-full border rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isCustomPaper
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300'
                      : 'border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tinggi Kertas (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="29.7"
                  value={paperHeight}
                  onChange={(e) => setPaperHeight(e.target.value)}
                  disabled={!isCustomPaper}
                  className={`w-full border rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    !isCustomPaper
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300'
                      : 'border-slate-300'
                  }`}
                />
              </div>
            </div>
            {selectedPaper && !isCustomPaper && (
              <p className="text-xs text-blue-600 flex items-center gap-1 mt-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ukuran otomatis dari {selectedPaper.name} ({selectedPaper.width}×{selectedPaper.height} cm, {selectedPaper.grammage} gsm)
              </p>
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Ukuran Potongan</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lebar Potongan (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="10.0"
                  value={cutWidth}
                  onChange={(e) => setCutWidth(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tinggi Potongan (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="15.0"
                  value={cutHeight}
                  onChange={(e) => setCutHeight(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Mode Optimasi</h2>
            <div>
              <Select value={optimizationMode} onValueChange={(v: any) => setOptimizationMode(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">Cepat (Greedy)</SelectItem>
                  <SelectItem value="maximal">Maksimal (Brute Force)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Jumlah</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Jumlah Cetakan yang Diperlukan
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCalculateCuts}
                disabled={isCalculating}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isCalculating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Menghitung...
                  </>
                ) : (
                  'Hitung Potongan'
                )}
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (selectedCustomer?.name) params.set('printName', selectedCustomer.name)
                  if (selectedCustomerId) params.set('customerId', selectedCustomerId)
                  if (paperWidth) params.set('paperLength', paperWidth)
                  if (paperHeight) params.set('paperWidth', paperHeight)
                  if (quantity) params.set('quantity', quantity)
                  if (selectedPaperId) params.set('paperId', selectedPaperId)
                  if (pricePerSheet) params.set('pricePerSheet', pricePerSheet)
                  window.location.href = `/hitung-cetakan?${params.toString()}`
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" />
                Hitung Cetakan
              </button>
            </div>
          </div>
        </div>

        {results ? (
          <CuttingResults results={results} />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">Masukkan ukuran dan klik &quot;Hitung Potongan&quot;</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
      try {
        const authUser = getAuthUser()
        setUser(authUser)
      } catch (error) {
        console.error('Error getting auth user:', error)
        setUser(null)
      }
    })
  }, [])

  useEffect(() => {
    if (mounted && !user) {
      router.push('/login')
    }
  }, [mounted, user, router])

  if (!mounted) {
    return null
  }

  if (!user) {
    return null
  }

  return <CalculatorPage />
}
