'use client'

import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Package, DollarSign, ClipboardList } from '@/lib/icons'
import type { ResourceData } from '@/hooks/useCoordinatorAnalytics'

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  PARTIAL: 'Partial',
  COMPLETE: 'Complete',
  CANCELLED: 'Cancelled',
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#3b82f6',
  PARTIAL: '#f59e0b',
  COMPLETE: '#22c55e',
  CANCELLED: '#94a3b8',
}

const TYPE_LABELS: Record<string, string> = {
  HEALTH: 'Health',
  WASH: 'WASH',
  SHELTER: 'Shelter',
  FOOD: 'Food',
  SECURITY: 'Security',
  POPULATION: 'Population',
  LOGISTICS: 'Logistics',
}

function CommitmentPipelineChart({ data }: { data: ResourceData }) {
  const totalCommitted = data.byStatus.reduce((s, r) => s + r.totalCommitted, 0)
  const totalDelivered = data.byStatus.reduce((s, r) => s + r.totalDelivered, 0)
  const totalVerified = data.byStatus.reduce((s, r) => s + r.totalVerified, 0)

  const chartData = useMemo(() => {
    const statuses = data.byStatus.filter(s => s.status !== 'CANCELLED')
    return {
      labels: statuses.map(s => STATUS_LABELS[s.status] || s.status),
      datasets: [
        {
          label: 'Committed',
          data: statuses.map(s => s.totalCommitted),
          backgroundColor: '#3b82f6cc',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Delivered',
          data: statuses.map(s => s.totalDelivered),
          backgroundColor: '#f59e0bcc',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Verified',
          data: statuses.map(s => s.totalVerified),
          backgroundColor: '#22c55ecc',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12 } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  }), [])

  const deliveryRate = totalCommitted > 0 ? Math.round((totalDelivered / totalCommitted) * 100) : 0
  const verificationRate = totalDelivered > 0 ? Math.round((totalVerified / totalDelivered) * 100) : 0

  return (
    <>
      <StatCardGrid columns={4}>
        <StatCard
          label="Commitments"
          value={data.totalCommitments}
          severity="info"
          icon={ClipboardList}
        />
        <StatCard
          label="Committed Items"
          value={totalCommitted.toLocaleString()}
          severity="info"
          icon={Package}
        />
        <StatCard
          label="Delivery Rate"
          value={`${deliveryRate}%`}
          severity={deliveryRate >= 80 ? 'success' : deliveryRate >= 50 ? 'warning' : 'critical'}
          icon={DollarSign}
        />
        <StatCard
          label="Verification Rate"
          value={`${verificationRate}%`}
          severity={verificationRate >= 70 ? 'success' : verificationRate >= 40 ? 'warning' : 'critical'}
          icon={Package}
        />
      </StatCardGrid>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5" />
            Commitment Pipeline by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.byStatus.length === 0 ? (
            <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
              No commitment data available.
            </div>
          ) : (
            <div className="h-56 sm:h-72">
              <Bar data={chartData} options={options} />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function ResourceTypeBreakdown({ data }: { data: ResourceData }) {
  const chartData = useMemo(() => {
    return {
      labels: data.byType.map(t => TYPE_LABELS[t.type] || t.type),
      datasets: [
        {
          label: 'Committed',
          data: data.byType.map(t => t.totalCommitted),
          backgroundColor: '#3b82f6cc',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Delivered',
          data: data.byType.map(t => t.totalDelivered),
          backgroundColor: '#22c55ecc',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12 } },
    },
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { font: { size: 11 } } },
    },
  }), [])

  if (data.byType.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-5 w-5" />
          Resource Breakdown by Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 sm:h-64">
          <Bar data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}

export { CommitmentPipelineChart, ResourceTypeBreakdown }
