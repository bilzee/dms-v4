// PWA Install Prompt Component for DRMS
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  className?: string;
  autoShow?: boolean; // Show automatically on first visit
  showDelay?: number; // Delay before showing (ms)
}

export function InstallPrompt({ 
  className = '', 
  autoShow = true, 
  showDelay = 3000 
}: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      // Check if running in standalone mode (already installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any)?.standalone === true;
      
      setIsInstalled(isStandalone);
      
      // Check if user has dismissed prompt before
      const dismissed = localStorage.getItem('drms_install_prompt_dismissed');
      setHasBeenDismissed(dismissed === 'true');
      
      return isStandalone;
    };

    // Check for iOS devices (different install process)
    const checkIOSDevice = () => {
      const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      setIsIOSDevice(iOS);
      return iOS;
    };

    const installed = checkIfInstalled();
    const iOS = checkIOSDevice();

    if (installed) {
      return; // Already installed, don't show prompt
    }

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🔄 PWA install prompt event captured');
      e.preventDefault(); // Prevent default browser install prompt
      
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);

      // Auto-show prompt if enabled and not previously dismissed
      if (autoShow && !hasBeenDismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, showDelay);
      }
    };

    // Listen for successful app installation
    const handleAppInstalled = () => {
      console.log('✅ PWA was installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      
      // Clean up stored dismissal
      localStorage.removeItem('drms_install_prompt_dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS devices, show manual install instructions
    if (iOS && !installed && autoShow && !hasBeenDismissed) {
      setTimeout(() => {
        setCanInstall(true);
        setShowPrompt(true);
      }, showDelay);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [autoShow, showDelay, hasBeenDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOSDevice) {
      console.warn('No install prompt available');
      return;
    }

    if (isIOSDevice) {
      // Show iOS-specific instructions
      setShowPrompt(true);
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt!.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt!.userChoice;
      console.log(`👤 User choice: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
      }
      
      // Clean up
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('❌ Error during install prompt:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('drms_install_prompt_dismissed', 'true');
    setHasBeenDismissed(true);
  };

  // Don't render if already installed or can't install
  if (isInstalled || (!canInstall && !isIOSDevice)) {
    return null;
  }

  return (
    <>
      {/* Install Button (always available) */}
      {canInstall && !isInstalled && (
        <Button
          onClick={handleInstallClick}
          variant="outline"
          size="sm"
          className={`fixed bottom-4 right-4 z-50 ${className}`}
        >
          <Download className="w-4 h-4 mr-2" />
          Install App
        </Button>
      )}

      {/* Install Prompt Modal */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 md:items-center">
          <Card className="w-full max-w-md bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">Install DRMS App</CardTitle>
                    <CardDescription className="text-sm">
                      Access disaster response tools offline
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleDismiss}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="pb-4">
              {isIOSDevice ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Install DRMS on your device for offline access:
                  </p>
                  <ol className="text-sm space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                      Tap the Share button in Safari
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                      Select &quot;Add to Home Screen&quot;
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                      Confirm by tapping &quot;Add&quot;
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Install DRMS for quick access and offline capabilities:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true"></span>
                      Work offline in disaster areas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true"></span>
                      Faster loading and better performance
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true"></span>
                      Home screen access like a native app
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex gap-2 pt-0">
              {!isIOSDevice && (
                <Button onClick={handleInstallClick} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Install Now
                </Button>
              )}
              <Button variant="outline" onClick={handleDismiss} className={isIOSDevice ? 'flex-1' : ''}>
                {isIOSDevice ? 'Got it' : 'Maybe Later'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </>
  );
}

// Hook for programmatic install prompt
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any)?.standalone === true;
    setIsInstalled(isStandalone);
  }, []);

  const triggerInstall = () => {
    // This would trigger the install prompt component
    const event = new CustomEvent('drms_trigger_install');
    window.dispatchEvent(event);
  };

  return {
    canInstall,
    isInstalled,
    triggerInstall
  };
}