'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  LayoutGrid, 
  Move, 
  Copy, 
  Trash2, 
  Save, 
  Eye, 
  Settings, 
  Plus,
  GripVertical,
  BarChart3,
  Table,
  Map,
  Gauge,
  Type,
  Image,
  Maximize2,
  Minimize2,
  RefreshCw
} from 'lucide-react';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ReportTemplate, ReportLayout, DEFAULT_TEMPLATES } from '@/lib/reports/template-engine';
import { DataSourceType, ReportFilters } from '@/lib/reports/data-aggregator';

// Report element types
export enum ReportElementType {
  HEADER = 'header',
  FOOTER = 'footer',
  SECTION = 'section',
  CHART = 'chart',
  TABLE = 'table',
  KPI = 'kpi',
  MAP = 'map',
  TEXT = 'text',
  IMAGE = 'image',
  SPACER = 'spacer'
}

// Visualization types
export enum VisualizationType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  AREA = 'area',
  TABLE = 'table',
  MAP = 'map',
  KPI = 'kpi',
  GAUGE = 'gauge',
  FUNNEL = 'funnel',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap'
}

// Report element configuration
export interface ReportElement {
  id: string;
  type: ReportElementType;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  dataSource?: string;
  visualization?: {
    type: VisualizationType;
    config: Record<string, any>;
    aggregation?: string;
  };
  title?: string;
  description?: string;
  style?: Record<string, string>;
  locked?: boolean;
}

// Grid configuration
export const GRID_COLUMNS = 12;
export const GRID_ROW_HEIGHT = 40; // pixels per row
export const GRID_MARGIN = 8; // pixels between elements

interface ReportBuilderProps {
  initialTemplate?: ReportTemplate;
  dataSourceType?: DataSourceType;
  onTemplateChange?: (template: Partial<ReportTemplate>) => void;
  onPreview?: (template: ReportTemplate) => void;
  onSave?: (template: Partial<ReportTemplate>) => void;
  className?: string;
}

// Separate component for draggable template cards to avoid hooks in callbacks
function DraggableTemplateCard({ template, onAdd }: { 
  template: typeof ELEMENT_TEMPLATES[number]; 
  onAdd: (type: ReportElementType) => void; 
}) {
  return (
    <Card
      key={template.type}
      className="cursor-pointer transition-opacity hover:opacity-80"
      onClick={() => onAdd(template.type)}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <template.icon className="h-8 w-8 text-blue-600" />
        <div className="flex-1">
          <div className="text-sm font-medium">{template.title}</div>
          <div className="text-xs text-gray-500">{template.description}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAdd(template.type); }}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

// Element templates for the sidebar
const ELEMENT_TEMPLATES: Array<{
  type: ReportElementType;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultSize: { width: number; height: number };
  category: 'layout' | 'visualization' | 'content';
}> = [
  // Layout elements
  {
    type: ReportElementType.HEADER,
    title: 'Header',
    description: 'Report title and metadata',
    icon: Type,
    defaultSize: { width: 12, height: 1 },
    category: 'layout'
  },
  {
    type: ReportElementType.FOOTER,
    title: 'Footer',
    description: 'Report footer information',
    icon: Type,
    defaultSize: { width: 12, height: 1 },
    category: 'layout'
  },
  {
    type: ReportElementType.SECTION,
    title: 'Section',
    description: 'Content section with title',
    icon: Type,
    defaultSize: { width: 6, height: 2 },
    category: 'layout'
  },
  {
    type: ReportElementType.SPACER,
    title: 'Spacer',
    description: 'Empty space for layout',
    icon: Maximize2,
    defaultSize: { width: 4, height: 1 },
    category: 'layout'
  },
  // Visualization elements
  {
    type: ReportElementType.CHART,
    title: 'Chart',
    description: 'Data visualization',
    icon: BarChart3,
    defaultSize: { width: 6, height: 4 },
    category: 'visualization'
  },
  {
    type: ReportElementType.TABLE,
    title: 'Table',
    description: 'Data table with columns',
    icon: Table,
    defaultSize: { width: 8, height: 4 },
    category: 'visualization'
  },
  {
    type: ReportElementType.KPI,
    title: 'KPI',
    description: 'Key performance indicators',
    icon: Gauge,
    defaultSize: { width: 4, height: 2 },
    category: 'visualization'
  },
  {
    type: ReportElementType.MAP,
    title: 'Map',
    description: 'Geographic visualization',
    icon: Map,
    defaultSize: { width: 8, height: 6 },
    category: 'visualization'
  },
  // Content elements
  {
    type: ReportElementType.TEXT,
    title: 'Text',
    description: 'Rich text content',
    icon: Type,
    defaultSize: { width: 6, height: 2 },
    category: 'content'
  },
  {
    type: ReportElementType.IMAGE,
    title: 'Image',
    description: 'Static image content',
    icon: Image,
    defaultSize: { width: 4, height: 3 },
    category: 'content'
  }
];

