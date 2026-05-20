'use client';

import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useReportTemplates } from '@/hooks/useReportManagement';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, Filter, Plus, Search, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportTemplate, DEFAULT_TEMPLATES } from '@/lib/reports/template-engine';

interface TemplateSelectorProps {
  onTemplateSelect: (template: ReportTemplate) => void;
  onTemplateCreate?: () => void;
  selectedTemplate?: ReportTemplate;
  templateType?: string;
  showPublicOnly?: boolean;
  disabled?: boolean;
}

interface TemplateFilters {
  type: string;
  search: string;
  public: boolean | 'all';
}

export function TemplateSelector({ 
  onTemplateSelect, 
  onTemplateCreate,
  selectedTemplate,
  templateType,
  showPublicOnly = false,
  disabled = false 
}: TemplateSelectorProps) {
  const [filters, setFilters] = useState<TemplateFilters>({
    type: templateType || 'all',
    search: '',
    public: showPublicOnly ? true : 'all'
  });
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const templateParams: Record<string, string> = { page: page.toString(), limit: '20' };
  if (filters.type !== 'all') templateParams.type = filters.type;
  if (debouncedSearch) templateParams.search = debouncedSearch;
  if (filters.public !== 'all') templateParams.public = filters.public.toString();

  const { data, isLoading, error } = useReportTemplates(templateParams);

  const selectTemplate = (template: ReportTemplate) => {
    onTemplateSelect(template);
  };

  const filteredTemplates = React.useMemo(() => {
    if (!data?.data?.templates) return [];
    
    let templates = data.data.templates;
    
    if (filters.type !== 'all') {
      templates = templates.filter((t: any) => t.type === filters.type);
    }
    
    if (debouncedSearch) {
      templates = templates.filter((t: any) => 
        t.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    return templates;
  }, [data?.data?.templates, filters.type, debouncedSearch]);

  // Filter default templates
  const filteredDefaultTemplates = React.useMemo(() => {
    let defaults = DEFAULT_TEMPLATES;
    
    if (filters.type !== 'all') {
      defaults = defaults.filter((t: any) => t.type === filters.type);
    }
    
    if (debouncedSearch) {
      defaults = defaults.filter((t: any) => 
        t.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }
    
    return defaults;
  }, [filters.type, debouncedSearch]);

  const renderTemplateCard = (template: ReportTemplate, isDefault = false) => (
    <Card 
      key={template.id}
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selectedTemplate?.id === template.id && "ring-2 ring-blue-500",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={() => !disabled && selectTemplate(template)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {template.name}
              {isDefault && (
                <Badge variant="secondary" className="text-xs">
                  Default
                </Badge>
              )}
              {template.isPublic && (
                <Badge variant="outline" className="text-xs">
                  Public
                </Badge>
              )}
            </CardTitle>
            {template.description && (
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            )}
          </div>
          <Badge variant="outline">
            {template.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Template preview */}
          <div className="bg-gray-50 rounded-md p-3 border">
            <div className="text-xs text-gray-500 mb-2">Preview</div>
            <div 
              className="text-[10px] leading-none"
              dangerouslySetInnerHTML={{ 
                __html: (template as any).preview?.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') || 'No preview available' 
              }}
            />
          </div>
          
          {/* Template info */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {template.layout?.length || 0} elements
            </span>
            <span>
              {isDefault ? 'System Template' : `By ${(template as any).createdById || 'Unknown'}`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Select Report Template</h2>
          <p className="text-sm text-gray-600">
            Choose a template to start building your custom report
          </p>
        </div>
        {onTemplateCreate && (
          <Button onClick={onTemplateCreate} disabled={disabled}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-10"
            disabled={disabled}
          />
        </div>
        {!showPublicOnly && (
          <Select 
            value={filters.type} 
            onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            disabled={disabled}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="ASSESSMENT">Assessment</SelectItem>
              <SelectItem value="RESPONSE">Response</SelectItem>
              <SelectItem value="ENTITY">Entity</SelectItem>
              <SelectItem value="DONOR">Donor</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        )}
        {!showPublicOnly && (
          <Select 
            value={filters.public.toString()} 
            onValueChange={(value) => setFilters(prev => ({ 
              ...prev, 
              public: value === 'all' ? 'all' : value === 'true' 
            }))}
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Public</SelectItem>
              <SelectItem value="false">My Templates</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Template grids */}
      <ScrollArea className="h-[600px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading templates...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Filter className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Failed to load templates</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Default templates section */}
            {filteredDefaultTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <List className="h-4 w-4" />
                  System Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDefaultTemplates.map(template => 
                    renderTemplateCard({ ...template, name: template.name || 'unnamed', id: `default_${(template.name || 'unnamed').toLowerCase().replace(/\s+/g, '_')}` } as any, true)
                  )}
                </div>
              </div>
            )}

            {/* User templates section */}
            {filteredTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Custom Templates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template: any) => renderTemplateCard(template))}
                </div>
              </div>
            )}

            {/* No templates */}
            {filteredDefaultTemplates.length === 0 && filteredTemplates.length === 0 && (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <Filter className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">No templates found</p>
                  <p className="text-xs text-gray-500">
                    Try adjusting your filters or create a new template
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Pagination */}
      {data?.data?.pagination && data.data.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || disabled}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {data.data.pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(data.data.pagination.pages, p + 1))}
            disabled={page === data.data.pagination.pages || disabled}
          >
            Next
          </Button>
        </div>
      )}

      {/* Selected template preview */}
      {selectedTemplate && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-blue-900">
              Selected: {selectedTemplate.name}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectTemplate({} as ReportTemplate)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-blue-700">
            Click &quot;Continue&quot; to configure your report settings
          </p>
        </div>
      )}
    </div>
  );
}