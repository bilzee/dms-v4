'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { useRef } from 'react'
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Settings,
  HardDrive,
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  BarChart3
} from '@/lib/icons'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'

interface DatabaseStats {
  totalSize: string
  totalSizeBytes: number
  tablesCount: number
  recordsCount: number
  indexesCount: number
  activeConnections: number
  optimizationStatus: 'good' | 'warning' | 'critical'
  lastBackup: string
}

interface BackupRecord {
  id: string
  timestamp: string
  size: string
  type: 'automatic' | 'manual'
  status: 'success' | 'failed' | 'in-progress'
  location: string
}

interface TableInfo {
  name: string
  records: number
  size: string
  sizeBytes: number
  lastModified: string | null
  hasIndexes: boolean
}

export default function DatabaseManagementPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResults, setQueryResults] = useState<any[] | null>(null)
  const [queryRowCount, setQueryRowCount] = useState(0)
  const [isExecutingQuery, setIsExecutingQuery] = useState(false)
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { hasPermission, token } = useAuth()

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/database/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setStats(json.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [token])

  const fetchTables = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/database/tables', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setTables(json.data)
      }
    } catch (error) {
      console.error('Error fetching tables:', error)
    }
  }, [token])

  const fetchBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/database/backup', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setBackups(json.data)
      }
    } catch (error) {
      console.error('Error fetching backups:', error)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      setIsLoading(true)
      Promise.all([fetchStats(), fetchTables(), fetchBackups()]).finally(() => setIsLoading(false))
    }
  }, [token, fetchStats, fetchTables, fetchBackups])

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      const res = await fetch('/api/v1/admin/database/backup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setBackups(prev => [json.data, ...prev])
        toast.success('Backup created successfully')
      } else {
        toast.error('Failed to create backup')
      }
    } catch (error) {
      toast.error('Error creating backup')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure? This will overwrite current data.')) return
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/v1/admin/database/restore/${backupId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.data.message || 'Database restored successfully')
        await fetchStats()
      } else {
        toast.error(json.error || 'Failed to restore backup')
      }
    } catch (error) {
      toast.error('Error restoring backup')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDownloadBackup = async (backupId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/database/backup?id=${backupId}&action=download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const cd = res.headers.get('Content-Disposition')
        const fname = cd ? cd.split('filename=')[1]?.replace(/\"/g, '') : `${backupId}.sql`
        a.download = fname || `${backupId}.sql`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(url)
      } else {
        toast.error('Failed to download backup')
      }
    } catch (error) {
      toast.error('Error downloading backup')
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm('Delete this backup permanently?')) return
    try {
      const res = await fetch(`/api/v1/admin/database/backup?id=${backupId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setBackups(prev => prev.filter(b => b.id !== backupId))
        toast.success('Backup deleted')
      } else {
        toast.error('Failed to delete backup')
      }
    } catch (error) {
      toast.error('Error deleting backup')
    }
  }

  const handleUploadBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/admin/database/backup', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setBackups(prev => [json.data, ...prev])
        toast.success('Backup uploaded successfully')
      } else {
        toast.error(json.error || 'Failed to upload backup')
      }
    } catch (error) {
      toast.error('Error uploading backup')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return
    setIsExecutingQuery(true)
    setQueryResults(null)
    try {
      const res = await fetch('/api/v1/admin/database/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: sqlQuery }),
      })
      const json = await res.json()
      if (json.success) {
        setQueryResults(json.data.results)
        setQueryRowCount(json.data.rowCount)
      } else {
        toast.error(json.error || 'Query failed')
      }
    } catch (error) {
      toast.error('Error executing query')
    } finally {
      setIsExecutingQuery(false)
    }
  }

  const handleOptimizeDatabase = async () => {
    setIsOptimizing(true)
    try {
      const res = await fetch('/api/v1/admin/database/optimize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        toast.success(json.data.message)
        await fetchStats()
      } else {
        toast.error('Optimization failed')
      }
    } catch (error) {
      toast.error('Error optimizing database')
    } finally {
      setIsOptimizing(false)
    }
  }

  if (!hasPermission('MANAGE_USERS')) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You don&apos;t have permission to access database management.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <RoleBasedRoute requiredRole="ADMIN" fallbackPath="/dashboard">
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Database Management</h1>
            <p className="text-gray-600 hidden sm:block">Database administration and maintenance tools</p>
          </div>
          <Button variant="outline" onClick={() => { fetchStats(); fetchTables(); fetchBackups(); }}>
            <RefreshCw className="sm:mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            label="Database Size"
            value={stats?.totalSize ?? '...'}
            severity="neutral"
            icon={HardDrive}
          />
          <StatCard
            label="Total Records"
            value={(stats?.recordsCount ?? 0).toLocaleString()}
            severity="info"
            icon={FileText}
          />
          <StatCard
            label="Active Connections"
            value={stats?.activeConnections ?? 0}
            severity="success"
            icon={Server}
          />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Optimization</p>
                  <Badge variant={stats?.optimizationStatus === 'good' ? 'default' : 'secondary'}>
                    {stats?.optimizationStatus ?? '...'}
                  </Badge>
                </div>
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </StatCardGrid>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
            <TabsTrigger value="tables">Tables</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5" />
                    Database Health
                  </CardTitle>
                  <CardDescription>System status and performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Database Status</span>
                      <Badge variant="default" className="text-green-700 bg-green-50">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Healthy
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tables</span>
                      <span>{stats?.tablesCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Indexes</span>
                      <span>{stats?.indexesCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage Usage</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={Math.min(100, ((stats?.totalSizeBytes ?? 0) / (5 * 1024 * 1024 * 1024)) * 100)} className="w-16 h-2" />
                        <span>{stats?.totalSize ?? '...'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Common database operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleOptimizeDatabase} disabled={isOptimizing} className="h-16 flex-col">
                      <RefreshCw className={`h-4 w-4 mb-1 ${isOptimizing ? 'animate-spin' : ''}`} />
                      <span className="text-xs">Optimize</span>
                    </Button>
                    <Button variant="outline" onClick={handleCreateBackup} disabled={isCreatingBackup} className="h-16 flex-col">
                      <Database className="h-4 w-4 mb-1" />
                      <span className="text-xs">Backup</span>
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('tables')} className="h-16 flex-col">
                      <BarChart3 className="h-4 w-4 mb-1" />
                      <span className="text-xs">Tables</span>
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('query')} className="h-16 flex-col">
                      <FileText className="h-4 w-4 mb-1" />
                      <span className="text-xs">Query</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Backup & Restore</h3>
                <p className="text-gray-600">Database backup and recovery operations</p>
              </div>
              <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept=".sql" className="hidden" onChange={handleUploadBackup} />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Upload Backup'}
              </Button>
              <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
                <Database className="mr-2 h-4 w-4" />
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </Button>
            </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>Recent database backups</CardDescription>
              </CardHeader>
              <CardContent>
                {backups.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No backups recorded yet. Click &quot;Create Backup&quot; to start.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell>{new Date(backup.timestamp).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{backup.type}</Badge>
                          </TableCell>
                          <TableCell>{backup.size}</TableCell>
                          <TableCell>
                            <Badge variant={backup.status === 'success' ? 'default' : backup.status === 'failed' ? 'destructive' : 'secondary'}>
                              {backup.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{backup.location}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadBackup(backup.id)}
                                disabled={backup.status !== 'success'}
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreBackup(backup.id)}
                                disabled={isRestoring || backup.status !== 'success'}
                                title="Restore"
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBackup(backup.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Database Tables</CardTitle>
                <CardDescription>Overview of all database tables</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table Name</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Indexes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-medium">{table.name}</TableCell>
                        <TableCell>{table.records.toLocaleString()}</TableCell>
                        <TableCell>{table.size}</TableCell>
                        <TableCell>{table.lastModified ? new Date(table.lastModified).toLocaleString() : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={table.hasIndexes ? 'default' : 'secondary'}>
                            {table.hasIndexes ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="query" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SQL Query Executor</CardTitle>
                <CardDescription>Execute custom SELECT queries (admin only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">SQL Query</label>
                  <Textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM users LIMIT 10"
                    rows={4}
                    className="font-mono"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={executeQuery}
                    disabled={isExecutingQuery || !sqlQuery.trim()}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isExecutingQuery ? 'animate-spin' : ''}`} />
                    {isExecutingQuery ? 'Executing...' : 'Execute Query'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setSqlQuery(''); setQueryResults(null); setQueryRowCount(0); }}
                  >
                    Clear
                  </Button>
                </div>

                {queryResults && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Query Results</h4>
                    {queryResults.length > 0 ? (
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(queryResults[0]).map((key) => (
                                <TableHead key={key}>{key}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {queryResults.map((row, index) => (
                              <TableRow key={index}>
                                {Object.values(row).map((value, i) => (
                                  <TableCell key={i}>{String(value ?? 'NULL')}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No results returned</p>
                    )}
                    <div className="mt-2 text-sm text-gray-600">
                      {queryRowCount} row{queryRowCount !== 1 ? 's' : ''} returned
                    </div>
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Only SELECT queries are allowed. Write operations are blocked for safety.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="mr-2 h-5 w-5" />
                    Database Maintenance
                  </CardTitle>
                  <CardDescription>Performance optimization and cleanup</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">VACUUM ANALYZE</h4>
                        <p className="text-sm text-gray-600">Reclaim storage and update planner statistics</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleOptimizeDatabase} disabled={isOptimizing}>
                        <RefreshCw className={`h-3 w-3 mr-1 ${isOptimizing ? 'animate-spin' : ''}`} />
                        Run
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Statistics</h4>
                        <p className="text-sm text-gray-600">{stats?.tablesCount ?? 0} tables, {stats?.indexesCount ?? 0} indexes</p>
                      </div>
                      <Badge variant="default">{stats?.optimizationStatus ?? '...'}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Database Info
                  </CardTitle>
                  <CardDescription>Current database configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Size</span>
                      <span className="font-medium">{stats?.totalSize ?? '...'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Records</span>
                      <span className="font-medium">{(stats?.recordsCount ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Active Connections</span>
                      <span className="font-medium">{stats?.activeConnections ?? 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Backup</span>
                      <span className="font-medium">{backups.length > 0 ? new Date(backups[0].timestamp).toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  )
}
