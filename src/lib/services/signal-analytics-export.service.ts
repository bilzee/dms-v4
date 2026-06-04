import { prisma } from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import type { SignalAnalyticsQueryInput } from '@/lib/validation/signal-analytics';
import ExcelJS from 'exceljs';

const SIGNAL_REASON_LABELS: Record<string, string> = {
  'reassessment-needed': 'Reassessment Needed',
  'overdue': 'Population Assessment Overdue',
  'awaiting-plan': 'Response Plan Needed',
  'awaiting-plan-for-commitment': 'Commitment Needs Plan',
  'awaiting-delivery': 'Delivery Confirmation Needed',
  'partially-covered': 'Plan Partially Covered',
  'assessment-needs-response': 'Assessment Needs Resources',
  'plan-needs-commitment': 'Plan Needs Commitment',
  'partially-fulfilled': 'Commitment Partially Fulfilled',
  'assessment-awaiting-verification': 'Assessment Awaiting Review',
  'delivery-awaiting-verification': 'Delivery Awaiting Review',
  'verification-overdue': 'Verification Overdue',
  'entity-needs-responder': 'Entity Needs Responder',
  'entity-needs-donor': 'Entity Needs Donor',
};

interface ExportRow {
  createdAt: Date;
  resolvedAt: Date | null;
  signalReason: string;
  priority: string;
  entityName: string;
  entityType: string;
  incidentName: string;
  resolutionHours: number | null;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function rangeToDateRange(range: '7d' | '30d' | '90d') {
  const to = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export class SignalAnalyticsExportService {

  static async getExportData(input: SignalAnalyticsQueryInput): Promise<ExportRow[]> {
    const { from } = rangeToDateRange(input.range);

    const where: Prisma.ActionSignalWhereInput = {
      createdAt: { gte: from },
    };

    if (input.incidentId) where.incidentId = input.incidentId;
    if (input.entityId) where.entityId = input.entityId;
    if (input.signalReason) where.signalReason = input.signalReason;

    if (input.role) {
      where.user = {
        roles: {
          some: {
            role: {
              name: input.role,
            },
          },
        },
      };
    }

    const signals = await prisma.actionSignal.findMany({
      where,
      include: {
        entity: { select: { name: true, type: true } },
        incident: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return signals.map(s => ({
      createdAt: s.createdAt,
      resolvedAt: s.resolvedAt,
      signalReason: s.signalReason,
      priority: s.priority,
      entityName: s.entity.name,
      entityType: s.entity.type,
      incidentName: s.incident?.name || '',
      resolutionHours: s.resolvedAt
        ? Math.round((s.resolvedAt.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60) * 100) / 100
        : null,
    }));
  }

  static async exportAsCsv(input: SignalAnalyticsQueryInput): Promise<string> {
    const data = await this.getExportData(input);

    const headers = ['Date', 'Signal Reason', 'Priority', 'Entity', 'Entity Type', 'Incident', 'Resolved At', 'Resolution Hours'];
    const rows = data.map(row => [
      row.createdAt.toISOString().split('T')[0],
      SIGNAL_REASON_LABELS[row.signalReason] || row.signalReason,
      row.priority,
      row.entityName,
      row.entityType,
      row.incidentName,
      row.resolvedAt ? row.resolvedAt.toISOString().split('T')[0] : '',
      row.resolutionHours !== null ? String(row.resolutionHours) : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
    return csv;
  }

  static async exportAsExcel(input: SignalAnalyticsQueryInput): Promise<Buffer> {
    const data = await this.getExportData(input);
    const workbook = new ExcelJS.Workbook();

    const sheet1 = workbook.addWorksheet('Signal Data');
    sheet1.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Signal Reason', key: 'reason', width: 30 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Entity', key: 'entity', width: 25 },
      { header: 'Entity Type', key: 'entityType', width: 12 },
      { header: 'Incident', key: 'incident', width: 25 },
      { header: 'Resolved At', key: 'resolvedAt', width: 12 },
      { header: 'Resolution Hours', key: 'hours', width: 16 },
    ];

    sheet1.getRow(1).font = { bold: true };

    for (const row of data) {
      sheet1.addRow({
        date: row.createdAt.toISOString().split('T')[0],
        reason: SIGNAL_REASON_LABELS[row.signalReason] || row.signalReason,
        priority: row.priority,
        entity: row.entityName,
        entityType: row.entityType,
        incident: row.incidentName,
        resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString().split('T')[0] : '',
        hours: row.resolutionHours,
      });
    }

    const sheet2 = workbook.addWorksheet('Summary');

    const reasonCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();
    let resolved = 0;
    for (const row of data) {
      reasonCounts.set(row.signalReason, (reasonCounts.get(row.signalReason) || 0) + 1);
      priorityCounts.set(row.priority, (priorityCounts.get(row.priority) || 0) + 1);
      if (row.resolvedAt) resolved++;
    }

    sheet2.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 15 },
    ];
    sheet2.getRow(1).font = { bold: true };

    sheet2.addRow({ metric: 'Total Signals', value: data.length });
    sheet2.addRow({ metric: 'Resolved', value: resolved });
    sheet2.addRow({ metric: 'Unresolved', value: data.length - resolved });
    sheet2.addRow({ metric: 'Resolution Rate', value: data.length > 0 ? `${Math.round(resolved / data.length * 100)}%` : '0%' });
    sheet2.addRow({});
    sheet2.addRow({ metric: 'By Priority', value: '' });
    sheet2.getRow(sheet2.rowCount).font = { bold: true };
    for (const [priority, count] of priorityCounts) {
      sheet2.addRow({ metric: `  ${priority}`, value: count });
    }
    sheet2.addRow({});
    sheet2.addRow({ metric: 'By Signal Reason', value: '' });
    sheet2.getRow(sheet2.rowCount).font = { bold: true };
    for (const [reason, count] of reasonCounts) {
      sheet2.addRow({ metric: `  ${SIGNAL_REASON_LABELS[reason] || reason}`, value: count });
    }

    sheet1.views = [{ state: 'frozen', ySplit: 1 }];
    sheet2.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
