'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ReportBuilder } from '@/components/reports/builder/ReportBuilder'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@/lib/icons'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { ReportTemplate } from '@/lib/reports/template-engine'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ReportBuilderPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { token } = useAuth()
  const configId = searchParams.get('id')
  const [initialTemplate, setInitialTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(!!configId)
  const [previewTemplate, setPreviewTemplate] = useState<ReportTemplate | null>(null)

  useEffect(() => {
    if (!configId || !token) return
    const fetchData = async () => {
      try {
        const configRes = await fetch(`/api/v1/reports/configurations/${configId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (configRes.ok) {
          const configData = await configRes.json()
          const config = configData.data
          if (config?.template) {
            setInitialTemplate({
              ...config.template,
              layout: config.template.layout || [],
              configurationId: config.id,
              configurationName: config.name,
              filters: config.filters,
              schedule: config.schedule
            })
          } else {
            toast.error('Configuration has no associated template')
          }
        } else {
          const tmplRes = await fetch(`/api/v1/reports/templates/${configId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (tmplRes.ok) {
            const tmplData = await tmplRes.json()
            setInitialTemplate(tmplData.data)
          } else {
            toast.error('Failed to load report')
          }
        }
      } catch {
        toast.error('Failed to load report')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [configId, token])

  const handleSave = useCallback(async (template: any) => {
    if (!token) return
    try {
      const isEdit = !!configId
      if (initialTemplate?.configurationId) {
        const res = await fetch(`/api/v1/reports/configurations/${initialTemplate.configurationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: template.name || initialTemplate.configurationName,
            schedule: template.schedule
          })
        })
        if (res.ok) {
          toast.success('Configuration updated')
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to save configuration')
        }
      } else {
        const url = isEdit
          ? `/api/v1/reports/templates/${configId}`
          : '/api/v1/reports/templates'
        const method = isEdit ? 'PATCH' : 'POST'

        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: template.name || 'Untitled Report',
            description: template.description,
            type: template.type || 'CUSTOM',
            layout: template.layout || [],
            isPublic: template.isPublic ?? false
          })
        })

        if (res.ok) {
          const data = await res.json()
          toast.success(isEdit ? 'Template updated' : 'Template created')
          if (!isEdit && data.data?.id) {
            router.replace(`/reports/builder?id=${data.data.id}`)
          }
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to save template')
        }
      }
    } catch {
      toast.error('Failed to save template')
    }
  }, [token, configId, router])

  const handlePreview = useCallback((template: ReportTemplate) => {
    setPreviewTemplate(template)
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Loading template...
          </CardContent>
        </Card>
      </div>
    )
  }

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
          <ReportBuilder
            initialTemplate={initialTemplate || undefined}
            onSave={handleSave}
            onPreview={handlePreview}
          />
        </CardContent>
      </Card>

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name || 'Report Preview'}</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.description && (
                <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              )}
              <div className="text-sm text-muted-foreground">
                {previewTemplate.layout.length} element{previewTemplate.layout.length !== 1 ? 's' : ''} configured
              </div>
              <div className="space-y-3">
                {previewTemplate.layout.map((el, i) => (
                  <Card key={el.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium capitalize">{el.type}</span>
                        {el.config?.title && (
                          <span className="text-muted-foreground ml-2">— {el.config.title}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {el.position.width}×{el.position.height}
                      </div>
                    </div>
                    {el.config?.description && (
                      <p className="text-sm text-muted-foreground mt-1">{el.config.description}</p>
                    )}
                    {el.dataSource && (
                      <div className="mt-2 text-xs">
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded">
                          {el.dataSource}
                        </span>
                        {el.visualization && (
                          <span className="bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 px-2 py-0.5 rounded ml-1">
                            {el.visualization.type}
                          </span>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
