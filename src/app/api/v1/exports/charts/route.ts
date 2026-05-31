import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api/response'

const ROLE_PERMISSIONS = {
  assessor: ['read'],
  coordinator: ['read', 'export'],
  responder: ['read', 'export'],
  donor: ['read', 'export'],
  admin: ['read', 'export'],
};

interface ChartExportRequest {
  chartType: 'bar' | 'pie' | 'line' | 'area' | 'scatter' | 'heat-map';
  data: any[];
  options?: {
    title?: string;
    width?: number;
    height?: number;
    format?: 'svg';
    quality?: number;
    backgroundColor?: string;
    theme?: 'light' | 'dark';
  };
}

interface ChartDataPoint {
  label: string;
  value: number;
  category?: string;
  timestamp?: string;
  coordinates?: { lat: number; lng: number };
}

export const POST = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {
    const userPermissions = context.roles.flatMap(role => ROLE_PERMISSIONS[role.toLowerCase() as keyof typeof ROLE_PERMISSIONS] || []);

    if (!userPermissions.includes('export')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for chart export' },
        { status: 403 }
      );
    }

    const body: ChartExportRequest = await request.json();
    const { chartType, data, options = {} } = body;

    // Validate request
    if (!chartType || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: 'Invalid request: chartType and data are required' },
        { status: 400 }
      );
    }

    // Set default options
    const exportOptions = {
      title: options.title || 'Dashboard Chart Export',
      width: options.width || 800,
      height: options.height || 600,
      format: options.format || 'png',
      quality: options.quality || 90,
      backgroundColor: options.backgroundColor || '#ffffff',
      theme: options.theme || 'light',
      ...options,
    };

    // Validate data size
    if (data.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Data too large for chart export (max 10,000 points)' },
        { status: 400 }
      );
    }

    // Generate chart based on type
    const chartData = await generateChart(chartType, data, exportOptions);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${chartType}_chart_${timestamp}.${exportOptions.format}`;

    // Return chart file - pass Buffer directly
    return new NextResponse(chartData as any, {
      headers: {
        'Content-Type': getContentType(exportOptions.format),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    return handleApiError(error)
  }
});

async function generateChart(chartType: string, data: ChartDataPoint[], options: any): Promise<Buffer> {
  try {
    // For now, we'll create a basic SVG implementation
    // In a production environment, you might use libraries like:
    // - chart.js/node-canvas
    // - puppeteer + chart.js
    // - sharp for image processing
    
    switch (chartType) {
      case 'bar':
        return generateBarChart(data, options);
      case 'pie':
        return generatePieChart(data, options);
      case 'line':
        return generateLineChart(data, options);
      case 'area':
        return generateAreaChart(data, options);
      case 'scatter':
        return generateScatterChart(data, options);
      case 'heat-map':
        return generateHeatMap(data, options);
      default:
        throw new Error(`Unsupported chart type: ${chartType}`);
    }
  } catch (error) {
    console.error('Chart generation error:', error);
    throw new Error('Failed to generate chart');
  }
}

function generateBarChart(data: ChartDataPoint[], options: any): Buffer {
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;
  
  // Simple SVG bar chart generation
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = Math.min((width - 100) / data.length - 10, 50);
  const chartHeight = height - 100;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  
  // Add title
  if (options.title) {
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${options.title}</text>`;
  }
  
  // Generate bars
  data.forEach((point, index) => {
    const barHeight = (point.value / maxValue) * chartHeight;
    const x = 50 + (index * (barWidth + 10));
    const y = height - 50 - barHeight;
    
    // Bar
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#3b82f6" stroke="#2563eb" stroke-width="1"/>`;
    
    // Label
    svg += `<text x="${x + barWidth/2}" y="${height - 30}" text-anchor="middle" font-size="12" fill="#333">${point.label}</text>`;
    
    // Value
    svg += `<text x="${x + barWidth/2}" y="${y - 5}" text-anchor="middle" font-size="12" fill="#333">${point.value}</text>`;
  });
  
  svg += '</svg>';
  
  return Buffer.from(svg, 'utf8');
}

function generatePieChart(data: ChartDataPoint[], options: any): Buffer {
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;
  
  const total = data.reduce((sum, point) => sum + point.value, 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  
  // Add title
  if (options.title) {
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${options.title}</text>`;
  }
  
  let currentAngle = -90; // Start from top
  
  data.forEach((point, index) => {
    const percentage = (point.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const endAngle = currentAngle + angle;
    
    const startRad = (currentAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Pie slice
    svg += `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
                     fill="${getChartColor(index)}" stroke="#fff" stroke-width="2"/>`;
    
    // Label
    const labelAngle = currentAngle + angle / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelX = centerX + (radius * 0.7) * Math.cos(labelRad);
    const labelY = centerY + (radius * 0.7) * Math.sin(labelRad);
    
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="12" fill="#fff" font-weight="bold">${point.label}</text>`;
    svg += `<text x="${labelX}" y="${labelY + 15}" text-anchor="middle" font-size="10" fill="#fff">${percentage.toFixed(1)}%</text>`;
    
    currentAngle = endAngle;
  });
  
  svg += '</svg>';
  
  return Buffer.from(svg, 'utf8');
}

