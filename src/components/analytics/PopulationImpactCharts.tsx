'use client'

import { useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import '@/lib/utils/chart-registration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Users, Baby, Accessibility, Heart, Building, User } from '@/lib/icons'
import type { PopulationData } from '@/hooks/useCoordinatorAnalytics'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function PopulationTrendChart({ data }: { data: PopulationData }) {
  const chartData = useMemo(() => {
    const sorted = [...data.trend].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return {
      labels: sorted.map(d => formatDate(d.date)),
      datasets: [
        {
          label: 'Displaced',
          data: sorted.map(d => d.displaced),
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f630',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Injured',
          data: sorted.map(d => d.injured),
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b30',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Lives Lost',
          data: sorted.map(d => d.livesLost),
          borderColor: '#ef4444',
          backgroundColor: '#ef444430',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ],
    }
  }, [data])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
    },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true },
    },
  }), [])

  if (!data.trend || data.trend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Population Impact Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 sm:h-64 text-muted-foreground">
            No population impact data available.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Population Impact Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 sm:h-80">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  )
}

function VulnerablePopulationBreakdown({ data }: { data: PopulationData }) {
  const { demographics: d } = data
  const groups = [
    { label: 'Children Under 5', value: d.populationUnder5, icon: Baby, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300' },
    { label: 'Elderly Persons', value: d.elderlyPersons, icon: Users, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
    { label: 'Persons with Disability', value: d.personWithDisability, icon: Accessibility, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    { label: 'Pregnant Women', value: d.pregnantWomen, icon: Heart, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
    { label: 'Lactating Mothers', value: d.lactatingMothers, icon: Heart, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
    { label: 'Separated Children', value: d.separatedChildren, icon: Baby, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  ]

  const totalVulnerable = groups.reduce((s, g) => s + g.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-5 w-5" />
          Vulnerable Population Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <StatCardGrid columns={3} gap="sm">
          {groups.map(g => (
            <div key={g.label} className={`rounded-lg p-3 ${g.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <g.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{g.label}</span>
              </div>
              <div className="text-xl font-bold">{g.value.toLocaleString()}</div>
              {d.totalPopulation > 0 && (
                <div className="text-xs opacity-75 mt-0.5">
                  {((g.value / d.totalPopulation) * 100).toFixed(1)}% of population
                </div>
              )}
            </div>
          ))}
        </StatCardGrid>
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Vulnerable</span>
            <span className="font-bold">{totalVulnerable.toLocaleString()}</span>
          </div>
          {d.totalPopulation > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>% of Total Population</span>
              <span>{((totalVulnerable / d.totalPopulation) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function DemographicSummary({ data }: { data: PopulationData }) {
  const { demographics: d } = data

  return (
    <>
      <StatCardGrid columns={4}>
        <StatCard
          label="Total Population"
          value={d.totalPopulation.toLocaleString()}
          severity="info"
          icon={Users}
        />
        <StatCard
          label="Total Households"
          value={d.totalHouseholds.toLocaleString()}
          severity="neutral"
          icon={Building}
        />
        <StatCard
          label="Male"
          value={d.populationMale.toLocaleString()}
          severity="info"
          icon={User}
        />
        <StatCard
          label="Female"
          value={d.populationFemale.toLocaleString()}
          severity="info"
          icon={Users}
        />
      </StatCardGrid>
      {(d.populationMale > 0 || d.populationFemale > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-blue-600 font-medium">Male</span>
                  <span>{d.populationMale.toLocaleString()} ({d.totalPopulation > 0 ? ((d.populationMale / d.totalPopulation) * 100).toFixed(0) : 0}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${d.totalPopulation > 0 ? (d.populationMale / d.totalPopulation) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-pink-600 font-medium">Female</span>
                  <span>{d.populationFemale.toLocaleString()} ({d.totalPopulation > 0 ? ((d.populationFemale / d.totalPopulation) * 100).toFixed(0) : 0}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-pink-500 rounded-full"
                    style={{ width: `${d.totalPopulation > 0 ? (d.populationFemale / d.totalPopulation) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export { PopulationTrendChart, VulnerablePopulationBreakdown, DemographicSummary }
