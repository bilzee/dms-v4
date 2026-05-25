// Unified Filter System Types
// Phase 4: FilterPanel Component Family

export interface FilterOption {
  label: string;
  value: string;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  placeholder?: string;
  multiple?: boolean;
  searchable?: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  isDefault?: boolean;
}

export interface FilterGroup {
  id: string;
  label: string;
  type: 'search' | 'single-select' | 'multi-select' | 'date-range' | 'checkbox-group' | 'toggle-group';
  key?: string;
  options?: FilterOption[];
  placeholder?: string;
  dateFormat?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
}

export interface FilterState {
  [key: string]: any;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterSummary {
  activeFilters: Array<{
    key: string;
    label: string;
    value: any;
    displayValue: string;
  }>;
  totalCount: number;
  isActive: boolean;
}

export interface ToolbarAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  loading?: boolean;
  shortcut?: string;
}

// FilterBar Types (Simple Inline)
export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchDebounceMs?: number;
  
  filters?: FilterConfig[];
  filterValues?: Record<string, any>;
  onFilterChange?: (key: string, value: any) => void;
  
  actions?: ToolbarAction[];
  showClearAll?: boolean;
  onClearAll?: () => void;
  
  summary?: FilterSummary;
  loading?: boolean;
  className?: string;
  
  // Enhanced features
  enableUrlSync?: boolean;
  persistKey?: string; // localStorage key for persistence
}

// FilterPanel Types (Advanced)
export interface FilterPanelProps<T extends FilterState = FilterState> {
  title?: string;
  description?: string;
  visible: boolean;
  onClose: () => void;
  
  filters: T;
  onFiltersChange: (filters: Partial<T>) => void;
  onClear: () => void;
  
  // Configuration
  filterGroups: FilterGroup[];
  quickPresets?: FilterPreset[];
  
  // Advanced features
  enableSavedFilters?: boolean;
  savedFiltersKey?: string;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (id: string) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  
  // Collapsible sections
  advancedCollapsible?: boolean;
  defaultAdvancedCollapsed?: boolean;
  
  // Export integration
  enableExport?: boolean;
  onExport?: (filters: T) => void;
  exportFormats?: Array<{ label: string; value: string; icon?: React.ComponentType<{ className?: string }> }>;
  
  // State management
  loading?: boolean;
  error?: string;
  className?: string;
  
  // URL/persistence
  enableUrlSync?: boolean;
  persistKey?: string;
}

// Filter Hook Types
export interface FilterHookOptions<T extends FilterState = FilterState> {
  defaultFilters?: Partial<T>;
  debounceMs?: number;
  enableUrlSync?: boolean;
  persistKey?: string;
  validateFilters?: (filters: T) => boolean;
  onFiltersChange?: (filters: T) => void;
}

export interface FilterHookReturn<T extends FilterState = FilterState> {
  filters: T;
  setFilters: (filters: Partial<T>) => void;
  clearFilters: () => void;
  resetFilters: () => void;
  
  // Derived state
  summary: FilterSummary;
  isActive: boolean;
  activeCount: number;
  
  // URL/persistence
  updateUrl: () => void;
  loadFromUrl: () => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
  
  // Utilities
  getFilterValue: (key: string) => any;
  setFilterValue: (key: string, value: any) => void;
  toggleFilter: (key: string, value: any) => void;
}

// Domain-specific filter types
export interface VerificationFilters extends FilterState {
  status?: string[];
  priority?: string[];
  assessmentType?: string[];
  responseType?: string[];
  entityId?: string;
  assessorId?: string;
  responderId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'rapidAssessmentDate' | 'responseDate' | 'createdAt' | 'priority' | 'entity.name';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminFilters extends FilterState {
  status?: string;
  role?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardFilters extends FilterState {
  severity?: string[];
  entityType?: string[];
  incident?: string;
  region?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Utility types
export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'in' | 'between' | 'greaterThan' | 'lessThan';

export interface FilterRule {
  key: string;
  operator: FilterOperator;
  value: any;
  label?: string;
}

export interface FilterQuery {
  rules: FilterRule[];
  logic: 'AND' | 'OR';
}

// Migration helpers
export interface LegacyFilterMapping {
  component: string;
  currentPattern: 'useState' | 'custom' | 'inline';
  targetComponent: 'FilterBar' | 'FilterPanel';
  complexity: 'simple' | 'intermediate' | 'advanced';
  migrationNotes?: string[];
  breaking?: boolean;
}