function generateLineChart(data: ChartDataPoint[], options: any): Buffer {
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;
  
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue;
  const chartWidth = width - 100;
  const chartHeight = height - 100;
  const xStep = chartWidth / (data.length - 1);
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  
  // Add title
  if (options.title) {
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${options.title}</text>`;
  }
  
  // Generate line path
  let pathData = '';
  const points: { x: number; y: number }[] = [];
  
  data.forEach((point, index) => {
    const x = 50 + (index * xStep);
    const y = height - 50 - ((point.value - minValue) / valueRange) * chartHeight;
    
    points.push({ x, y });
    
    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  });
  
  // Draw line
  svg += `<path d="${pathData}" fill="none" stroke="#3b82f6" stroke-width="2"/>`;
  
  // Draw points and labels
  data.forEach((point, index) => {
    const { x, y } = points[index];
    
    // Point
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6" stroke="#fff" stroke-width="2"/>`;
    
    // Label
    svg += `<text x="${x}" y="${height - 30}" text-anchor="middle" font-size="12" fill="#333">${point.label}</text>`;
    
    // Value
    svg += `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="12" fill="#333">${point.value}</text>`;
  });
  
  svg += '</svg>';
  
  return Buffer.from(svg, 'utf8');
}

function generateAreaChart(data: ChartDataPoint[], options: any): Buffer {
  // Similar to line chart but with filled area
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;
  
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue;
  const chartWidth = width - 100;
  const chartHeight = height - 100;
  const xStep = chartWidth / (data.length - 1);
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  
  // Add title
  if (options.title) {
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${options.title}</text>`;
  }
  
  // Generate area path
  let pathData = '';
  const points: { x: number; y: number }[] = [];
  
  data.forEach((point, index) => {
    const x = 50 + (index * xStep);
    const y = height - 50 - ((point.value - minValue) / valueRange) * chartHeight;
    
    points.push({ x, y });
    
    if (index === 0) {
      pathData += `M ${x} ${y}`;
    } else {
      pathData += ` L ${x} ${y}`;
    }
  });
  
  // Complete the area path
  pathData += ` L ${50 + (data.length - 1) * xStep} ${height - 50} L 50 ${height - 50} Z`;
  
  // Draw area
  svg += `<path d="${pathData}" fill="#3b82f6" fill-opacity="0.3" stroke="#3b82f6" stroke-width="2"/>`;
  
  // Draw points and labels (similar to line chart)
  data.forEach((point, index) => {
    const { x, y } = points[index];
    
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6" stroke="#fff" stroke-width="2"/>`;
    svg += `<text x="${x}" y="${height - 30}" text-anchor="middle" font-size="12" fill="#333">${point.label}</text>`;
    svg += `<text x="${x}" y="${y - 10}" text-anchor="middle" font-size="12" fill="#333">${point.value}</text>`;
  });
  
  svg += '</svg>';
  
  return Buffer.from(svg, 'utf8');
}

function generateScatterChart(data: ChartDataPoint[], options: any): Buffer {
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;
  
  const maxX = Math.max(...data.map(d => d.coordinates?.lng || 0));
  const minX = Math.min(...data.map(d => d.coordinates?.lng || 0));
  const maxY = Math.max(...data.map(d => d.coordinates?.lat || 0));
  const minY = Math.min(...data.map(d => d.coordinates?.lat || 0));
  const maxValue = Math.max(...data.map(d => d.value));
  
  const chartWidth = width - 100;
  const chartHeight = height - 100;
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  
  // Add title
  if (options.title) {
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${options.title}</text>`;
  }
  
  // Draw points
  data.forEach((point) => {
    if (point.coordinates) {
      const x = 50 + ((point.coordinates.lng - minX) / xRange) * chartWidth;
      const y = height - 50 - ((point.coordinates.lat - minY) / yRange) * chartHeight;
      const radius = 3 + (point.value / maxValue) * 10; // Size based on value
      
      svg += `<circle cx="${x}" cy="${y}" r="${radius}" fill="#3b82f6" fill-opacity="0.7" stroke="#2563eb" stroke-width="1"/>`;
    }
  });
  
  svg += '</svg>';
  
  return Buffer.from(svg, 'utf8');
}

function generateHeatMap(data: ChartDataPoint[], options: any): Buffer {
  // Simplified heat map implementation
  const { width = 800, height = 600, backgroundColor = '#ffffff' } = options;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  
  // Add title
  if (options.title) {
    svg += `<text x="${width/2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#333">${options.title}</text>`;
  }
  
  // Simple grid-based heat map
  const gridSize = 20;
  const cols = Math.floor((width - 100) / gridSize);
  const rows = Math.floor((height - 100) / gridSize);
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const value = data[Math.floor(Math.random() * data.length)]?.value || 0;
      const intensity = value / Math.max(...data.map(d => d.value));
      const color = getHeatMapColor(intensity);
      
      const x = 50 + col * gridSize;
      const y = 50 + row * gridSize;
      
      svg += `<rect x="${x}" y="${y}" width="${gridSize-1}" height="${gridSize-1}" fill="${color}"/>`;
    }
  }
  
  svg += '</svg>';
  
  return Buffer.from(svg, 'utf8');
}

function getChartColor(index: number): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7'
  ];
  return colors[index % colors.length];
}

function getHeatMapColor(intensity: number): string {
  // Simple color gradient from blue (low) to red (high)
  if (intensity < 0.25) return '#3b82f6'; // Blue
  if (intensity < 0.5) return '#10b981'; // Green
  if (intensity < 0.75) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
}

function getContentType(format: string): string {
  switch (format) {
    case 'png':
      return 'image/png';
    case 'svg':
      return 'image/svg+xml';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/png';
  }
}

// Get available chart types and formats
export const GET = withAuth(async (request: NextRequest, context: AuthContext) => {
  try {

    return NextResponse.json({
      success: true,
      data: {
        chartTypes: ['bar', 'pie', 'line', 'area', 'scatter', 'heat-map'],
        formats: ['svg'],
        maxDataPoints: 10000,
        defaultOptions: {
          width: 800,
          height: 600,
          quality: 90,
          backgroundColor: '#ffffff',
          theme: 'light',
        },
      },
    });
  } catch (error) {
    return handleApiError(error)
  }
});