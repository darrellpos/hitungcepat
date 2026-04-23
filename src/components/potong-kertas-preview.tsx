'use client'

import React, { Suspense } from 'react'
import dynamic from 'next/dynamic'
import type { CuttingResult, Block } from '@/lib/cutting-engine'
import { PreviewErrorBoundary } from '@/components/preview-error-boundary'

// Dynamic import CuttingDiagram with ssr: false
const CuttingDiagram = dynamic(
  () => import('@/components/cutting-results').then(m => ({ default: m.CuttingDiagram })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
          <span className="text-xs">Memuat diagram...</span>
        </div>
      </div>
    ),
  }
)

interface PotongKertasPreviewProps {
  results: CuttingResult | null | undefined
  customerName?: string
  paperName?: string
}

// Safe number formatter
function safeNum(value: number | undefined | null, decimals: number = 0): string {
  if (value == null || isNaN(value)) return decimals > 0 ? '0'.padEnd(decimals + 2, '0') : '0'
  return value.toLocaleString('id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function safeFixed(value: number | undefined | null, decimals: number = 2): string {
  if (value == null || isNaN(value)) return '0.' + '0'.repeat(decimals)
  return value.toFixed(decimals)
}

function safeRp(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return 'Rp 0'
  return 'Rp ' + value.toLocaleString('id-ID')
}

export function PotongKertasPreview({ results, customerName, paperName }: PotongKertasPreviewProps) {
  // Early return if no results
  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-400">Tidak ada data hasil</p>
        <p className="text-xs text-slate-300">Hitung potongan terlebih dahulu</p>
      </div>
    )
  }

  // Extract all values with safe defaults upfront
  const quantity = results.quantity ?? 0
  const totalPieces = results.totalPieces ?? 0
  const sheetsNeeded = results.sheetsNeeded ?? 0
  const totalPrice = results.totalPrice ?? 0
  const pricePerSheet = results.pricePerSheet ?? 0
  const efficiency = results.efficiency ?? 0
  const totalWasteArea = results.totalWasteArea ?? 0
  const strategy = results.strategy ?? '-'
  const steps = Array.isArray(results.steps) ? results.steps : []
  const blocks = Array.isArray(results.blocks) ? results.blocks : []

  return (
    <div className="p-4 bg-white">
      {/* Header */}
      <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Preview Potong Kertas</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {customerName || '-'} · {paperName || 'Custom'} · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-[10px] text-blue-600 font-medium">Jumlah Diperlukan</p>
          <p className="text-xl font-bold text-blue-700">{safeNum(quantity)} <span className="text-xs font-normal">lembar</span></p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <p className="text-[10px] text-purple-600 font-medium">Potongan / Lembar</p>
          <p className="text-xl font-bold text-purple-700">{safeNum(totalPieces)} <span className="text-xs font-normal">pcs</span></p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-[10px] text-emerald-600 font-medium">Lembar Kertas</p>
          <p className="text-xl font-bold text-emerald-700">{safeNum(sheetsNeeded)} <span className="text-xs font-normal">lembar</span></p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
          <p className="text-[10px] text-orange-600 font-medium">Total Harga Kertas</p>
          <p className="text-lg font-bold text-orange-700">{safeRp(totalPrice)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
          <p className="text-[10px] text-rose-600 font-medium">Sisa Potongan</p>
          <p className="text-xl font-bold text-rose-700">{safeFixed(totalWasteArea)} <span className="text-xs font-normal">cm²</span></p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
          <p className="text-[10px] text-teal-600 font-medium">Efisiensi Bahan</p>
          <p className="text-xl font-bold text-teal-700">{safeFixed(efficiency)}%</p>
        </div>
      </div>

      {/* Strategy */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 max-w-[85%] mx-auto mb-4">
        <p className="text-[10px] text-indigo-600 font-medium">Strategi Optimasi</p>
        <p className="text-sm font-bold text-indigo-700">{strategy}</p>
      </div>

      {/* Diagram - wrapped in error boundary */}
      <PreviewErrorBoundary
        fallback={
          <div className="text-center mb-4 py-6 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-400">Diagram tidak dapat ditampilkan</p>
          </div>
        }
      >
        <div className="text-center mb-4">
          <CuttingDiagram results={results} maxHeight="260px" />
        </div>
      </PreviewErrorBoundary>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-slate-700 mb-2">Cara Potong:</h3>
          <div className="space-y-1.5">
            {steps.map((step: string, idx: number) => (
              <div key={`step-${idx}`} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">{idx + 1}</div>
                <p className="text-[11px] text-slate-600 pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block Details */}
      {blocks.length > 0 && (
        <PreviewErrorBoundary
          fallback={
            <div className="mb-2 py-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <p className="text-xs text-slate-400">Detail blok tidak dapat ditampilkan</p>
            </div>
          }
        >
          <div className="mb-2">
            <h3 className="text-xs font-bold text-slate-700 mb-2">Detail per Blok:</h3>
            <div className="space-y-2">
              {blocks.map((block: Block, idx: number) => (
                <div key={`block-${idx}`} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{block.name ?? `Blok ${idx + 1}`}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">{block.pieces ?? 0} lembar</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                    <div>
                      <span className="text-slate-500">Ukuran: </span>
                      <span className="font-medium">{safeFixed(block.width, 1)} × {safeFixed(block.height, 1)} cm</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Layout: </span>
                      <span className="font-medium">{block.horizontal ?? 0} × {block.vertical ?? 0}{block.rotated ? ' (90°)' : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PreviewErrorBoundary>
      )}
    </div>
  )
}

// Also export a standalone print-friendly version
export function PotongKertasPreviewPrint({ results, customerName, paperName }: PotongKertasPreviewProps) {
  if (!results) return null

  const quantity = results.quantity ?? 0
  const totalPieces = results.totalPieces ?? 0
  const sheetsNeeded = results.sheetsNeeded ?? 0
  const totalPrice = results.totalPrice ?? 0
  const pricePerSheet = results.pricePerSheet ?? 0
  const efficiency = results.efficiency ?? 0
  const totalWasteArea = results.totalWasteArea ?? 0
  const strategy = results.strategy ?? '-'
  const steps = Array.isArray(results.steps) ? results.steps : []
  const blocks = Array.isArray(results.blocks) ? results.blocks : []

  return (
    <div className="p-4 bg-white">
      <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Preview Potong Kertas</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {customerName || '-'} · {paperName || 'Custom'} · {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-[10px] text-blue-600 font-medium">Jumlah Diperlukan</p>
          <p className="text-xl font-bold text-blue-700">{safeNum(quantity)} <span className="text-xs font-normal">lembar</span></p>
        </div>
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
          <p className="text-[10px] text-purple-600 font-medium">Potongan / Lembar</p>
          <p className="text-xl font-bold text-purple-700">{safeNum(totalPieces)} <span className="text-xs font-normal">pcs</span></p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
          <p className="text-[10px] text-emerald-600 font-medium">Lembar Kertas</p>
          <p className="text-xl font-bold text-emerald-700">{safeNum(sheetsNeeded)} <span className="text-xs font-normal">lembar</span></p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
          <p className="text-[10px] text-orange-600 font-medium">Total Harga Kertas</p>
          <p className="text-lg font-bold text-orange-700">{safeRp(totalPrice)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
          <p className="text-[10px] text-rose-600 font-medium">Sisa Potongan</p>
          <p className="text-xl font-bold text-rose-700">{safeFixed(totalWasteArea)} <span className="text-xs font-normal">cm²</span></p>
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3">
          <p className="text-[10px] text-teal-600 font-medium">Efisiensi Bahan</p>
          <p className="text-xl font-bold text-teal-700">{safeFixed(efficiency)}%</p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 max-w-[85%] mx-auto">
        <p className="text-[10px] text-indigo-600 font-medium">Strategi Optimasi</p>
        <p className="text-sm font-bold text-indigo-700">{strategy}</p>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="my-4">
          <h3 className="text-xs font-bold text-slate-700 mb-2">Cara Potong:</h3>
          <div className="space-y-1.5">
            {steps.map((step: string, idx: number) => (
              <div key={`step-${idx}`} className="flex items-start gap-2">
                <div className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">{idx + 1}</div>
                <p className="text-[11px] text-slate-600 pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block Details */}
      {blocks.length > 0 && (
        <div className="mb-2">
          <h3 className="text-xs font-bold text-slate-700 mb-2">Detail per Blok:</h3>
          <div className="space-y-2">
            {blocks.map((block: Block, idx: number) => (
              <div key={`block-${idx}`} className="border border-slate-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800">{block.name ?? `Blok ${idx + 1}`}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">{block.pieces ?? 0} lembar</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                  <div>
                    <span className="text-slate-500">Ukuran: </span>
                    <span className="font-medium">{safeFixed(block.width, 1)} × {safeFixed(block.height, 1)} cm</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Layout: </span>
                    <span className="font-medium">{block.horizontal ?? 0} × {block.vertical ?? 0}{block.rotated ? ' (90°)' : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
