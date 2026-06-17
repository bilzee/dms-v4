'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPut } from '@/lib/api';
import { useInvalidateCurrency, CURRENCY_DEFAULTS } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Settings } from '@/lib/icons';

const CURRENCY_OPTIONS = [
  { code: 'NGN', symbol: '₦', label: 'NGN (₦) — Nigerian Naira' },
  { code: 'USD', symbol: '$', label: 'USD ($) — US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) — Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) — British Pound' },
];

interface CurrencySettings {
  code: string;
  symbol: string;
  displaySymbol: string;
  iconStyle: 'text' | 'icon';
}

export default function CurrencySettingsPage() {
  const router = useRouter();
  const invalidateCurrency = useInvalidateCurrency();

  const [settings, setSettings] = useState<CurrencySettings>({ ...CURRENCY_DEFAULTS });
  const [original, setOriginal] = useState<CurrencySettings>({ ...CURRENCY_DEFAULTS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<any>('/api/v1/system/settings');
      if (!result.success) throw new Error((result as any).error || 'Failed to load');
      const data = (result as any).data;
      if (data?.currency) {
        const currency: CurrencySettings = {
          code: data.currency.code || CURRENCY_DEFAULTS.code,
          symbol: data.currency.symbol || CURRENCY_DEFAULTS.symbol,
          displaySymbol: data.currency.displaySymbol || data.currency.symbol || CURRENCY_DEFAULTS.displaySymbol,
          iconStyle: data.currency.iconStyle || CURRENCY_DEFAULTS.iconStyle,
        };
        setSettings(currency);
        setOriginal(currency);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(original);
  }, [settings, original]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await apiPut('/api/v1/system/settings', {
        section: 'currency',
        settings,
      });
      if (!result.success) throw new Error((result as any).error || 'Failed to save');
      setOriginal({ ...settings });
      invalidateCurrency();
      toast.success('Currency settings saved');
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to save currency settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCurrencyChange = (code: string) => {
    const option = CURRENCY_OPTIONS.find(o => o.code === code);
    if (option) {
      setSettings(prev => ({
        ...prev,
        code,
        symbol: option.symbol,
        displaySymbol: option.symbol,
      }));
    }
  };

  return (
    <RoleBasedRoute requiredRole="ADMIN">
      <div className="container mx-auto py-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Currency Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure the currency symbol and display style used across the application
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Currency Configuration</CardTitle>
            <CardDescription>
              Changes apply to all monetary displays, forms, and exports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currency-code">Currency</Label>
                  <Select
                    value={settings.code}
                    onValueChange={handleCurrencyChange}
                  >
                    <SelectTrigger id="currency-code">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(opt => (
                        <SelectItem key={opt.code} value={opt.code}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="display-symbol">Display Symbol</Label>
                  <Input
                    id="display-symbol"
                    value={settings.displaySymbol}
                    onChange={(e) => setSettings(prev => ({ ...prev, displaySymbol: e.target.value }))}
                    placeholder="₦"
                  />
                  <p className="text-xs text-muted-foreground">
                    The text symbol shown before monetary values (e.g. ₦, $, €, £)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Icon Style</Label>
                  <Select
                    value={settings.iconStyle}
                    onValueChange={(val) => setSettings(prev => ({ ...prev, iconStyle: val as 'text' | 'icon' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text symbol ({settings.displaySymbol})</SelectItem>
                      <SelectItem value="icon">Dollar icon ($)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Choose whether to display the text symbol or a fixed dollar icon
                  </p>
                </div>

                <Separator />

                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="text-sm font-medium mb-2">Preview</div>
                  <div className="text-2xl font-bold">
                    {settings.iconStyle === 'icon' ? '$' : settings.displaySymbol}{(12500).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Code: {settings.code} · Symbol: {settings.symbol}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSettings({ ...original })}
                    disabled={!hasChanges || isSaving}
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleBasedRoute>
  );
}
