'use client';

import { useState, useCallback, useMemo } from 'react';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiGet, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Save,
  RotateCcw,
  X,
  Bell,
  Smartphone,
  Monitor,
  Clock,
  Moon,
  AlertTriangle,
  Info,
  Shield,
  Zap,
} from '@/lib/icons';
import { useRouter } from 'next/navigation';
import type { SignalPriority } from '@/lib/services/notification-config.service';

interface NotificationConfig {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  pushPriorities: SignalPriority[];
  inAppPriorities: SignalPriority[];
  notificationTTLHours: number;
  pushCooldownMinutes: number;
  inAppCooldownMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_CONFIG: NotificationConfig = {
  pushEnabled: true,
  inAppEnabled: true,
  pushPriorities: ['CRITICAL', 'HIGH'],
  inAppPriorities: ['CRITICAL', 'HIGH', 'MEDIUM'],
  notificationTTLHours: 24,
  pushCooldownMinutes: 15,
  inAppCooldownMinutes: 5,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

const ALL_PRIORITIES: { value: SignalPriority; label: string; color: string }[] = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-500 text-white' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-500 text-white' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500 text-black' },
  { value: 'LOW', label: 'Low', color: 'bg-blue-500 text-white' },
];

function PrioritySelector({
  selected,
  onChange,
  disabled,
}: {
  selected: SignalPriority[];
  onChange: (priorities: SignalPriority[]) => void;
  disabled?: boolean;
}) {
  const toggle = (priority: SignalPriority) => {
    if (selected.includes(priority)) {
      onChange(selected.filter(p => p !== priority));
    } else {
      onChange([...selected, priority]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_PRIORITIES.map(p => {
        const isActive = selected.includes(p.value);
        return (
          <button
            key={p.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(p.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              isActive
                ? `${p.color} border-transparent shadow-sm`
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-current' : 'bg-muted-foreground/40'}`} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

export default function NotificationConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<NotificationConfig>({ ...DEFAULT_CONFIG, pushPriorities: [...DEFAULT_CONFIG.pushPriorities], inAppPriorities: [...DEFAULT_CONFIG.inAppPriorities] });
  const [originalConfig, setOriginalConfig] = useState<NotificationConfig>({ ...DEFAULT_CONFIG, pushPriorities: [...DEFAULT_CONFIG.pushPriorities], inAppPriorities: [...DEFAULT_CONFIG.inAppPriorities] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<NotificationConfig>('/api/v1/notification-config');
      if (!result.success) throw new Error((result as any).error || 'Failed to load');
      const data = (result as any).data as NotificationConfig;
      const withArrays = { ...data, pushPriorities: [...(data.pushPriorities || DEFAULT_CONFIG.pushPriorities)], inAppPriorities: [...(data.inAppPriorities || DEFAULT_CONFIG.inAppPriorities)] };
      setConfig(withArrays);
      setOriginalConfig(withArrays);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useMemo(() => { fetchConfig(); }, [fetchConfig]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(originalConfig);
  }, [config, originalConfig]);

  const updateConfig = <K extends keyof NotificationConfig>(key: K, value: NotificationConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await apiPut('/api/v1/notification-config', config);
      if (!result.success) throw new Error((result as any).error || 'Failed to save');
      const updated = (result as any).data as NotificationConfig;
      const withArrays = { ...updated, pushPriorities: [...(updated.pushPriorities || [])], inAppPriorities: [...(updated.inAppPriorities || [])] };
      setConfig(withArrays);
      setOriginalConfig(withArrays);
      toast.success('Notification settings saved successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      const result = await apiDelete('/api/v1/notification-config');
      if (!result.success) throw new Error((result as any).error || 'Failed to reset');
      const defaults = (result as any).data as NotificationConfig;
      const withArrays = { ...defaults, pushPriorities: [...(defaults.pushPriorities || [])], inAppPriorities: [...(defaults.inAppPriorities || [])] };
      setConfig(withArrays);
      setOriginalConfig(withArrays);
      toast.success('Notification settings reset to defaults');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setConfig({ ...originalConfig, pushPriorities: [...originalConfig.pushPriorities], inAppPriorities: [...originalConfig.inAppPriorities] });
    toast.info('Changes discarded');
  };

  if (isLoading) {
    return (
      <RoleBasedRoute requiredRole="ADMIN">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-96" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute requiredRole="ADMIN">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Configure how and when notifications are delivered across the system
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Defaults
            </Button>
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                Discard
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving || !hasChanges}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Unsaved changes alert */}
        {hasChanges && (
          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-400">
              You have unsaved changes. Click &quot;Save Changes&quot; to apply.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-medium">How notification settings work</p>
                <p>These settings control the system-wide notification behavior. Push notifications appear as desktop/mobile alerts. In-app notifications appear as toast popups and in the notification bell. Changes apply to all users.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="channels" className="space-y-4">
          <TabsList>
            <TabsTrigger value="channels">
              <Smartphone className="h-4 w-4 mr-1.5" />
              Channels
            </TabsTrigger>
            <TabsTrigger value="priorities">
              <Shield className="h-4 w-4 mr-1.5" />
              Priority Rules
            </TabsTrigger>
            <TabsTrigger value="timing">
              <Clock className="h-4 w-4 mr-1.5" />
              Timing
            </TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-4">
            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                      <Smartphone className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Push Notifications</CardTitle>
                      <CardDescription>Desktop and mobile browser push alerts via Web Push API</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={config.pushEnabled}
                    onCheckedChange={(v) => updateConfig('pushEnabled', v)}
                  />
                </div>
              </CardHeader>
              {config.pushEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pushCooldown" className="text-sm font-medium">
                        Cooldown period (minutes)
                      </Label>
                      <Input
                        id="pushCooldown"
                        type="number"
                        min={0}
                        max={1440}
                        value={config.pushCooldownMinutes}
                        onChange={(e) => updateConfig('pushCooldownMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum time between push notifications for the same user. Set to 0 for no cooldown.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Push notifications require users to grant browser permission. They work even when the app is in the background.
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* In-App Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Monitor className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">In-App Notifications</CardTitle>
                      <CardDescription>Real-time toast popups and notification bell badge</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={config.inAppEnabled}
                    onCheckedChange={(v) => updateConfig('inAppEnabled', v)}
                  />
                </div>
              </CardHeader>
              {config.inAppEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="inAppCooldown" className="text-sm font-medium">
                        Cooldown period (minutes)
                      </Label>
                      <Input
                        id="inAppCooldown"
                        type="number"
                        min={0}
                        max={1440}
                        value={config.inAppCooldownMinutes}
                        onChange={(e) => updateConfig('inAppCooldownMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum time between in-app toast notifications. Set to 0 for no cooldown.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      In-app notifications appear as toast popups (via SSE) and update the bell icon badge count in the header.
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Priority Rules Tab */}
          <TabsContent value="priorities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Priority-Based Routing
                </CardTitle>
                <CardDescription>
                  Control which signal priorities trigger each notification channel. Select the minimum priority levels that should generate notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-orange-500" />
                      Push notification priorities
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {config.pushPriorities.length} of 4
                    </Badge>
                  </div>
                  <PrioritySelector
                    selected={config.pushPriorities}
                    onChange={(v) => updateConfig('pushPriorities', v)}
                    disabled={!config.pushEnabled}
                  />
                  {!config.pushEnabled && (
                    <p className="text-xs text-muted-foreground italic">Enable push notifications first to configure priorities</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-blue-500" />
                      In-app notification priorities
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {config.inAppPriorities.length} of 4
                    </Badge>
                  </div>
                  <PrioritySelector
                    selected={config.inAppPriorities}
                    onChange={(v) => updateConfig('inAppPriorities', v)}
                    disabled={!config.inAppEnabled}
                  />
                  {!config.inAppEnabled && (
                    <p className="text-xs text-muted-foreground italic">Enable in-app notifications first to configure priorities</p>
                  )}
                </div>

                <Separator />

                {/* Current routing preview */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="text-sm font-medium mb-3">Current routing summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Push:</span>{' '}
                        {config.pushEnabled
                          ? config.pushPriorities.map(p => ALL_PRIORITIES.find(ap => ap.value === p)?.label).join(', ') || 'None'
                          : 'Disabled'}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Monitor className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">In-App:</span>{' '}
                        {config.inAppEnabled
                          ? config.inAppPriorities.map(p => ALL_PRIORITIES.find(ap => ap.value === p)?.label).join(', ') || 'None'
                          : 'Disabled'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Notification Lifetime
                </CardTitle>
                <CardDescription>
                  Control how long notifications remain active before expiring
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ttl" className="text-sm font-medium">
                    Notification TTL (hours)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="ttl"
                      type="number"
                      min={1}
                      max={168}
                      value={config.notificationTTLHours}
                      onChange={(e) => updateConfig('notificationTTLHours', Math.max(1, parseInt(e.target.value) || 24))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      {config.notificationTTLHours}h ({config.notificationTTLHours >= 24 ? `${Math.floor(config.notificationTTLHours / 24)}d ${config.notificationTTLHours % 24}h` : `${config.notificationTTLHours} hours`})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    After this period, unread notifications expire and are no longer shown. Range: 1–168 hours (7 days).
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Moon className="h-5 w-5 text-indigo-500" />
                      Quiet Hours
                    </CardTitle>
                    <CardDescription>
                      Suppress push notifications during specified hours
                    </CardDescription>
                  </div>
                  <Switch
                    checked={config.quietHoursEnabled}
                    onCheckedChange={(v) => updateConfig('quietHoursEnabled', v)}
                  />
                </div>
              </CardHeader>
              {config.quietHoursEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quietStart" className="text-sm font-medium">Start time</Label>
                      <Input
                        id="quietStart"
                        type="time"
                        value={config.quietHoursStart}
                        onChange={(e) => updateConfig('quietHoursStart', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quietEnd" className="text-sm font-medium">End time</Label>
                      <Input
                        id="quietEnd"
                        type="time"
                        value={config.quietHoursEnd}
                        onChange={(e) => updateConfig('quietHoursEnd', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Push notifications will be held during quiet hours and delivered when the period ends. In-app notifications are not affected.
                  </p>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  );
}
