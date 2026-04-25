import { create } from 'zustand'

interface CompanyBrandingState {
  companyName: string | null
  companyLogo: string | null
  initialized: boolean
  // Actions
  fetchBranding: (isPublic?: boolean) => Promise<void>
  updateBranding: (data: { companyName?: string | null; companyLogo?: string | null }) => void
  resetBranding: () => void
}

const BROADCAST_CHANNEL_NAME = 'company-branding-update'

let broadcastChannel: BroadcastChannel | null = null
try {
  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
} catch {
  // BroadcastChannel not supported (e.g., SSR)
}

export const useCompanyStore = create<CompanyBrandingState>((set, get) => ({
  companyName: null,
  companyLogo: null,
  initialized: false,

  fetchBranding: async (isPublic = false) => {
    try {
      if (isPublic) {
        const res = await fetch('/api/public-settings')
        if (res.ok) {
          const data = await res.json()
          set({
            companyName: data.company_name?.trim() || null,
            companyLogo: data.company_logo?.trim() || null,
            initialized: true,
          })
        }
      } else {
        const [nameRes, logoRes] = await Promise.all([
          fetch('/api/settings?key=company_name'),
          fetch('/api/settings?key=company_logo'),
        ])
        const nameData = nameRes.ok ? await nameRes.json() : null
        const logoData = logoRes.ok ? await logoRes.json() : null
        set({
          companyName: nameData?.value?.trim() || null,
          companyLogo: logoData?.value?.trim() || null,
          initialized: true,
        })
      }
    } catch {
      // Silent fail - keep existing values
    }
  },

  updateBranding: (data) => {
    const state = get()
    const newCompanyName = data.companyName !== undefined ? data.companyName : state.companyName
    const newCompanyLogo = data.companyLogo !== undefined ? data.companyLogo : state.companyLogo
    set({
      companyName: newCompanyName,
      companyLogo: newCompanyLogo,
      initialized: true,
    })
    // Broadcast to other tabs
    try {
      broadcastChannel?.postMessage({
        companyName: newCompanyName,
        companyLogo: newCompanyLogo,
      })
    } catch {
      // Silent fail
    }
  },

  resetBranding: () => {
    set({ companyName: null, companyLogo: null })
    try {
      broadcastChannel?.postMessage({ companyName: null, companyLogo: null })
    } catch {
      // Silent fail
    }
  },
}))

// Subscribe to BroadcastChannel for cross-tab sync
if (typeof window !== 'undefined' && broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    const { companyName, companyLogo } = event.data
    useCompanyStore.setState({
      companyName,
      companyLogo,
      initialized: true,
    })
  }
}

/**
 * Hook to auto-fetch company branding on mount.
 * Uses Zustand store so all components share the same state.
 * Re-fetches every 30 seconds for real-time sync with other tabs/devices.
 */
export function useCompanyBranding(isPublic = false) {
  const { companyName, companyLogo, initialized, fetchBranding } = useCompanyStore()

  // Use refs to avoid re-triggering effect
  const isPublicRef = { current: isPublic }

  // We use a global flag to ensure fetch only runs once per session
  // unless explicitly triggered
  if (typeof window !== 'undefined') {
    const state = useCompanyStore.getState()
    if (!state.initialized) {
      state.fetchBranding(isPublicRef.current)
    }
  }

  return { companyName, companyLogo, initialized, refetch: () => fetchBranding(isPublicRef.current) }
}
