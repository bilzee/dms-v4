import { prisma } from '@/lib/db/client';
import { EntityType } from '@prisma/client';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Entity {
  id: string;
  name: string;
  type: string;
  location?: string;
  coordinates?: Coordinates | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityListResponse {
  success: boolean;
  data?: Entity[];
  message?: string;
  errors?: string[];
}

class EntityServiceImpl {
  async getAllEntities(): Promise<EntityListResponse> {
    try {
      const entities = await prisma.entity.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });

      return { success: true, data: entities as unknown as Entity[] };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch entities',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getEntitiesByType(type: string): Promise<EntityListResponse> {
    try {
      const entities = await prisma.entity.findMany({
        where: { type: type.toUpperCase() as EntityType, isActive: true },
        orderBy: { name: 'asc' }
      });

      return { success: true, data: entities as unknown as Entity[] };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch entities',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async searchEntities(searchTerm: string): Promise<EntityListResponse> {
    try {
      const entities = await prisma.entity.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { location: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        orderBy: { name: 'asc' }
      });

      return { success: true, data: entities as unknown as Entity[] };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to search entities',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  async getEntityById(id: string): Promise<{ success: boolean; data?: Entity; message?: string; errors?: string[] }> {
    try {
      const entity = await prisma.entity.findUnique({ where: { id } });

      if (!entity) {
        return { success: false, message: 'Entity not found', errors: ['Entity with provided ID does not exist'] };
      }

      return { success: true, data: entity as unknown as Entity };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch entity',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

export const entityService = new EntityServiceImpl();
