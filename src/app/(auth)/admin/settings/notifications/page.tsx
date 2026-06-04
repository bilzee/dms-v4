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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Mail,
  Clock,
  Moon,
  AlertTriangle,
  Info,
  Shield,
  Zap,
  Activity,
  ChevronDown,
  Users,
} from '@/lib/icons';
import { useRouter } from 'next/navigation';
import type { SignalPriority } from '@/lib/services/notification-config.service';
import type { SignalReason, SignalTargetRole } from '@/types/action-signal';
import { SIGNAL_REASON_ROLES, NOTIFICATION_TEMPLATES } from '@/types/action-signal';

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
  emailEnabled: boolean;
  emailPriorities: SignalPriority[];
  emailDigestEnabled: boolean;
  emailDigestTime: string;
}

type RoleSignalConfig = Record<SignalReason, boolean>;
type ActionSignalConfig = Record<SignalTargetRole, RoleSignalConfig>;

const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
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
  emailEnabled: false,
  emailPriorities: ['CRITICAL', 'HIGH'],
  emailDigestEnabled: false,
  emailDigestTime: '08:00',
};

const ALL_PRIORITIES: { value: SignalPriority; label: string; color: string }[] = [
  { value: 'CRITICAL', label: 'Critical', color: 'bg-red-500 text-white' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-500 text-white' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-500 text-black' },
  { value: 'LOW', label: 'Low', color: 'bg-blue-500 text-white' },
];

function buildDefaultSignalConfig(): ActionSignalConfig {
  const roles: SignalTargetRole[] = ['ASSESSOR', 'RESPONDER', 'DONOR', 'COORDINATOR'];
  const config: Partial<ActionSignalConfig> = {};
  for (const role of roles) {
    const reasons = Object.entries(SIGNAL_REASON_ROLES)
      .filter(([, r]) => r.includes(role))
      .map(([reason]) => reason as SignalReason);
    const roleConfig: Partial<RoleSignalConfig> = {};
    for (const reason of reasons) {
      roleConfig[reason] = true;
    }
    config[role] = roleConfig as RoleSignalConfig;
  }
  return config as ActionSignalConfig;
}

const DEFAULT_ACTION_SIGNAL_CONFIG = buildDefaultSignalConfig();

