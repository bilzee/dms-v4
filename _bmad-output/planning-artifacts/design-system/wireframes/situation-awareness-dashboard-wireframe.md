# Situation Awareness Dashboard - Wireframe & Specifications

## Overview
The Situation Awareness Dashboard provides comprehensive real-time monitoring of disaster situations across incidents and affected entities. This dashboard uses a 3-panel layout optimized for full-screen display on dedicated monitoring screens.

## Layout Structure

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            SITUATION AWARENESS DASHBOARD                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ LEFT PANEL (25%)          │ CENTER PANEL (50%)           │ RIGHT PANEL (25%)           │
├───────────────────────────┼──────────────────────────────┼─────────────────────────────┤
│ INCIDENT OVERVIEW         │ ENTITY ASSESSMENT            │ GAP ANALYSIS SUMMARY        │
│                           │                              │                             │
│ ┌───────────────────────┐ │ ┌──────────────────────────┐ │ ┌─────────────────────────┐ │
│ │ Active Incident    ▼  │ │ │ Selected Entity      ▼   │ │ │ Overall Severity        │ │
│ │ [Flood - Dikwa LGA  ] │ │ │ [All Entities (14)    ]  │ │ │ ┌─────────────────────┐ │ │
│ └───────────────────────┘ │ └──────────────────────────┘ │ │ │  ●●●●●○  SEVERE     │ │ │
│                           │                              │ │ └─────────────────────┘ │ │
│ Status: ACTIVE            │ Assessment Summary           │ │                           │ │
│ ┌───────────────────────┐ │ ┌──────────────────────────┐ │ │ Gap Distribution          │ │
│ │ Duration: 72 hours    │ │ │ Assessment Coverage      │ │ │ ┌─────────────────────┐ │ │
│ │ Since: Oct 15, 2024   │ │ │ ████████░░ 80% Complete  │ │ │ │ Health     🔴 8/14  │ │ │
│ └───────────────────────┘ │ └──────────────────────────┘ │ │ │ WASH       🔴 10/14 │ │ │
│                           │                              │ │ │ Shelter    🟡 4/14  │ │ │
│ Affected Population       │ ┌────────────┬─────────────┐ │ │ │ Food       🔴 12/14 │ │ │
│ ┌───────────────────────┐ │ │   METRICS  │    GAPS     │ │ │ │ Security   🟢 2/14  │ │ │
│ │ Total:     45,250     │ │ ├────────────┼─────────────┤ │ │ │ Population 🟡 3/14  │ │ │
│ │ Vulnerable: 12,340    │ │ │ Health     │             │ │ │ └─────────────────────┘ │ │
│ │ Children:   18,500    │ │ │ Clinics: 3 │ ❌ No Emer. │ │ │                           │ │
│ └───────────────────────┘ │ │ Staff: 45  │ ✅ Adequate │ │ │ Priority Entities         │ │
│                           │ │ Supplies:  │ ❌ Critical │ │ │ ┌─────────────────────┐ │ │
│ Entities Affected: 14     │ ├────────────┼─────────────┤ │ │ │ 1. Camp Alpha  🔴🔴 │ │ │
│ ┌───────────────────────┐ │ │ WASH       │             │ │ │ │ 2. Village B   🔴🔴 │ │ │
│ │ Camps:        8       │ │ │ Water: 45L │ ❌ Insuffic.│ │ │ │ 3. Camp Delta  🔴🟡 │ │ │
│ │ Communities:  6       │ │ │ Latrines:  │ ✅ Adequate │ │ │ │ 4. Town East   🔴🟡 │ │ │
│ └───────────────────────┘ │ │ Hygiene:   │ ❌ Limited  │ │ │ │ 5. Camp Zulu   🟡🟡 │ │ │
│                           │ ├────────────┼─────────────┤ │ │ └─────────────────────┘ │ │
│ Response Status           │ │ Shelter    │             │ │ │                           │ │
│ ┌───────────────────────┐ │ │ Units: 850 │ ✅ Adequate │ │ │ Response Coverage         │ │
│ │ Assessments:  112     │ │ │ Weather:   │ ✅ Protected│ │ │ ┌─────────────────────┐ │ │
│ │ Responses:     67     │ │ │ Privacy:   │ ❌ Limited  │ │ │ │ Planned:   45%      │ │ │
│ │ Delivered:     42     │ │ ├────────────┼─────────────┤ │ │ │ ████████░░░░░░░░   │ │ │
│ └───────────────────────┘ │ │ Food       │             │ │ │ │                     │ │ │
│                           │ │ Meals/day: │ ❌ 1.5 avg  │ │ │ │ Delivered: 28%      │ │ │
│ Key Metrics               │ │ Nutrition: │ ❌ Poor     │ │ │ │ █████░░░░░░░░░░░░   │ │ │
│ ┌───────────────────────┐ │ │ Infant:    │ ❌ None     │ │ │ └─────────────────────┘ │ │
│ │ Verification Rate: 85%│ │ ├────────────┼─────────────┤ │ │                           │ │
│ │ Auto-Approval:    40%│ │ │ Security   │             │ │ │ Donor Engagement          │ │
│ │ Avg Response:   4.2h │ │ │ Violence:  │ ✅ Safe     │ │ │ ┌─────────────────────┐ │ │
│ └───────────────────────┘ │ │ Lighting:  │ ❌ Limited  │ │ │ │ Active Donors:   12 │ │ │
│                           │ │ Patrols:   │ ✅ Regular  │ │ │ │ Commitments: $450K  │ │ │
│ Quick Actions             │ ├────────────┼─────────────┤ │ │ │ Delivered:     62%  │ │ │
│ ┌───────────────────────┐ │ │ Population │             │ │ │ └─────────────────────┘ │ │
│ │ [📊 Export Report]    │ │ │ Total:45250│ Aggregated  │ │ │                           │ │
│ │ [🔄 Refresh]         │ │ │ U5: 18,500 │ from latest │ │ │ ┌─────────────────────┐ │ │
│ │ [⚙️ Configure]       │ │ │ Pregnant:  │ assessments │ │ │ │ [Generate Report]   │ │ │
│ └───────────────────────┘ │ └────────────┴─────────────┘ │ │ │ [Export CSV]        │ │ │
│                           │                              │ │ │ [Share Dashboard]   │ │ │
│                           │ INTERACTIVE MAP              │ │ └─────────────────────┘ │ │
│                           │ ┌──────────────────────────┐ │ └───────────────────────────┘
│                           │ │                          │ │                               
│                           │ │    [Map with colored     │ │                               
│                           │ │     markers showing      │ │                               
│                           │ │     entity locations     │ │                               
│                           │ │     and gap severity]    │ │                               
│                           │ │                          │ │                               
│                           │ │  🔴 🔴 🟡 🟢 🔴 🟡      │ │                               
│                           │ │     🔴 🟡 🔴 🟢          │ │                               
│                           │ │  🟡 🔴 🔴 🟢              │ │                               
│                           │ │                          │ │                               
│                           │ │ ☐ Show Donors            │ │                               
│                           │ │ ☑ Show Gap Severity      │ │                               
│                           │ │ ☐ Show Response Status   │ │                               
│                           │ └──────────────────────────┘ │                               
└───────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

