'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { ReportBuilder } from '@/components/reports/builder/ReportBuilder'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@/lib/icons'
import Link from 'next/link'

export default function ReportBuilderPage() {
  const searchParams = useSearchParams()
  const configId = searchParams.get('id')

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/coordinator/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {configId ? 'Edit Report Configuration' : 'Create Report Configuration'}
          </h1>
          <p className="text-gray-600">
            {configId ? 'Modify an existing report configuration' : 'Configure a new report'}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <ReportBuilder />
        </CardContent>
      </Card>
    </div>
  )
}
