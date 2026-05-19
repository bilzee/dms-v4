import { RoleName } from '@/types/auth';

export const ROLE_DASHBOARD_PATHS: Record<RoleName, string> = {
  ASSESSOR: '/assessor/dashboard',
  COORDINATOR: '/coordinator/dashboard',
  RESPONDER: '/responder/dashboard',
  DONOR: '/donor/dashboard',
  ADMIN: '/admin/dashboard',
};

export const ROLE_ROUTE_PREFIXES: Record<string, string[]> = {
  ASSESSOR: ['/(auth)/assessor'],
  COORDINATOR: ['/(auth)/coordinator'],
  RESPONDER: ['/(auth)/responder'],
  DONOR: ['/(auth)/donor'],
  ADMIN: ['/(auth)/admin', '/(auth)/system'],
};

export const ROLE_PATH_PATTERNS: Record<RoleName, RegExp[]> = {
  ASSESSOR: [/^\/assessor/, /^\/assessments/, /^\/surveys/],
  COORDINATOR: [/^\/coordinator/, /^\/coordination/, /^\/responses/, /^\/verification/],
  RESPONDER: [/^\/responder/, /^\/response/, /^\/incidents/],
  DONOR: [/^\/donor/, /^\/donations/, /^\/resources/],
  ADMIN: [/^\/admin/, /^\/users/, /^\/roles/, /^\/system/],
};

export const ROLE_ACCESSIBLE_PATHS: Record<RoleName, string[]> = {
  ASSESSOR: ['/assessor/dashboard', '/assessments', '/assessments/new', '/surveys', '/profile'],
  COORDINATOR: ['/coordinator/dashboard', '/coordination', '/responses', '/verification', '/reports', '/profile'],
  RESPONDER: ['/responder/dashboard', '/response', '/incidents', '/tasks', '/profile'],
  DONOR: ['/donor/dashboard', '/donations', '/resources', '/impact', '/profile'],
  ADMIN: ['/admin/dashboard', '/users', '/roles', '/system', '/reports', '/profile'],
};

export const ROLE_DISPLAY_NAMES: Record<RoleName, string> = {
  ASSESSOR: 'Assessor',
  COORDINATOR: 'Coordinator',
  RESPONDER: 'Responder',
  DONOR: 'Donor',
  ADMIN: 'Admin',
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  ASSESSOR: 'Conduct rapid assessments and surveys',
  COORDINATOR: 'Coordinate response efforts and teams',
  RESPONDER: 'Provide direct disaster response',
  DONOR: 'Manage donations and resources',
  ADMIN: 'System administration and oversight',
};