// Default element configurations
const getDefaultConfig = (type: ReportElementType): Record<string, any> => {
  switch (type) {
    case ReportElementType.HEADER:
      return {
        title: 'Report Title',
        subtitle: '',
        showDate: true,
        showLogo: true,
        alignment: 'left',
        fontSize: 'large',
        fontWeight: 'bold'
      };
    case ReportElementType.FOOTER:
      return {
        text: 'Generated on ${date}',
        showPageNumbers: true,
        alignment: 'center',
        fontSize: 'small'
      };
    case ReportElementType.SECTION:
      return {
        title: 'Section Title',
        description: '',
        showBorder: true,
        backgroundColor: '#f8f9fa'
      };
    case ReportElementType.SPACER:
      return {
        color: 'transparent',
        height: 'auto'
      };
    case ReportElementType.CHART:
      return {
        title: 'Chart Title',
        chartType: VisualizationType.BAR,
        xAxis: '',
        yAxis: '',
        groupBy: '',
        colors: ['#0088FE', '#00C49F', '#FEBB50', '#FF6F6F', '#B87DD9'],
        legend: true,
        grid: true,
        animation: true
      };
    case ReportElementType.TABLE:
      return {
        title: 'Data Table',
        columns: [],
        pagination: true,
        pageSize: 10,
        sortable: true,
        filterable: true,
        striped: true,
        bordered: true
      };
    case ReportElementType.KPI:
      return {
        title: 'KPI Title',
        value: 0,
        format: 'number',
        comparison: null,
        showTrend: false,
        icon: '',
        color: '#0088FE',
        size: 'medium'
      };
    case ReportElementType.MAP:
      return {
        title: 'Map View',
        center: { lat: 9.0820, lng: 8.6753 },
        zoom: 6,
        markers: [],
        showControls: true,
        showScale: true,
        tileLayer: 'default'
      };
    case ReportElementType.TEXT:
      return {
        content: '',
        fontSize: 'medium',
        fontWeight: 'normal',
        alignment: 'left',
        color: '#000000',
        backgroundColor: '#ffffff'
      };
    case ReportElementType.IMAGE:
      return {
        url: '',
        alt: '',
        objectFit: 'cover',
        showBorder: false,
        borderRadius: 0
      };
    default:
      return {};
  }
};

