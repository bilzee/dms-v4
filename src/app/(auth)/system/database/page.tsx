'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/shared/StatCard'
import { StatCardGrid } from '@/components/shared/StatCardGrid'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
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
} from 'lucide-react'
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute'
import { cn } from '@/lib/utils'

interface DatabaseStats {
  totalSize: string
  tablesCount: number
  recordsCount: number
  lastBackup: string
  backupStatus: 'success' | 'failed' | 'in-progress'
  optimizationStatus: 'good' | 'warning' | 'critical'
  indexesCount: number
  activeConnections: number
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
  lastModified: string
  hasIndexes: boolean
}

export default function DatabaseManagementPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResults, setQueryResults] = useState<any[] | null>(null)
  const [isExecutingQuery, setIsExecutingQuery] = useState(false)
  const { hasPermission } = useAuth()

  // Mock data - replace with actual API calls
  const mockStats: DatabaseStats = {
    totalSize: '2.4 GB',
    tablesCount: 15,
    recordsCount: 125432,
    lastBackup: '2 hours ago',
    backupStatus: 'success',
    optimizationStatus: 'good',
    indexesCount: 28,
    activeConnections: 12
  }

  const mockBackups: BackupRecord[] = [
    {
      id: '1',
      timestamp: '2025-01-05 14:00:00',
      size: '245 MB',
      type: 'automatic',
      status: 'success',
      location: 'cloud'
    },
    {
      id: '2',
      timestamp: '2025-01-05 13:00:00',
      size: '248 MB',
      type: 'automatic',
      status: 'success',
      location: 'cloud'
    },
    {
      id: '3',
      timestamp: '2025-01-05 09:00:00',
      size: '242 MB',
      type: 'manual',
      status: 'success',
      location: 'local'
    },
    {
      id: '4',
      timestamp: '2025-01-04 09:00:00',
      size: '238 MB',
      type: 'automatic',
      status: 'failed',
      location: 'cloud'
    }
  ]

  const mockTables: TableInfo[] = [
    { name: 'users', records: 125, size: '2.1 MB', lastModified: '2025-01-05 10:30:00', hasIndexes: true },
    { name: 'assessments', records: 342, size: '5.8 MB', lastModified: '2025-01-05 11:15:00', hasIndexes: true },
    { name: 'incidents', records: 89, size: '1.2 MB', lastModified: '2025-01-05 12:45:00', hasIndexes: true },
    { name: 'entities', records: 456, size: '3.4 MB', lastModified: '2025-01-05 09:20:00', hasIndexes: true },
    { name: 'responses', records: 1234, size: '8.9 MB', lastModified: '2025-01-05 13:30:00', hasIndexes: true },
    { name: 'audit_logs', records: 125432, size: '245 MB', lastModified: '2025-01-05 14:00:00', hasIndexes: true }
  ]

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Replace with actual API call
      // const response = await fetch('/api/v1/admin/database/backup', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // })
    } catch (error) {
      console.error('Error creating backup:', error)
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleRestoreBackup = async (backupId: string) => {
    setIsRestoring(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 3000))
      // Replace with actual API call
      // const response = await fetch(`/api/v1/admin/database/restore/${backupId}`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // })
    } catch (error) {
      console.error('Error restoring backup:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return

    setIsExecutingQuery(true)
    try {
      // Simulate API call for SQL execution (admin-only)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock result for demonstration - replace with actual API call
      setQueryResults([
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
      ])
      
      // Replace with actual API call
      // const response = await fetch('/api/v1/admin/database/query', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ query: sqlQuery })
      // })
      
      // if (response.ok) {
      //   const data = await response.json()
      //   setQueryResults(data.results)
      // }
    } catch (error) {
      console.error('Error executing query:', error)
      setQueryResults(null)
    } finally {
      setIsExecutingQuery(false)
    }
  }

  const handleOptimizeDatabase = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      // Replace with actual API call
      // const response = await fetch('/api/v1/admin/database/optimize', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${token}`
      //   }
      // })
    } catch (error) {
      console.error('Error optimizing database:', error)
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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Database Management</h1>
            <p className="text-gray-600">Database administration and maintenance tools</p>
          </div>
        </div>

        <StatCardGrid columns={4}>
          <StatCard
            label="Database Size"
            value={mockStats.totalSize}
            severity="neutral"
            icon={HardDrive}
          />
          <StatCard
            label="Total Records"
            value={mockStats.recordsCount.toLocaleString()}
            severity="info"
            icon={FileText}
          />
          <StatCard
            label="Active Connections"
            value={mockStats.activeConnections}
            severity="success"
            icon={Server}
          />
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Optimization</p>
                  <Badge variant={mockStats.optimizationStatus === 'good' ? 'default' : 'secondary'}>
                    {mockStats.optimizationStatus}
                  </Badge>
                </div>
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </StatCardGrid>

        {/* Database Tabs */}
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
              {/* Database Health */}
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
                      <span>Last Optimization</span>
                      <span>3 days ago</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Query Performance</span>
                      <Badge variant="default">Good</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Storage Usage</span>
                      <div className="flex items-center space-x-2">
                        <Progress value={75} className="w-16 h-2" />
                        <span>75%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
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
                    <Button variant="outline" onClick={handleOptimizeDatabase} className="h-16 flex-col">
                      <RefreshCw className="h-4 w-4 mb-1" />
                      <span className="text-xs">Optimize</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex-col">
                      <BarChart3 className="h-4 w-4 mb-1" />
                      <span className="text-xs">Analyze</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex-col">
                      <Clock className="h-4 w-4 mb-1" />
                      <span className="text-xs">Schedule</span>
                    </Button>
                    <Button variant="outline" className="h-16 flex-col">
                      <Download className="h-4 w-4 mb-1" />
                      <span className="text-xs">Export</span>
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
              <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
                <Database className="mr-2 h-4 w-4" />
                {isCreatingBackup ? 'Creating...' : 'Create Backup'}
              </Button>
            </div>

            {/* Backup History */}
            <Card>
              <CardHeader>
                <CardTitle>Backup History</CardTitle>
                <CardDescription>Recent database backups</CardDescription>
              </CardHeader>
              <CardContent>
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
                    {mockBackups.map((backup) => (
                      <TableRow key={backup.id}>
                        <TableCell>{new Date(backup.timestamp).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {backup.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{backup.size}</TableCell>
                        <TableCell>
                          <Badge variant={backup.status === 'success' ? 'default' : backup.status === 'failed' ? 'destructive' : 'secondary'}>
                            {backup.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{backup.location}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreBackup(backup.id)}
                            disabled={isRestoring || backup.status !== 'success'}
                          >
                            <Upload className="h-3 w-3 mr-1" />
                            {isRestoring ? 'Restoring...' : 'Restore'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTables.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-medium">{table.name}</TableCell>
                        <TableCell>{table.records.toLocaleString()}</TableCell>
                        <TableCell>{table.size}</TableCell>
                        <TableCell>{new Date(table.lastModified).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={table.hasIndexes ? 'default' : 'secondary'}>
                            {table.hasIndexes ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Analyze
                          </Button>
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
                <CardDescription>Execute custom SQL queries (admin only)</CardDescription>
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
                    <RefreshCw className={cn('mr-2 h-4 w-4', isExecutingQuery && 'animate-spin')} />
                    {isExecutingQuery ? 'Executing...' : 'Execute Query'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSqlQuery('')
                      setQueryResults(null)
                    }}
                  >
                    Clear
                  </Button>
                </div>

                {/* Query Results */}
                {queryResults && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Query Results</h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(queryResults[0] || {}).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {queryResults.map((row, index) => (
                            <TableRow key={index}>
                              {Object.values(row).map((value, i) => (
                                <TableCell key={i}>{String(value)}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {queryResults.length} row{queryResults.length !== 1 ? 's' : ''} returned
                    </div>
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    SQL Query Executor is for advanced users only. Be careful when executing queries as they can modify or delete data.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Database Maintenance */}
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
                        <h4 className="font-medium">Index Optimization</h4>
                        <p className="text-sm text-gray-600">Rebuild and optimize database indexes</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleOptimizeDatabase}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Optimize
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Query Cache</h4>
                        <p className="text-sm text-gray-600">Clear query cache to improve performance</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Statistics Update</h4>
                        <p className="text-sm text-gray-600">Update table statistics</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Update
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Automated Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="mr-2 h-5 w-5" />
                    Automated Tasks
                  </CardTitle>
                  <CardDescription>Scheduled maintenance tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Log Cleanup</h4>
                        <p className="text-sm text-gray-600">Auto-remove old logs</p>
                      </div>
                      <span className="text-sm text-green-600">Daily</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Backup</h4>
                        <p className="text-sm text-gray-600">Automated backups</p>
                      </div>
                      <span className="text-sm text-blue-600">Hourly</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">Optimization</h4>
                        <p className="text-sm text-gray-600">Weekly optimization</p>
                      </div>
                      <span className="text-sm text-purple-600">Weekly</span>
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