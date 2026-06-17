'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'

interface BrandingSettings {
  appName: string
  appDescription: string
  headerIconUrl: string
  pwaIconUrl: string
  loginLogoUrl: string
}

const BRANDING_DEFAULTS: BrandingSettings = {
  appName: 'DRMS',
  appDescription: 'Comprehensive disaster response management and humanitarian assessment PWA',
  headerIconUrl: '',
  pwaIconUrl: '',
  loginLogoUrl: '',
}

export function useBranding() {
  const { data } = useQuery({
    queryKey: ['branding'],
    queryFn: async (): Promise<BrandingSettings> => {
      const result = await apiGet<BrandingSettings>('/api/v1/system/branding')
      if (result.success && result.data) {
        return {
          appName: result.data.appName || BRANDING_DEFAULTS.appName,
          appDescription: result.data.appDescription || BRANDING_DEFAULTS.appDescription,
          headerIconUrl: result.data.headerIconUrl || '',
          pwaIconUrl: result.data.pwaIconUrl || '',
          loginLogoUrl: result.data.loginLogoUrl || '',
        }
      }
      return BRANDING_DEFAULTS
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    appName: data?.appName ?? BRANDING_DEFAULTS.appName,
    appDescription: data?.appDescription ?? BRANDING_DEFAULTS.appDescription,
    headerIconUrl: data?.headerIconUrl ?? '',
    pwaIconUrl: data?.pwaIconUrl ?? '',
    loginLogoUrl: data?.loginLogoUrl ?? '',
  }
}

export function useInvalidateBranding() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['branding'] })
}
