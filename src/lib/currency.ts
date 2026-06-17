import { prisma } from '@/lib/db/client'

const CURRENCY_DEFAULT = '₦'

/**
 * Returns the configured currency display symbol from the SystemSetting table.
 * Falls back to the default symbol (₦) when the database is unavailable or the
 * setting is missing.
 */
export async function getCurrencySymbol(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findFirst({
      where: { section: 'currency', key: 'displaySymbol' },
    })
    return (setting?.value as string) || CURRENCY_DEFAULT
  } catch {
    return CURRENCY_DEFAULT
  }
}

/**
 * Returns the full currency configuration from the SystemSetting table.
 * Falls back to sensible defaults (Nigerian Naira) on any error.
 */
export async function getCurrencyConfig() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { section: 'currency' },
    })
    const map = new Map(settings.map(s => [s.key, s.value as string]))
    return {
      code: map.get('code') || 'NGN',
      symbol: map.get('symbol') || '₦',
      displaySymbol: map.get('displaySymbol') || '₦',
      iconStyle: map.get('iconStyle') || 'text',
    }
  } catch {
    return { code: 'NGN', symbol: '₦', displaySymbol: '₦', iconStyle: 'text' }
  }
}
