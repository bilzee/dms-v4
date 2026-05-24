import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/shared/Header';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { BackgroundSyncProvider } from '@/providers/BackgroundSyncProvider';
import { AuthInitializer } from '@/components/providers/AuthInitializer';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Disaster Response Management System (DRMS)',
  description: 'Comprehensive disaster response management and humanitarian assessment PWA',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DRMS',
  },
};

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
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-background min-h-screen transition-colors duration-300">
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

                  {/* Main content */}
                  <main className="flex-1">
                    {children}
                  </main>

              {/* Footer */}
              <footer className="bg-card border-t border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Disaster Management System - Borno State, Nigeria
                  </p>
                </div>
                </footer>
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