const ROLE_META: Record<SignalTargetRole, { label: string; color: string; icon: string }> = {
  ASSESSOR: { label: 'Assessor', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400', icon: '📋' },
  RESPONDER: { label: 'Responder', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400', icon: '🚑' },
  DONOR: { label: 'Donor', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', icon: '💰' },
  COORDINATOR: { label: 'Coordinator', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400', icon: '🎯' },
};

const SIGNAL_REASON_LABELS: Record<SignalReason, string> = {
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
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>({
    ...DEFAULT_NOTIFICATION_CONFIG,
    pushPriorities: [...DEFAULT_NOTIFICATION_CONFIG.pushPriorities],
    inAppPriorities: [...DEFAULT_NOTIFICATION_CONFIG.inAppPriorities],
    emailPriorities: [...DEFAULT_NOTIFICATION_CONFIG.emailPriorities],
  });
  const [originalNotifConfig, setOriginalNotifConfig] = useState<NotificationConfig>({ ...notifConfig });

  const [signalConfig, setSignalConfig] = useState<ActionSignalConfig>(
    JSON.parse(JSON.stringify(DEFAULT_ACTION_SIGNAL_CONFIG))
  );
  const [originalSignalConfig, setOriginalSignalConfig] = useState<ActionSignalConfig>(
    JSON.parse(JSON.stringify(DEFAULT_ACTION_SIGNAL_CONFIG))
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set(['ASSESSOR']));

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<any>('/api/v1/notification-config');
      if (!result.success) throw new Error((result as any).error || 'Failed to load');
      const data = (result as any).data;

      if (data.notification) {
        const n = data.notification;
        const withArrays = {
          ...n,
          pushPriorities: [...(n.pushPriorities || DEFAULT_NOTIFICATION_CONFIG.pushPriorities)],
          inAppPriorities: [...(n.inAppPriorities || DEFAULT_NOTIFICATION_CONFIG.inAppPriorities)],
          emailPriorities: [...(n.emailPriorities || DEFAULT_NOTIFICATION_CONFIG.emailPriorities)],
          emailEnabled: n.emailEnabled ?? false,
          emailDigestEnabled: n.emailDigestEnabled ?? false,
          emailDigestTime: n.emailDigestTime || '08:00',
        };
        setNotifConfig(withArrays);
        setOriginalNotifConfig(withArrays);
      }

      if (data.actionSignals) {
        setSignalConfig(data.actionSignals);
        setOriginalSignalConfig(JSON.parse(JSON.stringify(data.actionSignals)));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useMemo(() => { fetchConfig(); }, [fetchConfig]);

  const hasNotifChanges = useMemo(() => {
    return JSON.stringify(notifConfig) !== JSON.stringify(originalNotifConfig);
  }, [notifConfig, originalNotifConfig]);

  const hasSignalChanges = useMemo(() => {
    return JSON.stringify(signalConfig) !== JSON.stringify(originalSignalConfig);
  }, [signalConfig, originalSignalConfig]);

  const hasChanges = hasNotifChanges || hasSignalChanges;

  const updateNotifConfig = <K extends keyof NotificationConfig>(key: K, value: NotificationConfig[K]) => {
    setNotifConfig(prev => ({ ...prev, [key]: value }));
  };

  const toggleSignal = (role: SignalTargetRole, reason: SignalReason) => {
    setSignalConfig(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [reason]: !prev[role]?.[reason],
      },
    }));
  };

  const toggleAllForRole = (role: SignalTargetRole, enabled: boolean) => {
    setSignalConfig(prev => {
      const roleReasons = Object.entries(SIGNAL_REASON_ROLES)
        .filter(([, r]) => r.includes(role))
        .map(([reason]) => reason as SignalReason);
      const updated = { ...prev[role] };
      for (const reason of roleReasons) {
        updated[reason] = enabled;
      }
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = {};
      if (hasNotifChanges) payload.notification = notifConfig;
      if (hasSignalChanges) payload.actionSignals = signalConfig;

      const result = await apiPut('/api/v1/notification-config', payload);
      if (!result.success) throw new Error((result as any).error || 'Failed to save');
      const data = (result as any).data;

      if (data.notification) {
        const n = data.notification;
        const withArrays = {
          ...n,
          pushPriorities: [...(n.pushPriorities || [])],
          inAppPriorities: [...(n.inAppPriorities || [])],
          emailPriorities: [...(n.emailPriorities || DEFAULT_NOTIFICATION_CONFIG.emailPriorities)],
          emailEnabled: n.emailEnabled ?? false,
          emailDigestEnabled: n.emailDigestEnabled ?? false,
          emailDigestTime: n.emailDigestTime || '08:00',
        };
        setNotifConfig(withArrays);
        setOriginalNotifConfig(withArrays);
      }
      if (data.actionSignals) {
        setSignalConfig(data.actionSignals);
        setOriginalSignalConfig(JSON.parse(JSON.stringify(data.actionSignals)));
      }

      toast.success('Settings saved successfully');
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
      const data = (result as any).data;

      if (data.notification) {
        const n = data.notification;
        const withArrays = {
          ...n,
          pushPriorities: [...(n.pushPriorities || [])],
          inAppPriorities: [...(n.inAppPriorities || [])],
          emailPriorities: [...(n.emailPriorities || DEFAULT_NOTIFICATION_CONFIG.emailPriorities)],
          emailEnabled: n.emailEnabled ?? false,
          emailDigestEnabled: n.emailDigestEnabled ?? false,
          emailDigestTime: n.emailDigestTime || '08:00',
        };
        setNotifConfig(withArrays);
        setOriginalNotifConfig(withArrays);
      }
      if (data.actionSignals) {
        setSignalConfig(data.actionSignals);
        setOriginalSignalConfig(JSON.parse(JSON.stringify(data.actionSignals)));
      }

      toast.success('Settings reset to defaults');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setNotifConfig({
      ...originalNotifConfig,
      pushPriorities: [...originalNotifConfig.pushPriorities],
      inAppPriorities: [...originalNotifConfig.inAppPriorities],
      emailPriorities: [...originalNotifConfig.emailPriorities],
    });
    setSignalConfig(JSON.parse(JSON.stringify(originalSignalConfig)));
    toast.info('Changes discarded');
  };

  const toggleRoleExpanded = (role: string) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
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
                Configure notifications, channels, and action signal visibility
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
                <p className="font-medium">How these settings work</p>
                <p>Channels and Priority Rules control notification delivery. Timing controls expiration and quiet hours. Action Signals let you enable or disable individual action queue items per dashboard role.</p>
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
            <TabsTrigger value="action-signals">
              <Activity className="h-4 w-4 mr-1.5" />
              Action Signals
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
                    checked={notifConfig.pushEnabled}
                    onCheckedChange={(v) => updateNotifConfig('pushEnabled', v)}
                  />
                </div>
              </CardHeader>
              {notifConfig.pushEnabled && (
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
                        value={notifConfig.pushCooldownMinutes}
                        onChange={(e) => updateNotifConfig('pushCooldownMinutes', Math.max(0, parseInt(e.target.value) || 0))}
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
                    checked={notifConfig.inAppEnabled}
                    onCheckedChange={(v) => updateNotifConfig('inAppEnabled', v)}
                  />
                </div>
              </CardHeader>
              {notifConfig.inAppEnabled && (
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
                        value={notifConfig.inAppCooldownMinutes}
                        onChange={(e) => updateNotifConfig('inAppCooldownMinutes', Math.max(0, parseInt(e.target.value) || 0))}
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

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Email Notifications</CardTitle>
                      <CardDescription>Send email alerts for action signals via Resend or SendGrid</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={notifConfig.emailEnabled}
                    onCheckedChange={(v) => updateNotifConfig('emailEnabled', v)}
                  />
                </div>
              </CardHeader>
              {notifConfig.emailEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-purple-500" />
                        Email priority levels
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {notifConfig.emailPriorities.length} of 4
                      </Badge>
                    </div>
                    <PrioritySelector
                      selected={notifConfig.emailPriorities}
                      onChange={(v) => updateNotifConfig('emailPriorities', v)}
                      disabled={!notifConfig.emailEnabled}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Daily Digest</Label>
                        <p className="text-xs text-muted-foreground">Batch non-critical signals into a single daily email</p>
                      </div>
                      <Switch
                        checked={notifConfig.emailDigestEnabled}
                        onCheckedChange={(v) => updateNotifConfig('emailDigestEnabled', v)}
                      />
                    </div>
                    {notifConfig.emailDigestEnabled && (
                      <div className="space-y-2">
                        <Label htmlFor="digestTime" className="text-sm font-medium">Digest delivery time</Label>
                        <Input
                          id="digestTime"
                          type="time"
                          value={notifConfig.emailDigestTime}
                          onChange={(e) => updateNotifConfig('emailDigestTime', e.target.value)}
                          className="w-32"
                        />
                        <p className="text-xs text-muted-foreground">
                          Non-CRITICAL signals will be batched and sent once daily. CRITICAL signals always send immediately.
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Requires EMAIL_ENABLED=true and a configured email provider (Resend or SendGrid).
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
                      {notifConfig.pushPriorities.length} of 4
                    </Badge>
                  </div>
                  <PrioritySelector
                    selected={notifConfig.pushPriorities}
                    onChange={(v) => updateNotifConfig('pushPriorities', v)}
                    disabled={!notifConfig.pushEnabled}
                  />
                  {!notifConfig.pushEnabled && (
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
                      {notifConfig.inAppPriorities.length} of 4
                    </Badge>
                  </div>
                  <PrioritySelector
                    selected={notifConfig.inAppPriorities}
                    onChange={(v) => updateNotifConfig('inAppPriorities', v)}
                    disabled={!notifConfig.inAppEnabled}
                  />
                  {!notifConfig.inAppEnabled && (
                    <p className="text-xs text-muted-foreground italic">Enable in-app notifications first to configure priorities</p>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-500" />
                      Email notification priorities
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {notifConfig.emailPriorities.length} of 4
                    </Badge>
                  </div>
                  <PrioritySelector
                    selected={notifConfig.emailPriorities}
                    onChange={(v) => updateNotifConfig('emailPriorities', v)}
                    disabled={!notifConfig.emailEnabled}
                  />
                  {!notifConfig.emailEnabled && (
                    <p className="text-xs text-muted-foreground italic">Enable email notifications first to configure priorities</p>
                  )}
                </div>

                <Separator />

                <div className="p-4 rounded-lg border bg-muted/30">
                  <h4 className="text-sm font-medium mb-3">Current routing summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Push:</span>{' '}
                        {notifConfig.pushEnabled
                          ? notifConfig.pushPriorities.map(p => ALL_PRIORITIES.find(ap => ap.value === p)?.label).join(', ') || 'None'
                          : 'Disabled'}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Monitor className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">In-App:</span>{' '}
                        {notifConfig.inAppEnabled
                          ? notifConfig.inAppPriorities.map(p => ALL_PRIORITIES.find(ap => ap.value === p)?.label).join(', ') || 'None'
                          : 'Disabled'}
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">Email:</span>{' '}
                        {notifConfig.emailEnabled
                          ? notifConfig.emailPriorities.map(p => ALL_PRIORITIES.find(ap => ap.value === p)?.label).join(', ') || 'None'
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
                      value={notifConfig.notificationTTLHours}
                      onChange={(e) => updateNotifConfig('notificationTTLHours', Math.max(1, parseInt(e.target.value) || 24))}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">
                      {notifConfig.notificationTTLHours}h ({notifConfig.notificationTTLHours >= 24 ? `${Math.floor(notifConfig.notificationTTLHours / 24)}d ${notifConfig.notificationTTLHours % 24}h` : `${notifConfig.notificationTTLHours} hours`})
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
                    checked={notifConfig.quietHoursEnabled}
                    onCheckedChange={(v) => updateNotifConfig('quietHoursEnabled', v)}
                  />
                </div>
              </CardHeader>
              {notifConfig.quietHoursEnabled && (
                <CardContent className="pt-0 space-y-4">
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quietStart" className="text-sm font-medium">Start time</Label>
                      <Input
                        id="quietStart"
                        type="time"
                        value={notifConfig.quietHoursStart}
                        onChange={(e) => updateNotifConfig('quietHoursStart', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quietEnd" className="text-sm font-medium">End time</Label>
                      <Input
                        id="quietEnd"
                        type="time"
                        value={notifConfig.quietHoursEnd}
                        onChange={(e) => updateNotifConfig('quietHoursEnd', e.target.value)}
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

          {/* Action Signals Tab */}
          <TabsContent value="action-signals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Action Signal Visibility
                </CardTitle>
                <CardDescription>
                  Enable or disable individual action signals for each dashboard role. Disabled signals will not appear on the corresponding Action Queue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mb-4">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Changes take effect immediately for new signals. Existing signals in the queue are not retroactively removed.
                  </span>
                </div>

                <div className="space-y-3">
                  {(['ASSESSOR', 'RESPONDER', 'DONOR', 'COORDINATOR'] as SignalTargetRole[]).map(role => {
                    const meta = ROLE_META[role];
                    const roleReasons = Object.entries(SIGNAL_REASON_ROLES)
                      .filter(([, r]) => r.includes(role))
                      .map(([reason]) => reason as SignalReason);
                    const roleConfig = signalConfig[role] || {};
                    const enabledCount = roleReasons.filter(r => roleConfig[r] !== false).length;
                    const allEnabled = enabledCount === roleReasons.length;
                    const allDisabled = enabledCount === 0;
                    const isExpanded = expandedRoles.has(role);

                    return (
                      <Collapsible
                        key={role}
                        open={isExpanded}
                        onOpenChange={() => toggleRoleExpanded(role)}
                      >
                        <Card className="border-l-4 border-l-primary/30">
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded-lg ${meta.color}`}>
                                    <Users className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-sm">{meta.label} Dashboard</CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                      {enabledCount} of {roleReasons.length} signals enabled
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Badge variant={allEnabled ? 'default' : allDisabled ? 'destructive' : 'secondary'} className="text-xs">
                                    {allEnabled ? 'All On' : allDisabled ? 'All Off' : `${enabledCount}/${roleReasons.length}`}
                                  </Badge>
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 pb-4">
                              <Separator className="mb-4" />
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Toggle All</span>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => toggleAllForRole(role, true)}
                                  >
                                    Enable All
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => toggleAllForRole(role, false)}
                                  >
                                    Disable All
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {roleReasons.map(reason => {
                                  const enabled = roleConfig[reason] !== false;
                                  const template = NOTIFICATION_TEMPLATES[reason];
                                  return (
                                    <div
                                      key={reason}
                                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                        enabled ? 'bg-background border-border' : 'bg-muted/30 border-transparent'
                                      }`}
                                    >
                                      <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2">
                                          <span className={`text-sm font-medium ${!enabled ? 'text-muted-foreground' : ''}`}>
                                            {SIGNAL_REASON_LABELS[reason]}
                                          </span>
                                        </div>
                                        {template && (
                                          <p className={`text-xs mt-0.5 truncate ${!enabled ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                                            {template.title}
                                          </p>
                                        )}
                                      </div>
                                      <Switch
                                        checked={enabled}
                                        onCheckedChange={() => toggleSignal(role, reason)}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleBasedRoute>
  );
}
