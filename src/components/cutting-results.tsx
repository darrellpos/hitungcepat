'use client'

import type { CuttingResult, Block } from '@/lib/cutting-engine'

interface CuttingResultsProps {
  results: CuttingResult
}

export function CuttingResults({ results }: CuttingResultsProps) {
  return (
    <div className="space-y-6">
      {/* Detail Perhitungan */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Detail Perhitungan</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 font-medium mb-1">Jumlah Cetakan yang Diperlukan</p>
            <p className="text-2xl font-bold text-blue-600">{results.quantity}</p>
            <p className="text-xs text-blue-600 mt-1">lembar</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs text-purple-600 font-medium mb-1">Potongan per Lembar Kertas</p>
            <p className="text-2xl font-bold text-purple-600">{results.totalPieces}</p>
            <p className="text-xs text-purple-600 mt-1">lembar</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-emerald-600 font-medium mb-1">Lembar Kertas yang Dibutuhkan</p>
            <p className="text-2xl font-bold text-emerald-600">{results.sheetsNeeded}</p>
            <p className="text-xs text-emerald-600 mt-1">lembar</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4">
            <p className="text-xs text-orange-600 font-medium mb-1">Total Harga Kertas</p>
            <p className="text-lg font-bold text-orange-600">
              Rp {results.totalPrice.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-rose-50 rounded-xl p-4">
            <p className="text-xs text-rose-600 font-medium mb-1">Sisa Potongan Ukuran :</p>
            <p className="text-2xl font-bold text-rose-600">{results.totalWasteArea.toFixed(2)}</p>
            <p className="text-xs text-rose-600 mt-1">cm²</p>
          </div>
          <div className="bg-teal-50 rounded-xl p-4">
            <p className="text-xs text-teal-600 font-medium mb-1">Efisiensi Bahan</p>
            <p className="text-2xl font-bold text-teal-600">{results.efficiency.toFixed(2)}%</p>
            <p className="text-xs text-teal-600 mt-1">penggunaan bahan</p>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-indigo-800 mb-2">Strategi Optimasi:</p>
          <p className="text-sm text-indigo-700 font-medium">{results.strategy}</p>
        </div>
      </div>

      {/* Cara Potong */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Cara Potong</h2>
        <div className="space-y-3">
          {results.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <p className="text-sm text-slate-700 pt-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Diagram Potong */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Diagram Potong</h2>
        <div className="flex justify-center items-center">
          <CuttingDiagram results={results} />
        </div>
      </div>

      {/* Detail Blok */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-6">Detail per Blok</h2>
        <div className="space-y-4">
          {results.blocks.map((block: Block, idx: number) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">{block.name}</h3>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {block.pieces} lembar
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Ukuran Blok</p>
                  <p className="font-medium text-slate-800">{block.width.toFixed(1)} × {block.height.toFixed(1)} cm</p>
                </div>
                <div>
                  <p className="text-slate-500">Layout</p>
                  <p className="font-medium text-slate-800">{block.horizontal} × {block.vertical} {block.rotated ? '(Rotasi 90°)' : ''}</p>
                </div>
                <div>
                  <p className="text-slate-500">Sisa Kanan</p>
                  <p className="font-medium text-slate-800">{block.wasteWidth.toFixed(1)} × {block.height.toFixed(1)} cm</p>
                </div>
                <div>
                  <p className="text-slate-500">Sisa Bawah</p>
                  <p className="font-medium text-slate-800">{block.width.toFixed(1)} × {block.wasteHeight.toFixed(1)} cm</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Shared cutting diagram component - supports 1-4+ blocks
function CuttingDiagram({ results, maxHeight }: { results: CuttingResult; maxHeight?: string }) {
  const scale = 5.94
  const pw = results.paperWidth
  const ph = results.paperHeight

  const gradientIds = [
    'cutGrad1', 'cutGrad2', 'cutGrad3', 'cutGrad4', 'cutGrad5',
  ]
  const strokeColors = ['#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd']

  return (
    <svg
      viewBox={`0 0 ${pw * scale} ${ph * scale}`}
      className="w-full h-full border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="cutGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dbeafe" /><stop offset="100%" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id="cutGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d1fae5" /><stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="cutGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" /><stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="cutGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecaca" /><stop offset="100%" stopColor="#fca5a5" />
        </linearGradient>
        <linearGradient id="cutGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9d5ff" /><stop offset="100%" stopColor="#d8b4fe" />
        </linearGradient>
        <pattern id="cutGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
        </pattern>
        <filter id="cutShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#94a3b8" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Background grid */}
      <rect x="0" y="0" width={pw * scale} height={ph * scale} fill="url(#cutGrid)" />
      {/* Paper border */}
      <rect x="0" y="0" width={pw * scale} height={ph * scale} fill="none" stroke="#94a3b8" strokeWidth="4" rx="2" />

      {/* Cut lines - dashed red */}
      {results.blocks.length > 1 && results.cutPosition !== undefined && (
        <line x1={results.cutPosition * scale} y1="0" x2={results.cutPosition * scale} y2={ph * scale}
          stroke="#f87171" strokeWidth="2.5" strokeDasharray="8,4" opacity="0.8" />
      )}
      {results.blocks.length > 1 && results.cutPositionY !== undefined && (
        <line x1="0" y1={results.cutPositionY * scale} x2={pw * scale} y2={results.cutPositionY * scale}
          stroke="#f87171" strokeWidth="2.5" strokeDasharray="8,4" opacity="0.8" />
      )}

      {/* Waste areas - per block, within section boundaries */}
      {results.blocks.map((block: Block, blockIdx: number) => {
        const wasteRects: React.JSX.Element[] = []

        // Right waste: within the block's section (not extending to paper edge)
        if (block.wasteWidth > 0.01) {
          wasteRects.push(
            <rect key={`wr-${blockIdx}`}
              x={(block.x + block.usedWidth) * scale}
              y={block.y * scale}
              width={block.wasteWidth * scale}
              height={block.usedHeight * scale}
              fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" rx="1" />
          )
          // Bottom-right corner waste
          if (block.wasteHeight > 0.01) {
            wasteRects.push(
              <rect key={`wbr-${blockIdx}`}
                x={(block.x + block.usedWidth) * scale}
                y={(block.y + block.usedHeight) * scale}
                width={block.wasteWidth * scale}
                height={block.wasteHeight * scale}
                fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" rx="1" />
            )
          }
        }

        // Bottom waste: below the block's used area, within section
        if (block.wasteHeight > 0.01) {
          wasteRects.push(
            <rect key={`wb-${blockIdx}`}
              x={block.x * scale}
              y={(block.y + block.usedHeight) * scale}
              width={block.usedWidth * scale}
              height={block.wasteHeight * scale}
              fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,2" opacity="0.5" rx="1" />
          )
        }

        return wasteRects
      })}

      {/* Piece blocks with gradients */}
      {results.blocks.map((block: Block, blockIdx: number) => {
        const blockX = block.x * scale
        const blockY = block.y * scale
        const pieceW = block.pieceWidth * scale
        const pieceH = block.pieceHeight * scale
        const gId = gradientIds[blockIdx % gradientIds.length]
        const sColor = strokeColors[blockIdx % strokeColors.length]

        let pieceNumber = 1
        const pieces: React.JSX.Element[] = []
        for (let i = 0; i < block.horizontal; i++) {
          for (let j = 0; j < block.vertical; j++) {
            pieces.push(
              <g key={`p-${blockIdx}-${i}-${j}`}>
                <rect
                  x={blockX + i * pieceW + 1}
                  y={blockY + j * pieceH + 1}
                  width={pieceW - 3}
                  height={pieceH - 3}
                  fill={`url(#${gId})`}
                  stroke={sColor}
                  strokeWidth="1.5"
                  filter="url(#cutShadow)"
                />
                <circle
                  cx={blockX + i * pieceW + pieceW / 2}
                  cy={blockY + j * pieceH + pieceH / 2}
                  r={Math.min(pieceW, pieceH) / 4}
                  fill="white"
                  opacity="0.9"
                />
                <text
                  x={blockX + i * pieceW + pieceW / 2}
                  y={blockY + j * pieceH + pieceH / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="14"
                  fontWeight="500"
                  fill="#64748b"
                >
                  {pieceNumber++}
                </text>
              </g>
            )
          }
        }

        return <g key={`block-${blockIdx}`}>{pieces}</g>
      })}
    </svg>
  )
}

// Export for reuse in page.tsx preview
export { CuttingDiagram }
