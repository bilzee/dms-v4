import { z } from 'zod';

const CURRENCY_SYMBOL_DEFAULT = '₦';

export interface CSVExportOptions {
  /** Field delimiter */
  delimiter?: string;
  /** Line terminator */
  lineTerminator?: string;
  /** Include headers row */
  includeHeaders?: boolean;
  /** Quote fields containing delimiter */
  quoteFields?: boolean;
  /** Quote character */
  quoteChar?: string;
  /** Escape character */
  escapeChar?: string;
  /** Encoding */
  encoding?: string;
  /** Add BOM for Excel compatibility */
  addBOM?: boolean;
}

export interface CSVColumn {
  /** Column header */
  header: string;
  /** Data accessor function or property key */
  accessor: ((row: any) => any) | string;
  /** Cell formatter */
  formatter?: (value: any, row: any, column: CSVColumn) => string;
  /** Column width (for Excel export) */
  width?: number;
  /** Data type for validation */
  type?: 'string' | 'number' | 'date' | 'boolean';
  /** Format pattern for dates/numbers */
  format?: string;
  /** Whether to include this column */
  include?: boolean;
}

export interface CSVData {
  /** Array of data rows */
  rows: any[];
  /** Column definitions */
  columns: CSVColumn[];
  /** Export options */
  options?: CSVExportOptions;
}

const DefaultCSVOptions: Required<CSVExportOptions> = {
  delimiter: ',',
  lineTerminator: '\n',
  includeHeaders: true,
  quoteFields: true,
  quoteChar: '"',
  escapeChar: '"',
  encoding: 'utf-8',
  addBOM: false,
};

export class CSVGenerator {
  private options: Required<CSVExportOptions>;

  constructor(options: CSVExportOptions = {}) {
    this.options = { ...DefaultCSVOptions, ...options };
  }

  /**
   * Generate CSV from data and column definitions
   */
  generate(csvData: CSVData): string {
    const { rows, columns, options } = csvData;
    const mergedOptions = { ...this.options, ...options };
    
    // Validate inputs
    this.validateData(rows, columns);
    
    // Filter columns that should be included
    const includedColumns = columns.filter(col => col.include !== false);
    
    // Build CSV lines
    const lines: string[] = [];
    
    // Add BOM if requested (for Excel compatibility)
    if (mergedOptions.addBOM) {
      lines.push('\uFEFF'); // UTF-8 BOM
    }
    
    // Add headers if requested
    if (mergedOptions.includeHeaders) {
      const headerLine = this.generateHeaderLine(includedColumns, mergedOptions);
      lines.push(headerLine);
    }
    
    // Add data rows
    for (const row of rows) {
      const dataLine = this.generateDataLine(row, includedColumns, mergedOptions);
      lines.push(dataLine);
    }
    
    return lines.join(mergedOptions.lineTerminator);
  }

  /**
   * Generate CSV string from simple array of objects (auto-detect columns)
   */
  generateFromArray(data: any[], options?: CSVExportOptions): string {
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }
    
    // Auto-detect columns from first object
    const firstRow = data[0];
    if (typeof firstRow !== 'object' || firstRow === null) {
      throw new Error('Data must be array of objects with consistent structure');
    }
    
    const columns: CSVColumn[] = Object.keys(firstRow).map(key => ({
      header: this.formatHeader(key),
      accessor: key,
      type: this.detectDataType(firstRow[key]),
    }));
    
    const csvData: CSVData = {
      rows: data,
      columns,
      options,
    };
    
