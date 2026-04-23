'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class PreviewErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[PreviewErrorBoundary]', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-sm font-medium text-slate-600">Gagal memuat preview</p>
          <p className="text-xs text-slate-400 max-w-xs text-center">
            {this.state.error?.message || 'Terjadi kesalahan saat menampilkan preview'}
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Coba Lagi
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
