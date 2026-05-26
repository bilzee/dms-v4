'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentSkeleton } from '@/components/shared/ContentSkeleton';
import { toast } from 'sonner';
import { apiGet, apiPut } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Settings,
  ArrowLeft,
  Info,
  Save,
  RotateCcw,
  Trophy,
  TrendingUp,
  Clock,
  BarChart3,
  Activity,
  AlertTriangle,
  CheckCircle2,
} from '@/lib/icons';
import { useRouter } from 'next/navigation';

interface ScoringConfig {
  deliveryWeight: number;
  speedWeight: number;
  valueWeight: number;
  consistencyWeight: number;
  speedZeroScoreHours: number;
  speedPenaltyRate: number;
  valueCap: number;
  valueCurrency: string;
  consistencyMaxActivitiesPerDay: number;
}

const DEFAULT_CONFIG: ScoringConfig = {
  deliveryWeight: 60,
  speedWeight: 20,
  valueWeight: 10,
  consistencyWeight: 10,
  speedZeroScoreHours: 120,
  speedPenaltyRate: 20,
  valueCap: 1_000_000,
  valueCurrency: 'NGN',
  consistencyMaxActivitiesPerDay: 0.1,
};

function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };
  return symbols[currency] || currency;
}

function buildFormulaString(config: ScoringConfig): string {
  return `Score = (Delivery × ${config.deliveryWeight / 100}) + (Speed × ${config.speedWeight / 100}) + (Value × ${config.valueWeight / 100}) + (Consistency × ${config.consistencyWeight / 100})`;
}

function computePreviewScore(config: ScoringConfig, inputs: { delivery: number; value: number; activities: number; speed: number }): number {
  const wDelivery = config.deliveryWeight / 100;
  const wSpeed = config.speedWeight / 100;
  const wValue = config.valueWeight / 100;
  const wConsistency = config.consistencyWeight / 100;

  const deliveryScore = Math.min(100, inputs.delivery);
  const valueScore = Math.min(100, (inputs.value / config.valueCap) * 100);
  const consistencyMultiplier = 1 / config.consistencyMaxActivitiesPerDay;
  const consistencyScore = Math.min(100, inputs.activities * consistencyMultiplier);
  const speedScore = Math.max(0, 100 - (inputs.speed / config.speedZeroScoreHours) * 100);

  return (
    deliveryScore * wDelivery +
    valueScore * wValue +
    consistencyScore * wConsistency +
    speedScore * wSpeed
  );
}