    return this.generate(csvData);
  }

  /**
   * Generate CSV from assessment data
   */
  generateFromAssessments(assessments: any[], options?: CSVExportOptions): string {
    const columns: CSVColumn[] = [
      {
        header: 'ID',
        accessor: 'id',
        type: 'string',
        width: 36,
      },
      {
        header: 'Assessment Type',
        accessor: 'assessmentType',
        type: 'string',
        width: 20,
      },
      {
        header: 'Status',
        accessor: 'verificationStatus',
        type: 'string',
        width: 15,
        formatter: (value) => this.formatStatus(value),
      },
      {
        header: 'Location Name',
        accessor: (row) => row.location?.name || '',
        type: 'string',
        width: 30,
      },
      {
        header: 'Coordinates',
        accessor: (row) => row.location?.coordinates || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Created Date',
        accessor: 'createdAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Last Updated',
        accessor: 'updatedAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Assigned To',
        accessor: (row) => row.assignedTo?.name || 'Unassigned',
        type: 'string',
        width: 25,
      },
      {
        header: 'Priority Level',
        accessor: 'priorityLevel',
        type: 'string',
        width: 15,
        formatter: (value) => value || 'Medium',
      },
      {
        header: 'Population Affected',
        accessor: 'populationAffected',
        type: 'number',
        width: 18,
        formatter: (value) => value || 0,
      },
      {
        header: 'Severity Score',
        accessor: 'severityScore',
        type: 'number',
        width: 15,
        formatter: (value) => value || 0,
      },
      {
        header: 'Access Road Condition',
        accessor: 'accessRoadCondition',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Communication Status',
        accessor: 'communicationStatus',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Power Supply Status',
        accessor: 'powerSupplyStatus',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Water Supply Status',
        accessor: 'waterSupplyStatus',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Medical Facility Status',
        accessor: 'medicalFacilityStatus',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Shelter Capacity Status',
        accessor: 'shelterCapacityStatus',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Food Security Status',
        accessor: 'foodSecurityStatus',
        type: 'string',
        width: 25,
        formatter: (value) => value || 'Unknown',
      },
    ];

    const csvData: CSVData = {
      rows: assessments,
      columns,
      options: { ...options, addBOM: true }, // Add BOM for Excel compatibility
    };

    return this.generate(csvData);
  }

  /**
   * Generate CSV from response data
   */
  generateFromResponses(responses: any[], options?: CSVExportOptions, currencySymbol: string = CURRENCY_SYMBOL_DEFAULT): string {
    const columns: CSVColumn[] = [
      {
        header: 'ID',
        accessor: 'id',
        type: 'string',
        width: 36,
      },
      {
        header: 'Assessment ID',
        accessor: 'assessmentId',
        type: 'string',
        width: 36,
      },
      {
        header: 'Assessment Type',
        accessor: (row) => row.assessment?.assessmentType || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Response Priority',
        accessor: 'responsePriority',
        type: 'string',
        width: 18,
        formatter: (value) => value || 'Medium',
      },
      {
        header: 'Status',
        accessor: 'status',
        type: 'string',
        width: 15,
        formatter: (value) => this.formatStatus(value),
      },
      {
        header: 'Entity Name',
        accessor: (row) => row.entity?.name || '',
        type: 'string',
        width: 30,
      },
      {
        header: 'Entity Type',
        accessor: (row) => row.entity?.type || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Assigned To',
        accessor: (row) => row.assignedTo?.name || 'Unassigned',
        type: 'string',
        width: 25,
      },
      {
        header: 'Created Date',
        accessor: 'createdAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Target Completion Date',
        accessor: 'targetCompletionDate',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Actual Completion Date',
        accessor: 'actualCompletionDate',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Progress Percentage',
        accessor: 'progressPercentage',
        type: 'number',
        width: 20,
        formatter: (value) => `${value || 0}%`,
      },
      {
        header: 'Resources Required',
        accessor: 'resourcesRequired',
        type: 'string',
        width: 30,
        formatter: (value) => value || '',
      },
      {
        header: 'Resources Deployed',
        accessor: 'resourcesDeployed',
        type: 'string',
        width: 30,
        formatter: (value) => value || '',
      },
      {
        header: 'Cost Estimate',
        accessor: 'costEstimate',
        type: 'number',
        width: 15,
        formatter: (value) => value ? `${currencySymbol}${value.toFixed(2)}` : '',
      },
      {
        header: 'Actual Cost',
        accessor: 'actualCost',
        type: 'number',
        width: 15,
        formatter: (value) => value ? `${currencySymbol}${value.toFixed(2)}` : '',
      },
      {
        header: 'Notes',
        accessor: 'notes',
        type: 'string',
        width: 50,
        formatter: (value) => value || '',
      },
      {
        header: 'Location Name',
        accessor: (row) => row.assessment?.location?.name || '',
        type: 'string',
        width: 30,
      },
      {
        header: 'Coordinates',
        accessor: (row) => row.assessment?.location?.coordinates || '',
        type: 'string',
        width: 20,
      },
    ];

    const csvData: CSVData = {
      rows: responses,
      columns,
      options: { ...options, addBOM: true },
    };

    return this.generate(csvData);
  }

  /**
   * Generate CSV from entity data
   */
  generateFromEntities(entities: any[], options?: CSVExportOptions): string {
    const columns: CSVColumn[] = [
      {
        header: 'ID',
        accessor: 'id',
        type: 'string',
        width: 36,
      },
      {
        header: 'Name',
        accessor: 'name',
        type: 'string',
        width: 40,
      },
      {
        header: 'Type',
        accessor: 'type',
        type: 'string',
        width: 20,
      },
      {
        header: 'Status',
        accessor: 'status',
        type: 'string',
        width: 15,
        formatter: (value) => this.formatStatus(value),
      },
      {
        header: 'Coordinates',
        accessor: 'coordinates',
        type: 'string',
        width: 20,
      },
      {
        header: 'Address',
        accessor: 'address',
        type: 'string',
        width: 50,
      },
      {
        header: 'Jurisdiction Name',
        accessor: (row) => row.jurisdiction?.name || '',
        type: 'string',
        width: 30,
      },
      {
        header: 'Jurisdiction Level',
        accessor: (row) => row.jurisdiction?.level || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Population Size',
        accessor: 'populationSize',
        type: 'number',
        width: 18,
        formatter: (value) => value || 0,
      },
      {
        header: 'Contact Person',
        accessor: 'contactPerson',
        type: 'string',
        width: 30,
        formatter: (value) => value || '',
      },
      {
        header: 'Contact Phone',
        accessor: 'contactPhone',
        type: 'string',
        width: 20,
        formatter: (value) => value || '',
      },
      {
        header: 'Contact Email',
        accessor: 'contactEmail',
        type: 'string',
        width: 30,
        formatter: (value) => value || '',
      },
      {
        header: 'Operating Hours',
        accessor: 'operatingHours',
        type: 'string',
        width: 25,
        formatter: (value) => value || '',
      },
      {
        header: 'Capacity',
        accessor: 'capacity',
        type: 'number',
        width: 15,
        formatter: (value) => value || 0,
      },
      {
        header: 'Current Load',
        accessor: 'currentLoad',
        type: 'number',
        width: 15,
        formatter: (value) => value || 0,
      },
      {
        header: 'Assessment Count',
        accessor: (row) => row._count?.assessments || 0,
        type: 'number',
        width: 18,
      },
      {
        header: 'Response Count',
        accessor: (row) => row._count?.responses || 0,
        type: 'number',
        width: 18,
      },
      {
        header: 'Created Date',
        accessor: 'createdAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Last Updated',
        accessor: 'updatedAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
    ];

    const csvData: CSVData = {
      rows: entities,
      columns,
      options: { ...options, addBOM: true },
    };

    return this.generate(csvData);
  }

  /**
   * Generate CSV from incident data
   */
  generateFromIncidents(incidents: any[], options?: CSVExportOptions): string {
    const columns: CSVColumn[] = [
      {
        header: 'ID',
        accessor: 'id',
        type: 'string',
        width: 36,
      },
      {
        header: 'Type',
        accessor: 'type',
        type: 'string',
        width: 20,
      },
      {
        header: 'Severity',
        accessor: 'severity',
        type: 'string',
        width: 15,
        formatter: (value) => value || 'Unknown',
      },
      {
        header: 'Status',
        accessor: 'status',
        type: 'string',
        width: 15,
        formatter: (value) => this.formatStatus(value),
      },
      {
        header: 'Title',
        accessor: 'title',
        type: 'string',
        width: 50,
        formatter: (value) => value || '',
      },
      {
        header: 'Description',
        accessor: 'description',
        type: 'string',
        width: 100,
        formatter: (value) => value || '',
      },
      {
        header: 'Location Name',
        accessor: (row) => row.location?.name || '',
        type: 'string',
        width: 30,
      },
      {
        header: 'Coordinates',
        accessor: (row) => row.location?.coordinates || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Affected Area Radius (km)',
        accessor: 'affectedAreaRadius',
        type: 'number',
        width: 25,
        formatter: (value) => value || 0,
      },
      {
        header: 'Estimated Population Affected',
        accessor: 'estimatedPopulationAffected',
        type: 'number',
        width: 30,
        formatter: (value) => value || 0,
      },
      {
        header: 'Created Date',
        accessor: 'createdAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Last Updated',
        accessor: 'updatedAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Reported By',
        accessor: 'reportedBy',
        type: 'string',
        width: 30,
        formatter: (value) => value || '',
      },
      {
        header: 'Assigned To',
        accessor: (row) => row.assignedTo?.name || 'Unassigned',
        type: 'string',
        width: 25,
      },
      {
        header: 'Assessment Count',
        accessor: (row) => row._count?.assessments || 0,
        type: 'number',
        width: 18,
      },
      {
        header: 'Response Count',
        accessor: (row) => row._count?.responses || 0,
        type: 'number',
        width: 18,
      },
      {
        header: 'Estimated Resolution Time',
        accessor: 'estimatedResolutionTime',
        type: 'string',
        width: 25,
        formatter: (value) => value || '',
      },
      {
        header: 'Communication Channels Status',
        accessor: 'communicationChannelsStatus',
        type: 'string',
        width: 35,
        formatter: (value) => value || 'Unknown',
      },
    ];

    const csvData: CSVData = {
      rows: incidents,
      columns,
      options: { ...options, addBOM: true },
    };

    return this.generate(csvData);
  }

  /**
   * Generate CSV from commitment data
   */
  generateFromCommitments(commitments: any[], options?: CSVExportOptions, currencySymbol: string = CURRENCY_SYMBOL_DEFAULT): string {
    const columns: CSVColumn[] = [
      {
        header: 'ID',
        accessor: 'id',
        type: 'string',
        width: 36,
      },
      {
        header: 'Donor Name',
        accessor: (row) => row.donor?.name || '',
        type: 'string',
        width: 40,
      },
      {
        header: 'Donor Type',
        accessor: (row) => row.donor?.type || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Entity Name',
        accessor: (row) => row.entity?.name || '',
        type: 'string',
        width: 40,
      },
      {
        header: 'Entity Type',
        accessor: (row) => row.entity?.type || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Incident Title',
        accessor: (row) => row.incident?.title || '',
        type: 'string',
        width: 50,
      },
      {
        header: 'Incident Type',
        accessor: (row) => row.incident?.type || '',
        type: 'string',
        width: 20,
      },
      {
        header: 'Status',
        accessor: 'status',
        type: 'string',
        width: 15,
        formatter: (value) => this.formatStatus(value),
      },
      {
        header: 'Created Date',
        accessor: 'createdAt',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Expected Delivery Date',
        accessor: 'expectedDeliveryDate',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Actual Delivery Date',
        accessor: 'actualDeliveryDate',
        type: 'date',
        format: 'YYYY-MM-DD HH:mm:ss',
        width: 20,
        formatter: (value) => value ? new Date(value).toISOString() : '',
      },
      {
        header: 'Total Items',
        accessor: (row) => row._count?.items || 0,
        type: 'number',
        width: 15,
      },
      {
        header: 'Total Estimated Value',
        accessor: 'totalEstimatedValue',
        type: 'number',
        width: 25,
        formatter: (value) => value ? `${currencySymbol}${value.toFixed(2)}` : '',
      },
      {
        header: 'Notes',
        accessor: 'notes',
        type: 'string',
        width: 50,
        formatter: (value) => value || '',
      },
      {
        header: 'Priority Level',
        accessor: 'priorityLevel',
        type: 'string',
        width: 15,
        formatter: (value) => value || 'Medium',
      },
    ];

    const csvData: CSVData = {
      rows: commitments,
      columns,
      options: { ...options, addBOM: true },
    };

    return this.generate(csvData);
  }

  private validateData(rows: any[], columns: CSVColumn[]): void {
    if (!Array.isArray(rows)) {
      throw new Error('Rows must be an array');
    }
    
    if (!Array.isArray(columns) || columns.length === 0) {
      throw new Error('Columns must be a non-empty array');
    }
    
    // Check column accessor functions
    for (const column of columns) {
      if (typeof column.accessor !== 'string' && typeof column.accessor !== 'function') {
        throw new Error(`Column accessor for "${column.header}" must be string or function`);
      }
    }
  }

  private generateHeaderLine(columns: CSVColumn[], options: Required<CSVExportOptions>): string {
    const headers = columns.map(col => {
      let header = col.header;
      
      if (options.quoteFields) {
        header = this.quoteField(header, options);
      }
      
      return header;
    });
    
    return headers.join(options.delimiter);
  }

  private generateDataLine(row: any, columns: CSVColumn[], options: Required<CSVExportOptions>): string {
    const fields = columns.map(col => {
      let value = this.getFieldValue(row, col);
      value = this.formatFieldValue(value, row, col);
      
      if (options.quoteFields) {
        value = this.quoteField(value, options);
      }
      
      return value;
    });
    
    return fields.join(options.delimiter);
  }

  private getFieldValue(row: any, column: CSVColumn): any {
    if (typeof column.accessor === 'string') {
      return this.getNestedProperty(row, column.accessor);
    } else {
      return column.accessor(row);
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : '';
    }, obj);
  }

  private formatFieldValue(value: any, row: any, column: CSVColumn): string {
    // Apply custom formatter if provided
    if (column.formatter) {
      return column.formatter(value, row, column);
    }
    
    // Default formatting by type
    switch (column.type) {
      case 'number':
        return typeof value === 'number' ? value.toString() : '0';
      case 'date':
        if (!value) return '';
        const date = new Date(value);
        return column.format ? this.formatDate(date, column.format) : date.toISOString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'string':
      default:
        return value ? value.toString() : '';
    }
  }

  private formatHeader(header: string): string {
    // Convert camelCase or snake_case to Title Case
    return header
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private detectDataType(value: any): 'string' | 'number' | 'date' | 'boolean' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && !isNaN(Date.parse(value))) return 'date';
    return 'string';
  }

  private formatDate(date: Date, format: string): string {
    // Simple date formatting (in production, use date-fns or similar)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return format
      .replace('YYYY', year.toString())
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  private formatStatus(status: string): string {
    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private quoteField(field: string, options: Required<CSVExportOptions>): string {
    if (field === null || field === undefined) {
      return '';
    }
    
    const fieldStr = field.toString();
    
    // Check if field needs quoting
    const needsQuoting = 
      options.quoteFields && (
        fieldStr.includes(options.delimiter) ||
        fieldStr.includes(options.quoteChar) ||
        fieldStr.includes(options.lineTerminator) ||
        fieldStr.startsWith(' ') ||
        fieldStr.endsWith(' ')
      );
    
    if (!needsQuoting) {
      return fieldStr;
    }
    
    // Quote and escape
    const escapedField = fieldStr.replace(
      new RegExp(options.quoteChar, 'g'),
      options.escapeChar + options.quoteChar
    );
    
    return options.quoteChar + escapedField + options.quoteChar;
  }
}

// Export singleton instance
export const csvGenerator = new CSVGenerator();

// Utility functions for direct usage
export const generateCSV = (data: any[], columns: CSVColumn[], options?: CSVExportOptions): string => {
  const csvData: CSVData = {
    rows: data,
    columns,
    options,
  };
  
  return csvGenerator.generate(csvData);
};

export const generateAssessmentsCSV = (assessments: any[], options?: CSVExportOptions): string => {
  return csvGenerator.generateFromAssessments(assessments, options);
};

export const generateResponsesCSV = (responses: any[], options?: CSVExportOptions, currencySymbol?: string): string => {
  return csvGenerator.generateFromResponses(responses, options, currencySymbol);
};

export const generateEntitiesCSV = (entities: any[], options?: CSVExportOptions): string => {
  return csvGenerator.generateFromEntities(entities, options);
};

export const generateIncidentsCSV = (incidents: any[], options?: CSVExportOptions): string => {
  return csvGenerator.generateFromIncidents(incidents, options);
};

export const generateCommitmentsCSV = (commitments: any[], options?: CSVExportOptions, currencySymbol?: string): string => {
  return csvGenerator.generateFromCommitments(commitments, options, currencySymbol);
};

// CSVGenerator and CSVData are already exported above