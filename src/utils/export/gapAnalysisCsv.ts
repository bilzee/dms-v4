import type { GapAnalysisSummaryData } from '@/hooks/useGapAnalysisRealtime';

interface CsvExportOptions {
  incidentId?: string;
  incidentName?: string;
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  filename?: string;
}

interface CsvRow {
  [key: string]: string | number;
}

/**
 * Exports gap analysis summary data to CSV format
 * 
 * Features:
 * - Client-side generation to avoid server load
 * - Proper CSV formatting with escaping
 * - Metadata inclusion with timestamps
 * - Filename generation with incident details
 * - Browser download trigger
 * 
 * @param data Gap analysis summary data to export
 * @param options Export configuration options
 */
export function exportGapAnalysisToCsv(
  data: GapAnalysisSummaryData,
  options: CsvExportOptions = {}
): void {
  const {
    incidentId,
    incidentName,
    includeMetadata = true,
    includeTimestamps = true,
    filename
  } = options;

  // Generate filename
  const generateFilename = (): string => {
    if (filename) return filename.endsWith('.csv') ? filename : `${filename}.csv`;
    
    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    const incidentIdentifier = incidentName || incidentId || 'gap-analysis';
    return `gap-analysis-${incidentIdentifier}-${timestamp}.csv`;
  };

  // Generate CSV header and content
  const generateCsvContent = (): string => {
    const rows: string[] = [];

    // Add metadata header if requested
    if (includeMetadata) {
      rows.push('# Gap Analysis Summary Export');
      rows.push(`# Generated: ${new Date().toISOString()}`);
      
      if (incidentName) rows.push(`# Incident: ${incidentName}`);
      if (incidentId) rows.push(`# Incident ID: ${incidentId}`);
      
      rows.push(`# Total Entities: ${data.totalEntities}`);
      rows.push(`# Last Updated: ${data.lastUpdated}`);
      rows.push(''); // Empty line for separation
    }

    // Summary statistics section
    rows.push('# SUMMARY STATISTICS');
    rows.push('Metric,Value,Percentage');
    
    const totalEntitiesWithGaps = data.severityDistribution.critical + 
                                   data.severityDistribution.high + 
                                   data.severityDistribution.medium + 
                                   data.severityDistribution.low;
    
    rows.push(`Total Entities,${data.totalEntities},100%`);
    rows.push(`Entities with Gaps,${totalEntitiesWithGaps},${((totalEntitiesWithGaps / data.totalEntities) * 100).toFixed(1)}%`);
    rows.push(`Entities without Gaps,${data.totalEntities - totalEntitiesWithGaps},${(((data.totalEntities - totalEntitiesWithGaps) / data.totalEntities) * 100).toFixed(1)}%`);
    rows.push(''); // Empty line for separation

    // Severity distribution section
    rows.push('# SEVERITY DISTRIBUTION');
    rows.push('Severity,Count,Percentage of Gaps');
    
    const totalGaps = totalEntitiesWithGaps || 1; // Avoid division by zero
    rows.push(`Critical Priority,${data.severityDistribution.critical},${((data.severityDistribution.critical / totalGaps) * 100).toFixed(1)}%`);
    rows.push(`High Priority,${data.severityDistribution.high},${((data.severityDistribution.high / totalGaps) * 100).toFixed(1)}%`);
    rows.push(`Medium Priority,${data.severityDistribution.medium},${((data.severityDistribution.medium / totalGaps) * 100).toFixed(1)}%`);
    rows.push(`Low Priority,${data.severityDistribution.low},${((data.severityDistribution.low / totalGaps) * 100).toFixed(1)}%`);
    rows.push(''); // Empty line for separation

    // Assessment type breakdown section
    rows.push('# ASSESSMENT TYPE BREAKDOWN');
    rows.push('Assessment Type,Entities Affected,Percentage,Severity');

    const assessmentTypeNames = {
      HEALTH: 'Health Services',
      FOOD: 'Food Security',
      WASH: 'Water & Sanitation',
      SHELTER: 'Shelter & Housing',
      SECURITY: 'Security & Protection'
    };

    Object.entries(data.assessmentTypeGaps).forEach(([type, gapData]) => {
      const typeName = assessmentTypeNames[type as keyof typeof assessmentTypeNames] || type;
      rows.push(
        `${typeName},${gapData.entitiesAffected},${gapData.percentage.toFixed(1)}%,${gapData.severity}`
      );
    });

    // Add raw data section if timestamps are included
    if (includeTimestamps) {
      rows.push(''); // Empty line for separation
      rows.push('# RAW DATA');
      rows.push('Data Field,Value');
      
      Object.entries(data.severityDistribution).forEach(([severity, count]) => {
        rows.push(`Severity_${severity.toUpperCase()},${count}`);
      });
      
      Object.entries(data.assessmentTypeGaps).forEach(([type, gapData]) => {
        rows.push(`${type}_EntitiesAffected,${gapData.entitiesAffected}`);
        rows.push(`${type}_Percentage,${gapData.percentage.toFixed(2)}`);
        rows.push(`${type}_Severity,${gapData.severity}`);
      });
      
      rows.push(`LastUpdated,${data.lastUpdated}`);
      rows.push(`ExportTimestamp,${new Date().toISOString()}`);
    }

    return rows.join('\n');
  };

  // Generate and download CSV
  const csvContent = generateCsvContent();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Feature detection for HTML5 download attribute
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', generateFilename());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers
    if ((navigator as any).msSaveBlob) {
      // For IE 10+
      (navigator as any).msSaveBlob(blob, generateFilename());
    } else {
      // Other browsers - open in new window
      const url = URL.createObjectURL(blob);
      window.open(url);
    }
  }
}