## Panel Specifications

### Left Panel - Incident Overview (25% width)

#### Purpose
Provide context and high-level metrics for the selected incident

#### Components

##### 1. Incident Selector
```tsx
<Select value={selectedIncident} onValueChange={setSelectedIncident}>
  <SelectTrigger>
    <SelectValue placeholder="Select incident" />
  </SelectTrigger>
  <SelectContent>
    {incidents.map(incident => (
      <SelectItem key={incident.id} value={incident.id}>
        <div className="flex items-center gap-2">
          <StatusBadge status={incident.status} />
          <span>{incident.name}</span>
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

##### 2. Incident Status Card
- **Status Badge**: Active/Contained/Resolved with color coding
- **Duration Calculator**: Real-time duration since declaration
- **Declaration Date**: When incident was declared

##### 3. Population Impact
```tsx
interface PopulationMetrics {
  total: number;          // Aggregated from latest population assessments
  vulnerable: number;     // Elderly, disabled, chronic illness
  children: number;       // Under 18
  infants: number;       // Under 5
  pregnant: number;      // Pregnant/lactating women
}
```

##### 4. Entity Summary
- Total affected entities count
- Breakdown by type (Camps vs Communities)
- Visual indicator of severity distribution

##### 5. Response Metrics
- Total assessments completed
- Responses planned/delivered
- Average verification time
- Auto-approval percentage

### Center Panel - Entity Assessment Details (50% width)

#### Purpose
Display detailed assessment data for selected entity or aggregated view

#### Components

##### 1. Entity Selector
```tsx
<Select value={selectedEntity} onValueChange={setSelectedEntity}>
  <SelectTrigger>
    <SelectValue>
      {selectedEntity === 'all' 
        ? `All Entities (${filteredEntities.length})`
        : entities.find(e => e.id === selectedEntity)?.name
      }
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">
      All Entities ({filteredEntities.length})
    </SelectItem>
    <SelectSeparator />
    {filteredEntities.map(entity => (
      <SelectItem key={entity.id} value={entity.id}>
        <div className="flex items-center justify-between w-full">
          <span>{entity.name}</span>
          <GapSeverityBadge severity={entity.gapSeverity} />
        </div>
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

##### 2. Assessment Coverage Bar
Visual progress bar showing percentage of completed assessments

##### 3. Assessment Summary Grid
```tsx
interface AssessmentDisplay {
  category: string;
  metrics: {
    label: string;
    value: string | number;
    unit?: string;
  }[];
  gaps: {
    field: string;
    hasGap: boolean;
    label: string;
  }[];
}

// Layout: Two columns
// Left: Non-gap metrics (informational)
// Right: Gap indicators (boolean fields with red/green status)
```

##### 4. Interactive Map
```tsx
interface MapConfig {
  center: [number, number];  // GPS coordinates
  zoom: number;              // Zoom level
  entities: EntityMarker[];
  selectedEntity?: string;
  overlays: {
    showDonors: boolean;
    showGapSeverity: boolean;
    showResponseStatus: boolean;
  };
}

interface EntityMarker {
  id: string;
  position: [number, number];
  name: string;
  type: 'camp' | 'community';
  gapSeverity: 'none' | 'mild' | 'severe';
  popup: ReactNode;  // Popup content on click
}
```

#### Aggregation Rules (When "All Entities" Selected)
```typescript
const aggregationRules = {
  // Numeric fields: Sum or Average
  population: 'sum',
  waterPerPerson: 'average',
  mealsPerDay: 'average',
  
  // Boolean fields: Count true/false
  hasFunctionalClinic: 'count',
  isWaterSufficient: 'percentage',
  
  // Time fields: Average
  responseTime: 'average',
  
  // Text fields: Most common or list unique
  primaryNeed: 'mode'
};
```

### Right Panel - Gap Analysis Summary (25% width)

#### Purpose
Provide actionable insights and prioritization for response

#### Components

##### 1. Overall Severity Indicator
```tsx
<div className="p-4 rounded-lg bg-gradient-to-r from-green-100 via-yellow-100 to-red-100">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">Overall Severity</h3>
    <SeverityMeter value={calculateSeverity(gaps)} />
  </div>
  <div className="mt-2 flex gap-1">
    {[1,2,3,4,5].map(i => (
      <div 
        key={i}
        className={cn(
          "h-2 flex-1 rounded",
          i <= severityLevel ? "bg-red-500" : "bg-gray-300"
        )}
      />
    ))}
  </div>
</div>
```

##### 2. Gap Distribution by Category
```tsx
interface GapDistribution {
  category: string;
  affectedEntities: number;
  totalEntities: number;
  severity: 'critical' | 'moderate' | 'low';
  icon: '🔴' | '🟡' | '🟢';
}

// Visual: Category name with fraction (8/14) and color indicator
```

##### 3. Priority Entities List
```tsx
interface PriorityEntity {
  rank: number;
  name: string;
  gapCategories: string[];  // Which assessments have gaps
  severityIndicators: ('🔴' | '🟡' | '🟢')[];
  population: number;
}

// Sorted by: severity * population * time_since_assessment
```

##### 4. Response Coverage Metrics
- Planned responses percentage with progress bar
- Delivered responses percentage with progress bar
- Visual comparison between planned vs delivered

##### 5. Donor Engagement Summary
- Active donor count
- Total commitments value
- Overall delivery percentage
- Top performing donors (optional)

## Responsive Design

### Full Screen Mode (>1920px)
- Optimized for dedicated monitoring displays
- No scrolling required
- All panels visible simultaneously
- Larger fonts for visibility from distance

### Desktop (1280px - 1920px)
- Standard 3-panel layout
- Scrollable content within panels
- Collapsible panel sections

### Tablet (768px - 1280px)
```
Layout: Tabbed interface
- Tab 1: Incident Overview
- Tab 2: Entity Assessment (with map below)
- Tab 3: Gap Analysis
```

### Mobile (<768px)
```
Layout: Stacked cards
1. Incident selector and key metrics
2. Entity selector
3. Collapsible assessment categories
4. Gap summary
5. Priority actions
```

## Real-Time Update Behavior

### Update Frequencies
```typescript
const updateConfig = {
  incidentMetrics: 30000,      // 30 seconds
  assessmentData: 60000,       // 1 minute
  gapAnalysis: 60000,         // 1 minute
  populationData: 300000,     // 5 minutes
  mapMarkers: 30000,          // 30 seconds
  donorMetrics: 120000        // 2 minutes
};
```

### Visual Update Indicators
```css
/* Pulse animation for updated values */
@keyframes dataPulse {
  0% { background-color: rgba(59, 130, 246, 0); }
  50% { background-color: rgba(59, 130, 246, 0.2); }
  100% { background-color: rgba(59, 130, 246, 0); }
}

.value-updated {
  animation: dataPulse 1s ease-in-out;
}
```

## Data Export Functionality

### Export Options
```typescript
interface ExportConfig {
  format: 'csv' | 'pdf' | 'png';
  sections: {
    incidentOverview: boolean;
    assessmentDetails: boolean;
    gapAnalysis: boolean;
    map: boolean;
  };
  timeRange?: {
    start: Date;
    end: Date;
  };
}
```

### Chart Export
```tsx
// Using chart.js for exportable visualizations
const exportChart = () => {
  const canvas = chartRef.current;
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `gap-analysis-${Date.now()}.png`;
  link.href = url;
  link.click();
};
```

## Performance Optimizations

### Data Aggregation
```typescript
// Memoized calculations for expensive operations
const aggregatedGaps = useMemo(() => {
  if (selectedEntity === 'all') {
    return aggregateEntityGaps(entities, assessments);
  }
  return getEntityGaps(selectedEntity, assessments);
}, [selectedEntity, entities, assessments]);
```

### Map Optimization
```typescript
// Cluster markers when zoom level is low
const mapConfig = {
  cluster: zoom < 10,
  clusterMaxZoom: 10,
  clusterRadius: 50,
  // Load map tiles for offline use
  offlineTiles: true,
  tileCache: 'indexedDB'
};
```

### Virtual Rendering
```tsx
// Virtual list for priority entities
import { VariableSizeList } from 'react-window';

<VariableSizeList
  height={400}
  itemCount={priorityEntities.length}
  itemSize={getItemSize}
  width="100%"
>
  {PriorityEntityRow}
</VariableSizeList>
```

## Implementation Example

```tsx
// pages/monitoring/situation-awareness.tsx
export default function SituationAwarenessDashboard() {
  const [selectedIncident, setSelectedIncident] = useState<string>('active');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  
  const { data: incident } = useIncident(selectedIncident);
  const { data: entities } = useIncidentEntities(selectedIncident);
  const { data: assessments } = useEntityAssessments(selectedEntity);
  const { data: gaps } = useGapAnalysis(selectedEntity);
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - 25% */}
      <div className="w-1/4 border-r bg-white p-4 overflow-y-auto">
        <IncidentOverviewPanel
          incident={incident}
          onIncidentChange={setSelectedIncident}
        />
      </div>
      
      {/* Center Panel - 50% */}
      <div className="w-1/2 bg-white p-4 overflow-y-auto">
        <EntityAssessmentPanel
          entities={entities}
          selectedEntity={selectedEntity}
          onEntityChange={setSelectedEntity}
          assessments={assessments}
        />
        <InteractiveMap
          entities={entities}
          selectedEntity={selectedEntity}
          onEntityClick={setSelectedEntity}
        />
      </div>
      
      {/* Right Panel - 25% */}
      <div className="w-1/4 border-l bg-white p-4 overflow-y-auto">
        <GapAnalysisSummaryPanel
          gaps={gaps}
          entities={entities}
        />
      </div>
    </div>
  );
}
```

## Success Metrics

- **Load Time**: <2 seconds for initial render
- **Update Latency**: <1 second for data refresh
- **Map Performance**: 60fps pan/zoom
- **Aggregation Speed**: <500ms for all entities
- **Export Generation**: <3 seconds for PDF