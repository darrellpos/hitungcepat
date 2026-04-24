'use client'

import { Layers, Plus, Trash2, Printer, RotateCcw, Calculator, Ruler, Info } from 'lucide-react'
import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { getAuthHeaders } from '@/lib/auth'
import { fetcher } from '@/lib/fetcher'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'

interface Finishing {
  id: string
  name: string
  minimumSheets: number
  minimumPrice: number
  additionalPrice: number
  pricePerCm: number
}

interface SelectedFinishing {
  finishing: Finishing
  cost: number
  isMin: boolean
  breakdown: string
}

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors'
const selectClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors bg-white appearance-none cursor-pointer'
const labelClass = 'flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5'

export default function HitungFinishingPage() {
  const { t } = useLanguage()
  const [finishings, setFinishings] = useState<Finishing[]>([])
  const [selectedFinishings, setSelectedFinishings] = useState<SelectedFinishing[]>([])
  const [namaCetakan, setNamaCetakan] = useState('')
  const [jumlahLembar, setJumlahLembar] = useState('')
  const [lebarCm, setLebarCm] = useState('')
  const [tinggiCm, setTinggiCm] = useState('')

  const fetchFinishings = async () => {
    try {
      const response = await fetcher('/api/finishings', { headers: getAuthHeaders() })
      const data = await response.json()
      if (Array.isArray(data)) setFinishings(data)
    } catch (error) {
      console.error('Error fetching finishings:', error)
    }
  }

  useEffect(() => {
    fetchFinishings()
  }, [])

  const calculateFinishingCost = (finishing: Finishing): { cost: number; isMin: boolean; breakdown: string } => {
    const qty = parseInt(jumlahLembar) || 0
    const cw = parseFloat(lebarCm) || 0
    const ch = parseFloat(tinggiCm) || 0

    const minSheets = finishing.minimumSheets
    const minPrice = finishing.minimumPrice
    const hargaLebih = finishing.additionalPrice
    const hargaPerCm = finishing.pricePerCm
    const isPond = finishing.name.toLowerCase().includes('pond')

    if (qty <= 0) {
      return { cost: minPrice, isMin: true, breakdown: `Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}` }
    }

    // Pond type: different calculation (per sheet cutting)
    if (isPond) {
      if (qty <= minSheets) {
        return {
          cost: minPrice,
          isMin: true,
          breakdown: `Qty ${qty} ≤ minim ${minSheets} → Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}`
        }
      }
      const selisih = qty - minSheets
      const tambahan = selisih * hargaLebih
      const total = minPrice + tambahan
      return {
        cost: total,
        isMin: false,
        breakdown: `Min Rp ${minPrice.toLocaleString('id-ID')} + (${qty} - ${minSheets}) × Rp ${hargaLebih.toLocaleString('id-ID')} = Rp ${total.toLocaleString('id-ID')}`
      }
    }

    // Standard finishing: area-based + per-sheet
    let part1 = 0
    let part1Text = ''
    if (qty > minSheets && hargaLebih > 0) {
      const selisih = qty - minSheets
      part1 = selisih * hargaLebih
      part1Text = `(${qty} - ${minSheets}) × Rp ${hargaLebih.toLocaleString('id-ID')} = Rp ${part1.toLocaleString('id-ID')}`
    }

    let part2 = 0
    let part2Text = ''
    if (cw > 0 && ch > 0 && hargaPerCm > 0) {
      const areaCost = cw * ch * hargaPerCm
      part2 = areaCost * qty
      part2Text = `(${cw} × ${ch}) × Rp ${hargaPerCm.toLocaleString('id-ID')} × ${qty} = Rp ${part2.toLocaleString('id-ID')}`
    }

    const total = part1 + part2

    if (total <= minPrice) {
      const parts = [part1Text, part2Text].filter(Boolean)
      const calcText = parts.length > 0 ? `${parts.join(' + ')} = Rp ${total.toLocaleString('id-ID')} ≤ Rp ${minPrice.toLocaleString('id-ID')}` : ''
      return {
        cost: minPrice,
        isMin: true,
        breakdown: calcText ? `${calcText} → Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}` : `Harga minimum: Rp ${minPrice.toLocaleString('id-ID')}`
      }
    }

    const parts = [part1Text, part2Text].filter(Boolean)
    const breakdown = parts.join(' + ') + ` = Rp ${total.toLocaleString('id-ID')}`

    return { cost: total, isMin: false, breakdown }
  }

  // Recalculate all selected finishings when inputs change
  useEffect(() => {
    setSelectedFinishings(prev =>
      prev.map(sf => {
        const result = calculateFinishingCost(sf.finishing)
        return { ...sf, cost: result.cost, isMin: result.isMin, breakdown: result.breakdown }
      })
    )
  }, [jumlahLembar, lebarCm, tinggiCm])

  const handleAddFinishing = (finishingId: string) => {
    if (!finishingId) {
      toast.error('Pilih finishing terlebih dahulu')
      return
    }
    const finishing = finishings.find(f => f.id === finishingId)
    if (!finishing) return
    if (selectedFinishings.find(sf => sf.finishing.id === finishingId)) {
      toast.error('Finishing ini sudah ditambahkan')
      return
    }
    const result = calculateFinishingCost(finishing)
    setSelectedFinishings([...selectedFinishings, { finishing, ...result }])
    toast.success(`${finishing.name} ditambahkan`)
  }

  const handleRemoveFinishing = (finishingId: string) => {
    const removed = selectedFinishings.find(sf => sf.finishing.id === finishingId)
    setSelectedFinishings(selectedFinishings.filter(sf => sf.finishing.id !== finishingId))
    if (removed) toast.success(`${removed.finishing.name} dihapus`)
  }

  const totalCost = selectedFinishings.reduce((sum, sf) => sum + sf.cost, 0)
  const qty = parseInt(jumlahLembar) || 0
  const hargaPerLembar = qty > 0 && selectedFinishings.length > 0 ? totalCost / qty : 0

  const handleReset = () => {
    setNamaCetakan('')
    setJumlahLembar('')
    setLebarCm('')
    setTinggiCm('')
    setSelectedFinishings([])
    toast.success('Form berhasil direset')
  }

  const handlePrint = () => {
    if (selectedFinishings.length === 0) {
      toast.error('Tambahkan finishing terlebih dahulu')
      return
    }
    const printWindow = window.open('', '', 'height=800,width=700')
    if (!printWindow) { toast.error('Gagal membuka jendela print'); return }

    const now = new Date().toLocaleString('id-ID')
    const rows = selectedFinishings.map((sf, i) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ddd">${sf.finishing.name}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right">Rp ${sf.cost.toLocaleString('id-ID')}</td>
        <td style="padding:6px;border:1px solid #ddd;font-size:10px;color:#64748b">${sf.breakdown}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Hitung Finishing</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#1e293b}
        h1{text-align:center;font-size:18px;margin-bottom:4px}
        .subtitle{text-align:center;color:#64748b;font-size:11px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px}
        th{background:#f8fafc;border:1px solid #ddd;padding:6px;font-weight:600;text-align:left}
        td{border:1px solid #ddd;padding:6px}
        .right{text-align:right}
        .total{background:linear-gradient(135deg,#059669,#0d9488);color:white;border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:12px}
        .total .label{font-size:13px;font-weight:600}
        .total .value{font-size:20px;font-weight:800}
        .info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:16px;font-size:11px}
        .info span{color:#64748b}
        .footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:16px}
      </style></head><body>
      <h1>Hitung Finishing</h1>
      <p class="subtitle">${namaCetakan || '-'} · Dicetak: ${now}</p>
      <div class="info">
        <span>Jumlah:</span> <strong>${qty.toLocaleString('id-ID')} lembar</strong> &nbsp;|&nbsp;
        <span>Ukuran:</span> <strong>${lebarCm || '0'} × ${tinggiCm || '0'} cm</strong>
      </div>
      <table>
        <thead><tr><th>#</th><th>Nama Finishing</th><th class="right">Biaya</th><th>Detail Kalkulasi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total"><span class="label">Total Finishing</span><span class="value">Rp ${totalCost.toLocaleString('id-ID')}</span></div>
      ${hargaPerLembar > 0 ? `<div style="text-align:right;margin-top:8px;font-size:11px;color:#64748b">Harga per lembar: <strong>Rp ${hargaPerLembar.toLocaleString('id-ID')}</strong></div>` : ''}
      <div class="footer">DarrellPOS · Kalkulator Hitung Cetakan</div>
      </body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 250)
    toast.success('Mencetak...')
  }

  // Section header
  const SectionHeader = ({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: number }) => (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
      <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">{icon}</div>
      <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</h2>
      {badge !== undefined && badge > 0 && (
        <span className="text-[11px] font-semibold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
  )

  const ValueBox = ({ label, value, gradient }: { label: string; value: string; gradient: string }) => (
    <div className={`w-full h-[32px] flex items-center justify-between px-2.5 ${gradient} border rounded-lg`}>
      <span className="text-[11px] font-medium text-slate-600">{label}</span>
      <span className="text-xs font-bold">{value}</span>
    </div>
  )

  return (
    <DashboardLayout title="Hitung Finishing" subtitle="Kalkulator biaya finishing cetakan">
      <div className="max-w-[900px] mx-auto">
        <div className="lg:flex lg:h-[calc(100vh-8rem)] lg:gap-4">

          {/* ========== LEFT: INPUT ========== */}
          <div className="flex-1 lg:overflow-y-auto min-w-0 hide-scrollbar">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

              {/* Section: Info Cetakan */}
              <SectionHeader icon={<Info className="w-3.5 h-3.5 text-blue-600" />} label="Informasi" />
              <div className="px-4 py-3 space-y-2">
                <div>
                  <label className={labelClass}>Nama Cetakan</label>
                  <input type="text" placeholder="Contoh: Brosur Lipat 3" value={namaCetakan} onChange={(e) => setNamaCetakan(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Jumlah Lembar</label>
                    <div className="relative">
                      <Layers className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" min="0" placeholder="1000" value={jumlahLembar} onChange={(e) => setJumlahLembar(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Lebar (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" step="0.1" min="0" placeholder="21" value={lebarCm} onChange={(e) => setLebarCm(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Tinggi (cm)</label>
                    <div className="relative">
                      <Ruler className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input type="number" step="0.1" min="0" placeholder="29.7" value={tinggiCm} onChange={(e) => setTinggiCm(e.target.value)} className={`${inputClass} pl-9`} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: Pilih Finishing */}
              <SectionHeader icon={<Layers className="w-3.5 h-3.5 text-rose-600" />} label="Pilih Finishing" badge={selectedFinishings.length} />
              <div className="px-4 py-3">
                <div className="flex gap-2">
                  <select id="finishing-select" className={selectClass} defaultValue="">
                    <option value="">-- Pilih finishing --</option>
                    {finishings.filter(f => !selectedFinishings.find(sf => sf.finishing.id === f.id)).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <Button
                    onClick={() => {
                      const s = document.getElementById('finishing-select') as HTMLSelectElement
                      if (s) { handleAddFinishing(s.value); s.value = '' }
                    }}
                    className="h-[34px] px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs flex-shrink-0"
                    size="sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </Button>
                </div>
              </div>

              {/* Section: Daftar Finishing Terpilih */}
              {selectedFinishings.length > 0 && (
                <div className="border-t border-slate-100">
                  <div className="px-4 py-2 bg-slate-50/60">
                    <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Daftar Finishing</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedFinishings.map((sf) => (
                      <div key={sf.finishing.id} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 rounded-md bg-purple-50 flex items-center justify-center flex-shrink-0">
                                <Layers className="w-3.5 h-3.5 text-purple-600" />
                              </div>
                              <span className="text-sm font-semibold text-slate-800">{sf.finishing.name}</span>
                              {sf.isMin && (
                                <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Min. Price</span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 ml-8 break-all">{sf.breakdown}</p>
                            <div className="ml-8 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                              <span>Min: {sf.finishing.minimumSheets > 0 ? `${sf.finishing.minimumSheets} lbr` : '-'}</span>
                              <span>Hrg Min: {sf.finishing.minimumPrice > 0 ? `Rp ${sf.finishing.minimumPrice.toLocaleString('id-ID')}` : '-'}</span>
                              <span>+Lbr: {sf.finishing.additionalPrice > 0 ? `Rp ${sf.finishing.additionalPrice.toLocaleString('id-ID')}` : '-'}</span>
                              <span>/cm: {sf.finishing.pricePerCm > 0 ? `Rp ${sf.finishing.pricePerCm.toLocaleString('id-ID')}` : '-'}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className="text-sm font-bold text-emerald-600">Rp {sf.cost.toLocaleString('id-ID')}</span>
                            <button
                              onClick={() => handleRemoveFinishing(sf.finishing.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {selectedFinishings.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <Calculator className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">Belum ada finishing dipilih</p>
                  <p className="text-xs text-slate-300 mt-1">Pilih finishing dari daftar di atas untuk mulai menghitung</p>
                </div>
              )}

            </div>
          </div>

          {/* ========== RIGHT: SUMMARY ========== */}
          <div className="w-full lg:w-[280px] flex-shrink-0 mt-4 lg:mt-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden lg:sticky lg:top-4">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                  <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Ringkasan</h2>
              </div>

              <div className="p-4 space-y-3">
                {/* Input summary */}
                <div className="space-y-1.5">
                  <ValueBox
                    label="Jumlah Lembar"
                    value={qty > 0 ? `${qty.toLocaleString('id-ID')} lbr` : '-'}
                    gradient="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                  />
                  <ValueBox
                    label="Ukuran"
                    value={(parseFloat(lebarCm) > 0 && parseFloat(tinggiCm) > 0) ? `${lebarCm} × ${tinggiCm} cm` : '-'}
                    gradient="bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200"
                  />
                </div>

                {/* Per-finishing breakdown */}
                {selectedFinishings.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {selectedFinishings.map((sf) => (
                      <div key={sf.finishing.id} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50">
                        <span className="text-[11px] text-slate-600 truncate max-w-[160px]">{sf.finishing.name}</span>
                        <span className="text-xs font-semibold text-slate-700 flex-shrink-0">Rp {sf.cost.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Total */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-3.5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Total Finishing</span>
                    <span className="text-lg font-extrabold">Rp {totalCost.toLocaleString('id-ID')}</span>
                  </div>
                  {hargaPerLembar > 0 && (
                    <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/20">
                      <span className="text-[11px] opacity-80">Per Lembar</span>
                      <span className="text-xs font-bold">Rp {hargaPerLembar.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-1">
                  <Button
                    onClick={handlePrint}
                    disabled={selectedFinishings.length === 0}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                  >
                    <Printer className="w-4 h-4" /> Cetak
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full gap-2"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </Button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
