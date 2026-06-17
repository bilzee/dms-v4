'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { DollarSign } from '@/lib/icons'
import React from 'react'

export interface CurrencySettings {
  code: string
  symbol: string
  displaySymbol: string
  iconStyle: 'text' | 'icon'
}

const CURRENCY_DEFAULTS: CurrencySettings = {
  code: 'NGN',
  symbol: '₦',
  displaySymbol: '₦',
  iconStyle: 'text',
}

export function useCurrency() {
  const { data } = useQuery({
    queryKey: ['currency'],
    queryFn: async (): Promise<CurrencySettings> => {
      const result = await apiGet<CurrencySettings>('/api/v1/system/currency')
      if (result.success && result.data) {
        return {
          code: result.data.code || CURRENCY_DEFAULTS.code,
          symbol: result.data.symbol || CURRENCY_DEFAULTS.symbol,
          displaySymbol: result.data.displaySymbol || result.data.symbol || CURRENCY_DEFAULTS.displaySymbol,
          iconStyle: (result.data.iconStyle as 'text' | 'icon') || CURRENCY_DEFAULTS.iconStyle,
        }
      }
      return CURRENCY_DEFAULTS
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    currency: data ?? CURRENCY_DEFAULTS,
    symbol: data?.displaySymbol ?? CURRENCY_DEFAULTS.displaySymbol,
    iconStyle: data?.iconStyle ?? CURRENCY_DEFAULTS.iconStyle,
  }
}

export function useCurrencySymbol() {
  const { symbol } = useCurrency()
  return symbol
}

export function useCurrencyIcon({ className }: { className?: string }) {
  const { iconStyle, symbol } = useCurrency()
  if (iconStyle === 'icon') {
    return React.createElement(DollarSign, { className })
  }
  return symbol
}

export function useInvalidateCurrency() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['currency'] })
}

export { CURRENCY_DEFAULTS }
