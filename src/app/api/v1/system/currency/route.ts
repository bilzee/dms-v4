import { successResponse, handleApiError } from '@/lib/api/response'
import { prisma } from '@/lib/db/client'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const CURRENCY_DEFAULTS = {
  code: 'NGN',
  symbol: '₦',
  displaySymbol: '₦',
  iconStyle: 'text' as 'text' | 'icon',
}

export async function GET(_request: NextRequest) {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { section: 'currency' },
    })
    const map = new Map(settings.map(s => [s.key, s.value as string]))

    return successResponse({
      code: map.get('code') || CURRENCY_DEFAULTS.code,
      symbol: map.get('symbol') || CURRENCY_DEFAULTS.symbol,
      displaySymbol: map.get('displaySymbol') || CURRENCY_DEFAULTS.displaySymbol,
      iconStyle: map.get('iconStyle') || CURRENCY_DEFAULTS.iconStyle,
    })
  } catch {
    return successResponse(CURRENCY_DEFAULTS)
  }
}