export default function ScoringConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ScoringConfig>({ ...DEFAULT_CONFIG });
  const [originalConfig, setOriginalConfig] = useState<ScoringConfig>({ ...DEFAULT_CONFIG });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewInputs, setPreviewInputs] = useState({
    delivery: 75,
    value: 500000,
    activities: 0.05,
    speed: 36,
  });

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet('/api/v1/scoring-config');
      if (!result.success) {
        throw new Error(result.error || 'Failed to load scoring config');
      }
      const data = result.data as ScoringConfig;
      setConfig(data);
      setOriginalConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const hasChanges = useMemo(() => {
    return Object.keys(config).some(
      (key) => config[key as keyof ScoringConfig] !== originalConfig[key as keyof ScoringConfig]
    );
  }, [config, originalConfig]);

  const weightSum = config.deliveryWeight + config.speedWeight + config.valueWeight + config.consistencyWeight;
  const weightsValid = weightSum === 100;

  const handleSave = async () => {
    if (!weightsValid) {
      toast.error(`Weights must sum to 100%. Current total: ${weightSum}%`);
      return;
    }
    setIsSaving(true);
    try {
      const result = await apiPut('/api/v1/scoring-config', config);
      if (!result.success) {
        throw new Error(result.error || 'Failed to save');
      }
      setOriginalConfig({ ...config });
      toast.success('Scoring configuration saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({ ...originalConfig });
    toast.info('Reverted to last saved configuration');
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_CONFIG });
    toast.info('Reset to factory defaults');
  };

  const updateField = <K extends keyof ScoringConfig>(key: K, value: ScoringConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const previewScore = useMemo(
    () => computePreviewScore(config, previewInputs).toFixed(1),
    [config, previewInputs]
  );

  const deliveryPreview = Math.min(100, previewInputs.delivery).toFixed(1);
  const valuePreview = Math.min(100, (previewInputs.value / config.valueCap) * 100).toFixed(1);
  const consistencyPreview = Math.min(100, previewInputs.activities * (1 / config.consistencyMaxActivitiesPerDay)).toFixed(1);
  const speedPreview = Math.max(0, 100 - (previewInputs.speed / config.speedZeroScoreHours) * 100).toFixed(1);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <ContentSkeleton variant="card" />
        <ContentSkeleton variant="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchConfig} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h1 className="text-2xl font-bold">Scoring Configuration</h1>
          </div>
          <p className="text-muted-foreground">
            Configure how donor ranking scores are calculated across the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleResetDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasChanges}>
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || !weightsValid || isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900 dark:text-blue-300">How Scoring Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
          <p>
            Each donor&apos;s overall score (0–100) is a weighted combination of four normalized factors.
            Changes here affect the leaderboard, situation dashboard, and donor metrics pages in real time.
          </p>
          <p className="text-xs">Changes are applied after saving. All four weights must sum to 100%.</p>
        </CardContent>
      </Card>

      {hasChanges && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <Activity className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-400">
            You have unsaved changes. Preview on the right shows how scores would change.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-0">
              <Tabs defaultValue="weights" className="w-full">
                <div className="border-b px-4 pt-2">
                  <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0">
                    <TabsTrigger value="weights" className="data-[state=active]:bg-accent">
                      <BarChart3 className="h-4 w-4 mr-1.5" />
                      Weights
                    </TabsTrigger>
                    <TabsTrigger value="speed" className="data-[state=active]:bg-accent">
                      <Clock className="h-4 w-4 mr-1.5" />
                      Speed
                    </TabsTrigger>
                    <TabsTrigger value="value" className="data-[state=active]:bg-accent">
                      <TrendingUp className="h-4 w-4 mr-1.5" />
                      Value
                    </TabsTrigger>
                    <TabsTrigger value="consistency" className="data-[state=active]:bg-accent">
                      <Activity className="h-4 w-4 mr-1.5" />
                      Consistency
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="weights" className="p-6 space-y-6 mt-0">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Ranking Weights</h3>
                    <p className="text-sm text-muted-foreground">Assign relative importance to each scoring factor. Must sum to 100%.</p>
                  </div>

                  <div className={cn(
                    "rounded-lg p-4 border-2 transition-colors",
                    weightsValid ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800" : "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Weight Total</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-2xl font-bold", weightsValid ? "text-green-600" : "text-red-600")}>
                          {weightSum}%
                        </span>
                        {weightsValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                    {!weightsValid && (
                      <p className="text-sm text-red-600 mt-1">Must equal exactly 100%</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryWeight" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-500" />
                        Delivery Weight (%)
                      </Label>
                      <Input
                        id="deliveryWeight"
                        type="number"
                        min={0}
                        max={100}
                        value={config.deliveryWeight}
                        onChange={(e) => updateField('deliveryWeight', Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Verified delivery rate importance</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="speedWeight" className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        Speed Weight (%)
                      </Label>
                      <Input
                        id="speedWeight"
                        type="number"
                        min={0}
                        max={100}
                        value={config.speedWeight}
                        onChange={(e) => updateField('speedWeight', Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Response speed importance</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valueWeight" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Value Weight (%)
                      </Label>
                      <Input
                        id="valueWeight"
                        type="number"
                        min={0}
                        max={100}
                        value={config.valueWeight}
                        onChange={(e) => updateField('valueWeight', Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Commitment value importance</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consistencyWeight" className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        Consistency Weight (%)
                      </Label>
                      <Input
                        id="consistencyWeight"
                        type="number"
                        min={0}
                        max={100}
                        value={config.consistencyWeight}
                        onChange={(e) => updateField('consistencyWeight', Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Activity regularity importance</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="speed" className="p-6 space-y-6 mt-0">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Response Speed</h3>
                    <p className="text-sm text-muted-foreground">Configure how response time is scored.</p>
                  </div>

                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-mono">
                      Speed Score = max(0, 100 − (avgHours ÷ {config.speedZeroScoreHours}) × 100)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="speedZeroScoreHours">Zero-Score Threshold (hours)</Label>
                      <Input
                        id="speedZeroScoreHours"
                        type="number"
                        min={1}
                        max={720}
                        value={config.speedZeroScoreHours}
                        onChange={(e) => updateField('speedZeroScoreHours', Number(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Hours beyond which speed score = 0. Currently: responding in {Math.round(config.speedZeroScoreHours / 2)}h scores ~50, under {Math.round(config.speedZeroScoreHours * 0.1)}h scores ~90.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 rounded-lg border bg-card">
                      <div className="text-xs text-muted-foreground">6h response</div>
                      <div className="font-semibold text-green-600">
                        {Math.max(0, 100 - (6 / config.speedZeroScoreHours) * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg border bg-card">
                      <div className="text-xs text-muted-foreground">24h response</div>
                      <div className="font-semibold text-blue-600">
                        {Math.max(0, 100 - (24 / config.speedZeroScoreHours) * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg border bg-card">
                      <div className="text-xs text-muted-foreground">72h response</div>
                      <div className="font-semibold text-orange-600">
                        {Math.max(0, 100 - (72 / config.speedZeroScoreHours) * 100).toFixed(0)}
                      </div>
                    </div>
                    <div className="text-center p-3 rounded-lg border bg-card">
                      <div className="text-xs text-muted-foreground">{config.speedZeroScoreHours}h+ response</div>
                      <div className="font-semibold text-red-600">0</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="value" className="p-6 space-y-6 mt-0">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Commitment Value</h3>
                    <p className="text-sm text-muted-foreground">Configure how monetary commitment value is scored.</p>
                  </div>

                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-mono">
                      Value Score = min(100, (totalValue ÷ {getCurrencySymbol(config.valueCurrency)}{config.valueCap.toLocaleString()}) × 100)
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="valueCap">Value Cap</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {getCurrencySymbol(config.valueCurrency)}
                        </span>
                        <Input
                          id="valueCap"
                          type="number"
                          min={1}
                          max={100000000}
                          className="pl-8"
                          value={config.valueCap}
                          onChange={(e) => updateField('valueCap', Number(e.target.value))}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Commitment value at which score = 100%. Donors contributing this amount or more receive full marks.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valueCurrency">Currency</Label>
                      <Select
                        value={config.valueCurrency}
                        onValueChange={(v) => updateField('valueCurrency', v)}
                      >
                        <SelectTrigger id="valueCurrency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NGN">NGN (₦) — Nigerian Naira</SelectItem>
                          <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                          <SelectItem value="GBP">GBP (£) — British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Currency used for display and formatting</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="consistency" className="p-6 space-y-6 mt-0">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Consistency</h3>
                    <p className="text-sm text-muted-foreground">Configure how activity regularity is scored.</p>
                  </div>

                  <div className="rounded-lg border bg-muted/50 p-4">
                    <p className="text-sm font-mono">
                      Consistency Score = min(100, activityFreq ÷ {config.consistencyMaxActivitiesPerDay} × 100)
                    </p>
                  </div>

                  <div className="space-y-2 max-w-xs">
                    <Label htmlFor="consistencyMax">Max Activities/Day for Full Score</Label>
                    <Input
                      id="consistencyMax"
                      type="number"
                      min={0.001}
                      max={100}
                      step={0.01}
                      value={config.consistencyMaxActivitiesPerDay}
                      onChange={(e) => updateField('consistencyMaxActivitiesPerDay', Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Activities per day at which score = 100%. Lower values make it easier to score full marks.
                      Currently: {config.consistencyMaxActivitiesPerDay} activities/day = 100% (i.e., 1 activity every {Math.round(1 / config.consistencyMaxActivitiesPerDay)} days).
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Live Preview
                </CardTitle>
                <CardDescription>Adjust sample donor values to see how the current config affects scoring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1">Overall Score</div>
                  <div className="text-4xl font-bold text-primary">{previewScore}</div>
                  <div className="text-xs text-muted-foreground mt-1">out of 100</div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Delivery Rate (%)
                      </Label>
                      <span className="text-xs font-medium">{deliveryPreview} pts × {config.deliveryWeight}%</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={previewInputs.delivery}
                      onChange={(e) => setPreviewInputs((p) => ({ ...p, delivery: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Avg Response (hours)
                      </Label>
                      <span className="text-xs font-medium">{speedPreview} pts × {config.speedWeight}%</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={720}
                      value={previewInputs.speed}
                      onChange={(e) => setPreviewInputs((p) => ({ ...p, speed: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Value ({getCurrencySymbol(config.valueCurrency)})
                      </Label>
                      <span className="text-xs font-medium">{valuePreview} pts × {config.valueWeight}%</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={previewInputs.value}
                      onChange={(e) => setPreviewInputs((p) => ({ ...p, value: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        Activities/day
                      </Label>
                      <span className="text-xs font-medium">{consistencyPreview} pts × {config.consistencyWeight}%</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={previewInputs.activities}
                      onChange={(e) => setPreviewInputs((p) => ({ ...p, activities: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Active Formula</h4>
                  <div className="rounded border bg-muted/50 p-2">
                    <p className="text-xs font-mono break-all">{buildFormulaString(config)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border bg-card p-2 text-center">
                    <div className="text-xs text-muted-foreground">Speed 0 at</div>
                    <div className="text-sm font-semibold">{config.speedZeroScoreHours}h</div>
                  </div>
                  <div className="rounded border bg-card p-2 text-center">
                    <div className="text-xs text-muted-foreground">Value cap</div>
                    <div className="text-sm font-semibold">{getCurrencySymbol(config.valueCurrency)}{(config.valueCap / 1000000).toFixed(1)}M</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {hasChanges && (
              <div className="flex gap-2 lg:hidden">
                <Button className="flex-1" onClick={handleSave} disabled={!weightsValid || isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Discard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
