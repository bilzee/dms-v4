export const STORAGE_PATHS = {
  reports: 'reports',
  deliveryMedia: 'delivery-media',
  assessmentMedia: 'assessment-media',
  responseMedia: 'response-media',
  backups: 'backups',
  exports: 'exports',
  temp: 'temp',
  branding: 'branding',
} as const

export type StorageCategory = (typeof STORAGE_PATHS)[keyof typeof STORAGE_PATHS]

export function getStorageKey(category: StorageCategory, ...segments: string[]): string {
  return [category, ...segments].join('/')
}
