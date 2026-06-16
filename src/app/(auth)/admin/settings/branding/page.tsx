'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { RoleBasedRoute } from '@/components/shared/RoleBasedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiGet, apiPut } from '@/lib/api';
import { useInvalidateBranding } from '@/hooks/useBranding';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Upload,
  Image as ImageIcon,
  Settings,
  Monitor,
  Smartphone,
  Info,
  X,
} from '@/lib/icons';

interface BrandingSettings {
  appName: string;
  appDescription: string;
  headerIconUrl: string;
  pwaIconUrl: string;
}

const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'DRMS',
  appDescription: 'Comprehensive disaster response management and humanitarian assessment PWA',
  headerIconUrl: '',
  pwaIconUrl: '',
};

export default function BrandingSettingsPage() {
  const router = useRouter();
  const invalidateBranding = useInvalidateBranding();
  const headerInputRef = useRef<HTMLInputElement>(null);
  const pwaInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<BrandingSettings>({ ...DEFAULT_BRANDING });
  const [original, setOriginal] = useState<BrandingSettings>({ ...DEFAULT_BRANDING });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet<any>('/api/v1/system/settings');
      if (!result.success) throw new Error((result as any).error || 'Failed to load');
      const data = (result as any).data;
      if (data?.branding) {
        const branding: BrandingSettings = {
          appName: data.branding.appName || DEFAULT_BRANDING.appName,
          appDescription: data.branding.appDescription || DEFAULT_BRANDING.appDescription,
          headerIconUrl: data.branding.headerIconUrl || '',
          pwaIconUrl: data.branding.pwaIconUrl || '',
        };
        setSettings(branding);
        setOriginal(branding);
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

  const updateField = <K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleUpload = async (file: File, field: 'headerIconUrl' | 'pwaIconUrl') => {
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      toast.error('Invalid file type. Allowed: PNG, JPG, SVG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large. Maximum size: 2MB.');
      return;
    }

    setIsUploading(field);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/v1/system/branding/upload', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Upload failed');

      updateField(field, result.data.url);
      toast.success(`${field === 'headerIconUrl' ? 'Header' : 'PWA'} icon uploaded`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUploading(null);
    }
  };

  const handleSave = async () => {
    if (!settings.appName.trim()) {
      toast.error('App name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiPut('/api/v1/system/settings', {
        section: 'branding',
        settings: {
          appName: settings.appName.trim(),
          appDescription: settings.appDescription.trim(),
          headerIconUrl: settings.headerIconUrl,
          pwaIconUrl: settings.pwaIconUrl,
        },
      });
      if (!result.success) throw new Error((result as any).error || 'Failed to save');

      setOriginal({ ...settings });
      invalidateBranding();
      toast.success('Branding settings saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setSettings({ ...original });
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Brand Settings</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Customize app name, description, and icons
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Discard</span>
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={isSaving || isUploading !== null || !hasChanges}>
              <Save className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">App Identity</CardTitle>
                <CardDescription>Name and description shown across the app</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appName" className="text-sm font-medium">App Name</Label>
                  <Input
                    id="appName"
                    value={settings.appName}
                    onChange={(e) => updateField('appName', e.target.value)}
                    placeholder="e.g. DRMS, NERMS Kano"
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown in header, sidebar, login page, browser title, and PWA install prompt
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appDescription" className="text-sm font-medium">App Description</Label>
                  <Input
                    id="appDescription"
                    value={settings.appDescription}
                    onChange={(e) => updateField('appDescription', e.target.value)}
                    placeholder="Brief description of the system"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in login page subtitle and PWA manifest description
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-500" />
                  <div>
                    <CardTitle className="text-base">Header Icon</CardTitle>
                    <CardDescription>Icon displayed next to the app name in the header and sidebar</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={headerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, 'headerIconUrl');
                    e.target.value = '';
                  }}
                />
                {settings.headerIconUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={settings.headerIconUrl} alt="Header icon" className="h-10 w-10 object-contain rounded border" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{settings.headerIconUrl}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateField('headerIconUrl', '')}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom header icon set. Default icon (Shield) is used.</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => headerInputRef.current?.click()}
                  disabled={isUploading === 'headerIconUrl'}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading === 'headerIconUrl' ? 'Uploading...' : 'Upload Header Icon'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-500" />
                  <div>
                    <CardTitle className="text-base">PWA Icon</CardTitle>
                    <CardDescription>Icon used when the app is installed as a PWA on devices</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={pwaInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, 'pwaIconUrl');
                    e.target.value = '';
                  }}
                />
                {settings.pwaIconUrl ? (
                  <div className="flex items-center gap-3">
                    <img src={settings.pwaIconUrl} alt="PWA icon" className="h-14 w-14 object-contain rounded border" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{settings.pwaIconUrl}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateField('pwaIconUrl', '')}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom PWA icon set. Default icons are used.</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pwaInputRef.current?.click()}
                  disabled={isUploading === 'pwaIconUrl'}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  {isUploading === 'pwaIconUrl' ? 'Uploading...' : 'Upload PWA Icon'}
                </Button>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Recommended: 512x512px PNG. The browser will scale this icon for the install prompt and home screen.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Live Preview
                </CardTitle>
                <CardDescription>How the header will appear after saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-card border-b px-4 py-3">
                    <div className="flex items-center gap-2">
                      {settings.headerIconUrl ? (
                        <img src={settings.headerIconUrl} alt="" className="h-6 w-6 object-contain" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">D</span>
                        </div>
                      )}
                      <span className="text-sm font-semibold">{settings.appName || 'DRMS'}</span>
                    </div>
                  </div>
                  <div className="bg-background p-4 space-y-3">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-8 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Login Page Preview</h4>
                  <div className="border rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="text-lg font-bold">{settings.appName || 'DRMS'}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{settings.appDescription || 'No description'}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">Browser Tab Preview</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-1.5 flex items-center gap-2 border-b">
                      {settings.headerIconUrl ? (
                        <img src={settings.headerIconUrl} alt="" className="w-4 h-4 rounded-sm object-contain" />
                      ) : (
                        <div className="w-4 h-4 rounded-sm bg-primary/30" />
                      )}
                      <span className="text-xs truncate">
                        {settings.appName || 'DRMS'} — Disaster Response Management System
                      </span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2">PWA Install Preview</h4>
                  <div className="border rounded-lg p-4 flex items-center gap-3">
                    {settings.pwaIconUrl ? (
                      <img src={settings.pwaIconUrl} alt="" className="h-10 w-10 object-contain rounded" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">D</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{settings.appName || 'DRMS'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{settings.appDescription || 'No description'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RoleBasedRoute>
  );
}
