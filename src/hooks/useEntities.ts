import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { z } from 'zod'

// Entity type definition based on the API response
const EntitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  location: z.string().nullable(),
})

export type Entity = z.infer<typeof EntitySchema>

// Query keys
export const entityKeys = {
  all: ['entities'] as const,
  lists: () => [...entityKeys.all, 'list'] as const,
  list: (filters: string) => [...entityKeys.lists(), { filters }] as const,
}

// Fetch entities function
const fetchEntities = async (): Promise<Entity[]> => {
  const result = await apiGet<Entity[]>('/api/v1/entities/public')
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch entities')
  }

  // Validate the data with zod schema
  const validatedData = z.array(EntitySchema).parse(result.data)
  return validatedData
}

// Hook for fetching entities
export function useEntities() {
  return useQuery({
    queryKey: entityKeys.lists(),
    queryFn: fetchEntities,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  })
}

// Hook for memoized filtered entities (to replace client-side filtering)
export function useFilteredEntities(searchTerm: string) {
  const { data: entities, isLoading, error } = useEntities()
  
  const filteredEntities = entities?.filter(entity => 
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entity.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entity.location && entity.location.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  return {
    data: filteredEntities,
    isLoading,
    error,
    totalCount: entities?.length || 0,
    filteredCount: filteredEntities.length,
  }
}