export function ReportBuilder({ 
  initialTemplate,
  dataSourceType,
  onTemplateChange,
  onPreview,
  onSave,
  className 
}: ReportBuilderProps) {
  const [elements, setElements] = useState<ReportElement[]>(() => 
    initialTemplate?.layout?.map(item => ({
      id: item.id,
      type: item.type as ReportElementType,
      position: item.position,
      config: item.config || {},
      dataSource: item.dataSource,
      visualization: item.visualization ? {
        ...item.visualization,
        type: item.visualization.type as VisualizationType
      } : undefined,
      title: item.config.title || '',
      description: item.config.description,
      style: {},
      locked: false
    })) || []
  );

  const [selectedElement, setSelectedElement] = useState<ReportElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [activeTab, setActiveTab] = useState('elements');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setElements(prev => {
      const oldIndex = prev.findIndex(el => el.id === active.id);
      const newIndex = prev.findIndex(el => el.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  // Add element from sidebar
  const addElement = useCallback((elementType: ReportElementType, position?: { x: number; y: number }) => {
    const template = ELEMENT_TEMPLATES.find(t => t.type === elementType);
    if (!template) return;

    const newElement: ReportElement = {
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: elementType,
      position: position ? { x: position.x, y: position.y, width: template.defaultSize.width, height: template.defaultSize.height } : {
        x: 0,
        y: Math.floor(elements.length / GRID_COLUMNS),
        width: template.defaultSize.width,
        height: template.defaultSize.height
      },
      config: getDefaultConfig(elementType),
      style: {}
    };

    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement);
  }, [elements.length]);

  // Remove element
  const removeElement = useCallback((elementId: string) => {
    setElements(prev => prev.filter(el => el.id !== elementId));
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  }, [selectedElement]);

  // Update element
  const updateElement = useCallback((elementId: string, updates: Partial<ReportElement>) => {
    setElements(prev => prev.map(el => 
      el.id === elementId ? { ...el, ...updates } : el
    ));

    if (selectedElement?.id === elementId) {
      setSelectedElement(prev => prev ? { ...prev, ...updates } : null);
    }
  }, [selectedElement]);

  // Duplicate element
  const duplicateElement = useCallback((element: ReportElement) => {
    const duplicated: ReportElement = {
      ...element,
      id: `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      position: {
        ...element.position,
        x: element.position.x + 1,
        y: element.position.y + 1
      },
      title: element.title ? `${element.title} (Copy)` : undefined,
      locked: false
    };

    setElements(prev => [...prev, duplicated]);
    setSelectedElement(duplicated);
  }, []);

  // Auto-arrange elements
  const autoArrange = useCallback(() => {
    const arranged = elements.map((element, index) => ({
      ...element,
      position: {
        x: (index % GRID_COLUMNS),
        y: Math.floor(index / GRID_COLUMNS),
        width: Math.min(element.position.width, GRID_COLUMNS - (index % GRID_COLUMNS)),
        height: element.position.height
      }
    }));

    setElements(arranged);
  }, [elements]);

  // Validate layout (no overlaps)
  const validateLayout = useCallback(() => {
    const positions = elements.map(el => ({
      id: el.id,
      x: el.position.x,
      y: el.position.y,
      width: el.position.width,
      height: el.position.height
    }));

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        if (doPositionsOverlap(positions[i], positions[j])) {
          return { valid: false, conflicts: [positions[i].id, positions[j].id] };
        }
      }
    }

    return { valid: true, conflicts: [] };
  }, [elements]);

  // Generate preview
  const generatePreview = useCallback(() => {
    const layout: ReportLayout[] = elements.map(el => ({
      id: el.id,
      type: el.type as ReportLayout['type'],
      position: el.position,
      config: {
        ...el.config,
        title: el.title,
        description: el.description,
        ...el.style
      },
      dataSource: el.dataSource,
      visualization: el.visualization ? {
        ...el.visualization,
        type: el.visualization.type as ReportLayout['visualization'] extends undefined ? never : NonNullable<ReportLayout['visualization']>['type'],
        config: el.visualization.config ?? {}
      } : undefined
    }));

    const template: ReportTemplate = {
      id: initialTemplate?.id || `template_${Date.now()}`,
      name: initialTemplate?.name || 'Custom Report',
      description: initialTemplate?.description || 'Generated custom report',
      type: initialTemplate?.type || 'CUSTOM',
      layout,
      createdById: 'current_user', // Will be set by backend
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (onPreview) {
      onPreview(template);
    }

    return template;
  }, [elements, initialTemplate, onPreview]);

  // Save template
  const saveTemplate = useCallback(() => {
    const template = generatePreview();
    if (onSave) {
      onSave(template);
    }
  }, [generatePreview, onSave]);

  return (
    <div className={cn("flex h-screen bg-gray-50", className)}>
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Report Builder</h2>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <LayoutGrid className="h-4 w-4" />
            {elements.length} elements
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Grid</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Zoom</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Auto Arrange</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={autoArrange}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Element Library */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {['layout', 'visualization', 'content'].map(category => (
              <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium capitalize">{category}</h3>
                <div className="space-y-2">
                  {ELEMENT_TEMPLATES
                    .filter(template => template.category === category)
                    .map(template => (
                      <DraggableTemplateCard
                        key={template.type}
                        template={template}
                        onAdd={addElement}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button 
            onClick={generatePreview} 
            className="w-full justify-start"
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Report
          </Button>
          <Button 
            onClick={saveTemplate} 
            className="w-full justify-start"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Template
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Report:</span>
              <Input
                value={initialTemplate?.name || 'New Report'}
                onChange={(e) => initialTemplate && onTemplateChange?.({
                  ...initialTemplate,
                  name: e.target.value
                })}
                className="w-64"
                placeholder="Report name"
              />
            </div>

            <Separator orientation="vertical" className="h-8" />

            <div className="flex items-center gap-2">
              <Badge variant={validateLayout().valid ? 'default' : 'destructive'}>
                {validateLayout().valid ? 'Valid Layout' : 'Layout Conflicts'}
              </Badge>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedElement(null)}
              >
                Clear Selection
              </Button>
              {selectedElement && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateElement(selectedElement)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeElement(selectedElement.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto p-8">
            <div
              className={cn(
                "relative bg-white rounded-lg shadow-sm border-2 transition-colors",
                showGrid && "bg-grid-pattern border-dashed border-gray-300",
                "min-w-[800px] min-h-[600px]"
              )}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: `${GRID_COLUMNS * 100 + GRID_MARGIN * (GRID_COLUMNS + 1)}px`,
                minHeight: '600px'
              }}
            >
              {/* Grid overlay */}
              {showGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(0deg, #e5e7eb 0px, transparent 1px, transparent ${GRID_ROW_HEIGHT}px, #e5e7eb ${GRID_ROW_HEIGHT + 1}px),
                      repeating-linear-gradient(90deg, #e5e7eb 0px, transparent 1px, transparent ${100}px, #e5e7eb ${101}px)
                    `
                  }}
                />
              )}

              <SortableContext items={elements.map(el => el.id)} strategy={verticalListSortingStrategy}>
              {elements.map(element => (
                <SortableCanvasElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElement?.id === element.id}
                  onSelect={() => !element.locked && setSelectedElement(element)}
                />
              ))}
              </SortableContext>

              {/* Canvas empty state */}
              {elements.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <LayoutGrid className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start Building Your Report
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Drag elements from the sidebar to begin creating your custom report
                    </p>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• Add headers, charts, tables, and more</p>
                      <p>• Configure data sources and aggregations</p>
                      <p>• Preview and save your template</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div className="h-8 bg-white border-t border-gray-200 flex items-center px-4 text-xs text-gray-600">
            <span>Elements: {elements.length}</span>
            <Separator orientation="vertical" className="h-4 mx-2" />
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <Separator orientation="vertical" className="h-4 mx-2" />
            <span>Grid: {showGrid ? 'On' : 'Off'}</span>
            <Separator orientation="vertical" className="h-4 mx-2" />
            <span className={validateLayout().valid ? 'text-green-600' : 'text-red-600'}>
              {validateLayout().valid ? 'Layout Valid' : `${validateLayout().conflicts.length} Conflicts`}
            </span>
          </div>
        </div>
      </DndContext>

      {/* Properties Panel */}
      {selectedElement && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold capitalize">
                {selectedElement.type} Properties
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedElement(null)}
              >
                ×
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="elements">Element</TabsTrigger>
              <TabsTrigger value="data">Data</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Element Properties */}
            <TabsContent value="elements" className="flex-1 p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="element-title">Title</Label>
                <Input
                  id="element-title"
                  value={selectedElement.title || ''}
                  onChange={(e) => updateElement(selectedElement.id, { title: e.target.value })}
                  placeholder="Enter element title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="element-description">Description</Label>
                <Input
                  id="element-description"
                  value={selectedElement.description || ''}
                  onChange={(e) => updateElement(selectedElement.id, { description: e.target.value })}
                  placeholder="Enter element description"
                />
              </div>

              {/* Position and Size */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Position & Size</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pos-x">X</Label>
                    <Input
                      id="pos-x"
                      type="number"
                      value={selectedElement.position.x}
                      onChange={(e) => updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, x: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pos-y">Y</Label>
                    <Input
                      id="pos-y"
                      type="number"
                      value={selectedElement.position.y}
                      onChange={(e) => updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, y: parseInt(e.target.value) || 0 }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pos-width">Width</Label>
                    <Input
                      id="pos-width"
                      type="number"
                      value={selectedElement.position.width}
                      onChange={(e) => updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, width: parseInt(e.target.value) || 1 }
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pos-height">Height</Label>
                    <Input
                      id="pos-height"
                      type="number"
                      value={selectedElement.position.height}
                      onChange={(e) => updateElement(selectedElement.id, {
                        position: { ...selectedElement.position, height: parseInt(e.target.value) || 1 }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Element-specific configuration */}
              <ElementConfiguration
                element={selectedElement}
                onChange={(updates) => updateElement(selectedElement.id, updates)}
              />
            </TabsContent>

            {/* Data Configuration */}
            <TabsContent value="data" className="flex-1 p-4">
              <DataConfiguration
                element={selectedElement}
                dataSourceType={dataSourceType}
                onChange={(updates) => updateElement(selectedElement.id, updates)}
              />
            </TabsContent>

            {/* Style Configuration */}
            <TabsContent value="style" className="flex-1 p-4">
              <StyleConfiguration
                element={selectedElement}
                onChange={(updates) => updateElement(selectedElement.id, updates)}
              />
            </TabsContent>

            {/* Advanced Configuration */}
            <TabsContent value="advanced" className="flex-1 p-4">
              <AdvancedConfiguration
                element={selectedElement}
                onChange={(updates) => updateElement(selectedElement.id, updates)}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function SortableCanvasElement({ element, isSelected, onSelect }: {
  element: ReportElement;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
  });

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.position.x * 100 + (element.position.x + 1) * GRID_MARGIN}px`,
    top: `${element.position.y * GRID_ROW_HEIGHT + (element.position.y + 1) * GRID_MARGIN}px`,
    width: `${element.position.width * 100 + (element.position.width - 1) * GRID_MARGIN}px`,
    height: `${element.position.height * GRID_ROW_HEIGHT + (element.position.height - 1) * GRID_MARGIN}px`,
    cursor: element.locked ? 'not-allowed' : 'move',
    zIndex: isSelected ? 10 : isDragging ? 20 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-2 rounded-md bg-white dark:bg-gray-900 shadow-sm transition-colors",
        element.locked && "border-gray-400 cursor-not-allowed",
        isSelected && !isDragging && "border-primary ring-2 ring-primary/20",
        isDragging && "border-primary/50 shadow-lg"
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <div className="p-2 h-full flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium truncate flex-1">
            {element.title || element.type}
          </span>
          <div className="flex items-center gap-1">
            {element.locked && (
              <div className="w-3 h-3 bg-gray-400 rounded-full" title="Locked" />
            )}
            <div className="w-3 h-3 border border-gray-400 rounded-full" title="Resizable" />
          </div>
        </div>
        <div className="flex-1 text-xs text-muted-foreground overflow-hidden">
          {getElementPreview(element)}
        </div>
      </div>
      {!element.locked && isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary border border-primary/80 cursor-nw-resize" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary border border-primary/80 cursor-ne-resize" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border border-primary/80 cursor-sw-resize" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border border-primary/80 cursor-se-resize" />
        </>
      )}
    </div>
  );
}

// Helper function to check position overlap
function doPositionsOverlap(pos1: any, pos2: any): boolean {
  return !(
    pos1.x + pos1.width <= pos2.x ||
    pos2.x + pos2.width <= pos1.x ||
    pos1.y + pos1.height <= pos2.y ||
    pos2.y + pos2.height <= pos1.y
  );
}

// Helper function to get element preview content
function getElementPreview(element: ReportElement): string {
  switch (element.type) {
    case ReportElementType.HEADER:
      return `Header: ${element.config.title || 'Untitled'}`;
    case ReportElementType.FOOTER:
      return `Footer: ${element.config.text || 'Custom footer'}`;
    case ReportElementType.CHART:
      return `Chart: ${element.config.chartType || 'bar'} chart`;
    case ReportElementType.TABLE:
      return `Table: ${element.config.columns?.length || 0} columns`;
    case ReportElementType.KPI:
      return `KPI: ${element.config.title || 'Metric'}`;
    case ReportElementType.MAP:
      return `Map: Geographic visualization`;
    case ReportElementType.TEXT:
      return `Text: ${element.config.content?.substring(0, 50) || 'Empty text'}...`;
    case ReportElementType.IMAGE:
      return `Image: ${element.config.url ? 'Has image' : 'No image'}`;
    case ReportElementType.SECTION:
      return `Section: ${element.config.title || 'Untitled section'}`;
    case ReportElementType.SPACER:
      return `Spacer: Empty space`;
    default:
      return 'Unknown element';
  }
}

// Element-specific configuration component
function ElementConfiguration({ 
  element, 
  onChange 
}: { 
  element: ReportElement; 
  onChange: (updates: Partial<ReportElement>) => void; 
}) {
  const renderConfigFields = () => {
    switch (element.type) {
      case ReportElementType.CHART:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Chart Type</Label>
              <Select
                value={element.config.chartType || 'bar'}
                onValueChange={(value) => onChange({
                  config: { ...element.config, chartType: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Show Legend</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={element.config.legend !== false}
                  onCheckedChange={(checked) => onChange({
                    config: { ...element.config, legend: checked as boolean }
                  })}
                />
                <span className="text-sm">Display legend</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Show Grid</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={element.config.grid !== false}
                  onCheckedChange={(checked) => onChange({
                    config: { ...element.config, grid: checked as boolean }
                  })}
                />
                <span className="text-sm">Display grid lines</span>
              </div>
            </div>
          </div>
        );

      case ReportElementType.TABLE:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Page Size</Label>
              <Select
                value={element.config.pageSize?.toString() || '10'}
                onValueChange={(value) => onChange({
                  config: { ...element.config, pageSize: parseInt(value) }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 rows</SelectItem>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={element.config.pagination !== false}
                    onCheckedChange={(checked) => onChange({
                      config: { ...element.config, pagination: checked as boolean }
                    })}
                  />
                  <span className="text-sm">Enable pagination</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={element.config.sortable !== false}
                    onCheckedChange={(checked) => onChange({
                      config: { ...element.config, sortable: checked as boolean }
                    })}
                  />
                  <span className="text-sm">Sortable columns</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={element.config.striped}
                    onCheckedChange={(checked) => onChange({
                      config: { ...element.config, striped: checked as boolean }
                    })}
                  />
                  <span className="text-sm">Striped rows</span>
                </div>
              </div>
            </div>
          </div>
        );

      case ReportElementType.KPI:
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Format</Label>
              <Select
                value={element.config.format || 'number'}
                onValueChange={(value) => onChange({
                  config: { ...element.config, format: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Size</Label>
              <Select
                value={element.config.size || 'medium'}
                onValueChange={(value) => onChange({
                  config: { ...element.config, size: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={element.config.color || '#0088FE'}
                onChange={(e) => onChange({
                  config: { ...element.config, color: e.target.value }
                })}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <p>No specific configuration available for {element.type}</p>
            <p className="text-sm mt-1">Use the Data and Style tabs to configure this element</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Element Configuration</h4>
      {renderConfigFields()}
    </div>
  );
}

// Data configuration component
function DataConfiguration({ 
  element, 
  dataSourceType, 
  onChange 
}: { 
  element: ReportElement; 
  dataSourceType?: DataSourceType; 
  onChange: (updates: Partial<ReportElement>) => void; 
}) {
  const hasDataSource = ['chart', 'table', 'kpi', 'map'].includes(element.type);

  if (!hasDataSource) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>This element type doesn&apos;t require data source configuration</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Data Source</h4>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="data-source">Data Source</Label>
          <Select
            value={element.dataSource || ''}
            onValueChange={(value) => onChange({ dataSource: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              {dataSourceType && (
                <SelectItem value={dataSourceType}>
                  {dataSourceType.charAt(0).toUpperCase() + dataSourceType.slice(1).replace(/_/g, ' ')}
                </SelectItem>
              )}
              <SelectItem value="custom">Custom Query</SelectItem>
              <SelectItem value="static">Static Data</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {element.visualization && (
          <div className="space-y-2">
            <Label>Visualization Type</Label>
            <Select
              value={element.visualization.type}
              onValueChange={(value) => onChange({
                visualization: { 
                  ...element.visualization!,
                  config: element.visualization?.config ?? {},
                  type: value as VisualizationType 
                }
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VisualizationType).map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

// Style configuration component
function StyleConfiguration({ 
  element, 
  onChange 
}: { 
  element: ReportElement; 
  onChange: (updates: Partial<ReportElement>) => void; 
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Visual Style</h4>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="bg-color">Background Color</Label>
          <Input
            id="bg-color"
            type="color"
            value={element.style?.backgroundColor || '#ffffff'}
            onChange={(e) => onChange({
              style: { ...element.style, backgroundColor: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="text-color">Text Color</Label>
          <Input
            id="text-color"
            type="color"
            value={element.style?.color || '#000000'}
            onChange={(e) => onChange({
              style: { ...element.style, color: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="border-color">Border Color</Label>
          <Input
            id="border-color"
            type="color"
            value={element.style?.borderColor || '#e5e7eb'}
            onChange={(e) => onChange({
              style: { ...element.style, borderColor: e.target.value }
            })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="border-radius">Border Radius</Label>
          <Input
            id="border-radius"
            type="number"
            value={parseInt(element.style?.borderRadius || '0') || 0}
            onChange={(e) => onChange({
              style: { ...element.style, borderRadius: e.target.value }
            })}
            min="0"
            max="20"
          />
        </div>
      </div>
    </div>
  );
}

// Advanced configuration component
function AdvancedConfiguration({ 
  element, 
  onChange 
}: { 
  element: ReportElement; 
  onChange: (updates: Partial<ReportElement>) => void; 
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">Advanced Options</h4>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Element ID</Label>
          <Input
            value={element.id}
            disabled
            className="text-xs"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="element-locked"
              checked={element.locked || false}
              onCheckedChange={(checked) => onChange({ locked: checked as boolean })}
            />
            <Label htmlFor="element-locked">Lock element position</Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Custom CSS Classes</Label>
          <Input
            value={element.style?.cssClass || ''}
            onChange={(e) => onChange({
              style: { ...element.style, cssClass: e.target.value }
            })}
            placeholder="Enter CSS classes (space separated)"
          />
        </div>

        <div className="space-y-2">
          <Label>Custom CSS</Label>
          <Textarea
            className="w-full h-20 text-sm font-mono"
            value={element.style?.customCss || ''}
            onChange={(e) => onChange({
              style: { ...element.style, customCss: e.target.value }
            })}
            placeholder="Enter custom CSS rules"
          />
        </div>
      </div>
    </div>
  );
}