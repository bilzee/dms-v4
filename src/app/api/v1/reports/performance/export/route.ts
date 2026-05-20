import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/client';
import { z } from 'zod';
import { handleApiError } from '@/lib/api/response'

const ExportRequestSchema = z.object({
  donorIds: z.array(z.string()).optional(),
  format: z.enum(['csv', 'pdf']).default('csv'),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).default('30d'),
  includeCharts: z.boolean().default(false)
});

export const POST = withAuth(async (request: NextRequest, context) => {
  try {
    const { roles, userId } = context;
    
    // Check if user has coordinator or admin role for full export, or donor role for own data
    const canExportAll = roles.includes('COORDINATOR') || roles.includes('ADMIN');
    
    if (!roles.includes('DONOR') && !canExportAll) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Donor, Coordinator, or Admin role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const exportParams = ExportRequestSchema.safeParse(body);
    
    if (!exportParams.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid export parameters', details: exportParams.error },
        { status: 400 }
      );
    }

    const { donorIds, format, timeframe, includeCharts } = exportParams.data;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        startDate.setFullYear(2020); // Far back date
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Determine which donors to export
    let donorFilter: any = { isActive: true };
    
    if (donorIds && donorIds.length > 0) {
      // If specific donors requested, check permissions
      if (!canExportAll) {
        // For donor role, verify they can only access their own data
        const userDonorRecord = await prisma.donor.findFirst({
          where: { 
            OR: [
              { contactEmail: userId },
              { id: { in: donorIds } }
            ]
          },
          select: { id: true }
        });
        
        if (!userDonorRecord || !donorIds.includes(userDonorRecord.id)) {
          return NextResponse.json(
            { success: false, error: 'Can only export your own performance data' },
            { status: 403 }
          );
        }
        donorFilter.id = { in: [userDonorRecord.id] };
      } else {
        donorFilter.id = { in: donorIds };
      }
    } else if (!canExportAll) {
      // For donor role without specific IDs, get their own data
      const userDonorRecord = await prisma.donor.findFirst({
        where: { contactEmail: userId },
        select: { id: true }
      });
      
      if (!userDonorRecord) {
        return NextResponse.json(
          { success: false, error: 'No donor record found for current user' },
          { status: 404 }
        );
      }
      donorFilter.id = userDonorRecord.id;
    }

    // Fetch comprehensive donor performance data
    const donorsData = await prisma.donor.findMany({
      where: donorFilter,
      select: {
        id: true,
        name: true,
        organization: true,
        contactEmail: true,
        selfReportedDeliveryRate: true,
        verifiedDeliveryRate: true,
        leaderboardRank: true,
        createdAt: true,
        commitments: {
          where: {
            commitmentDate: {
              gte: startDate,
              lte: now
            }
          },
          select: {
            id: true,
            status: true,
            totalCommittedQuantity: true,
            deliveredQuantity: true,
            verifiedDeliveredQuantity: true,
            totalValueEstimated: true,
            commitmentDate: true,
            items: true,
            entity: {
              select: {
                name: true,
                location: true
              }
            }
          }
        },
        responses: {
          where: {
            createdAt: {
              gte: startDate,
              lte: now
            }
          },
          select: {
            id: true,
            verificationStatus: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        leaderboardRank: 'asc'
      }
    });

    // Process data for export
    const exportData = donorsData.map(donor => {
      // Calculate metrics
      const totalCommitments = donor.commitments.length;
      const completedCommitments = donor.commitments.filter(c => c.status === 'COMPLETE').length;
      const partialCommitments = donor.commitments.filter(c => c.status === 'PARTIAL').length;
      const plannedCommitments = donor.commitments.filter(c => c.status === 'PLANNED').length;
      
      const totalCommittedItems = donor.commitments.reduce((sum, c) => sum + c.totalCommittedQuantity, 0);
      const totalDeliveredItems = donor.commitments.reduce((sum, c) => sum + c.deliveredQuantity, 0);
      const totalVerifiedItems = donor.commitments.reduce((sum, c) => sum + c.verifiedDeliveredQuantity, 0);
      const totalCommitmentValue = donor.commitments.reduce((sum, c) => sum + (c.totalValueEstimated || 0), 0);
      
      const selfReportedDeliveryRate = totalCommittedItems > 0 ? (totalDeliveredItems / totalCommittedItems) * 100 : 0;
      const verifiedDeliveryRate = totalCommittedItems > 0 ? (totalVerifiedItems / totalCommittedItems) * 100 : 0;
      
      const totalResponses = donor.responses.length;
      const verifiedResponses = donor.responses.filter(r => 
        r.verificationStatus === 'VERIFIED' || r.verificationStatus === 'AUTO_VERIFIED'
      ).length;
      const responseVerificationRate = totalResponses > 0 ? (verifiedResponses / totalResponses) * 100 : 0;

      // Calculate engagement metrics
      const daysSinceJoined = Math.ceil((now.getTime() - new Date(donor.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const activityFrequency = (totalCommitments + totalResponses) / Math.max(daysSinceJoined, 1);

      return {
        'Donor ID': donor.id,
        'Organization Name': donor.organization || donor.name,
        'Contact Email': donor.contactEmail || 'Not provided',
        'Leaderboard Rank': donor.leaderboardRank || 'Unranked',
        'Member Since': donor.createdAt.toISOString().split('T')[0],
        'Days Active': daysSinceJoined,
        
        // Commitment Metrics
        'Total Commitments': totalCommitments,
        'Completed Commitments': completedCommitments,
        'Partial Commitments': partialCommitments,
        'Planned Commitments': plannedCommitments,
        'Commitment Fulfillment Rate (%)': totalCommitments > 0 ? Math.round((completedCommitments / totalCommitments) * 100) : 0,
        
        // Delivery Metrics
        'Total Committed Items': totalCommittedItems,
        'Self-Reported Delivered Items': totalDeliveredItems,
        'Verified Delivered Items': totalVerifiedItems,
        'Self-Reported Delivery Rate (%)': Math.round(selfReportedDeliveryRate * 100) / 100,
        'Verified Delivery Rate (%)': Math.round(verifiedDeliveryRate * 100) / 100,
        'Delivery Accuracy (%)': totalDeliveredItems > 0 ? Math.round((totalVerifiedItems / totalDeliveredItems) * 100) : 0,
        
        // Value Metrics
        'Total Commitment Value ($)': Math.round(totalCommitmentValue * 100) / 100,
        'Average Commitment Value ($)': totalCommitments > 0 ? Math.round((totalCommitmentValue / totalCommitments) * 100) / 100 : 0,
        
        // Response Metrics
        'Total Responses': totalResponses,
        'Verified Responses': verifiedResponses,
        'Response Verification Rate (%)': Math.round(responseVerificationRate * 100) / 100,
        
        // Performance Metrics
        'Activity Frequency (per day)': Math.round(activityFrequency * 1000) / 1000,
        'Total Activities': totalCommitments + totalResponses,
        
        // Export Metadata
        'Export Date': now.toISOString().split('T')[0],
        'Report Period': timeframe,
        'Data From': startDate.toISOString().split('T')[0],
        'Data To': now.toISOString().split('T')[0]
      };
    });

    if (format === 'csv') {
      // Generate CSV
      if (exportData.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No data available for export' },
          { status: 404 }
        );
      }

      const headers = Object.keys(exportData[0]);
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && value.includes(',') 
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      const filename = `donor-performance-report-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      });

    } else if (format === 'pdf') {
      // For PDF, return structured data that frontend can use to generate PDF
      return NextResponse.json({
        success: true,
        data: {
          exportType: 'pdf',
          reportData: exportData,
          metadata: {
            generatedAt: now.toISOString(),
            timeframe,
            startDate: startDate.toISOString(),
            endDate: now.toISOString(),
            totalDonors: exportData.length,
            includeCharts
          }
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported export format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Export performance report error:', error);
    return handleApiError(error);
  }
});