/**
 * Validates gap analysis data before export
 * 
 * @param data Data to validate
 * @returns Validation result with error message if invalid
 */
export function validateGapAnalysisData(data: any): { isValid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Invalid data format' };
  }

  if (!data.totalEntities || typeof data.totalEntities !== 'number') {
    return { isValid: false, error: 'Missing or invalid totalEntities' };
  }

  if (!data.severityDistribution || typeof data.severityDistribution !== 'object') {
    return { isValid: false, error: 'Missing or invalid severityDistribution' };
  }

  const requiredSeverityFields = ['critical', 'high', 'medium', 'low'];
  for (const field of requiredSeverityFields) {
    if (typeof data.severityDistribution[field] !== 'number') {
      return { isValid: false, error: `Missing or invalid severityDistribution.${field}` };
    }
  }

  if (!data.assessmentTypeGaps || typeof data.assessmentTypeGaps !== 'object') {
    return { isValid: false, error: 'Missing or invalid assessmentTypeGaps' };
  }

  const requiredAssessmentTypes = ['HEALTH', 'FOOD', 'WASH', 'SHELTER', 'SECURITY'];
  for (const type of requiredAssessmentTypes) {
    if (!data.assessmentTypeGaps[type] || typeof data.assessmentTypeGaps[type] !== 'object') {
      return { isValid: false, error: `Missing or invalid assessmentTypeGaps.${type}` };
    }

    const typeFields = ['severity', 'entitiesAffected', 'percentage'];
    for (const field of typeFields) {
      if (typeof data.assessmentTypeGaps[type][field] === 'undefined') {
        return { isValid: false, error: `Missing assessmentTypeGaps.${type}.${field}` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Creates a formatted filename for gap analysis exports
 * 
 * @param incidentId Optional incident identifier
 * @param incidentName Optional incident name
 * @param includeTimestamp Whether to include timestamp (default: true)
 * @returns Formatted filename string
 */
export function createExportFilename(
  incidentId?: string,
  incidentName?: string,
  includeTimestamp: boolean = true
): string {
  const base = incidentName || incidentId || 'gap-analysis';
  const sanitizedBase = base.replace(/[^a-zA-Z0-9-_]/g, '_'); // Sanitize filename
  
  if (includeTimestamp) {
    const timestamp = new Date().toISOString().slice(0, 10);
    return `gap-analysis-${sanitizedBase}-${timestamp}.csv`;
  }
  
  return `gap-analysis-${sanitizedBase}.csv`;
}

export type { CsvExportOptions, CsvRow };
export default { exportGapAnalysisToCsv, validateGapAnalysisData, createExportFilename };