import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/shared/Header';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { BackgroundSyncProvider } from '@/providers/BackgroundSyncProvider';
import { AuthInitializer } from '@/components/providers/AuthInitializer';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from 'sonner';
import { ServiceWorkerRegistration } from '@/components/providers/ServiceWorkerRegistration';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { BrandedFooter } from '@/components/shared/BrandedFooter';
import { prisma } from '@/lib/db/client';

const DEFAULT_APP_NAME = 'DRMS';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  let appName = DEFAULT_APP_NAME;
  let appDescription = 'Comprehensive disaster response management and humanitarian assessment PWA';

  let headerIconUrl = '';

  try {
    const settings = await prisma.systemSetting.findMany({
      where: { section: 'branding' },
    });
    const brandingMap = new Map(settings.map(s => [s.key, s.value as string]));
    appName = brandingMap.get('appName') || DEFAULT_APP_NAME;
    appDescription = brandingMap.get('appDescription') || appDescription;
    headerIconUrl = brandingMap.get('headerIconUrl') || '';
  } catch {}

  const icons = headerIconUrl
    ? { icon: headerIconUrl, apple: headerIconUrl }
    : undefined;

  return {
    title: `${appName} — Disaster Response Management System`,
    description: appDescription,
    manifest: '/api/v1/manifest',
    icons,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: appName,
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-background min-h-screen transition-colors duration-300">
        <ServiceWorkerRegistration />
        <InstallPrompt />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-primary focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <BackgroundSyncProvider>
              <AuthInitializer>
                <div className="min-h-screen flex flex-col">
                  <Header />

                  <main className="flex-1">
                    {children}
                  </main>

              <BrandedFooter />
              </div>
              <Toaster richColors position="top-right" closeButton duration={4000} />
              </AuthInitializer>
            </BackgroundSyncProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
