/**
 * PWA Testing Configuration
 * Provides environment-specific settings for PWA development and testing
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isPWATesting = process.env.PWA_TESTING === 'true';
const isCIEnvironment = process.env.CI === 'true';

module.exports = {
  // PWA configuration for different environments
  environments: {
    development: {
      enablePWA: isPWATesting,
      serviceWorker: {
        register: isPWATesting,
        skipWaiting: isPWATesting,
        scope: '/',
      },
      manifest: {
        // Use test manifest in development
        manifestPath: isPWATesting ? '/manifest.json' : '/manifest-dev.json',
      },
      caching: {
        // Reduced cache times for development
        apiCacheTime: 5 * 60, // 5 minutes
        assetCacheTime: 30 * 60, // 30 minutes
      }
    },
    
    test: {
      enablePWA: true,
      serviceWorker: {
        register: true,
        skipWaiting: true,
        scope: '/',
      },
      manifest: {
        manifestPath: '/manifest-test.json',
      },
      caching: {
        // Very short cache times for testing
        apiCacheTime: 60, // 1 minute
        assetCacheTime: 5 * 60, // 5 minutes
      }
    },
    
    production: {
      enablePWA: true,
      serviceWorker: {
        register: true,
        skipWaiting: true,
        scope: '/',
      },
      manifest: {
        manifestPath: '/manifest.json',
      },
      caching: {
        // Full cache times for production
        apiCacheTime: 24 * 60 * 60, // 24 hours
        assetCacheTime: 30 * 24 * 60 * 60, // 30 days
      }
    }
  },

  // Get current environment configuration
  getCurrentConfig() {
    if (isCIEnvironment || process.env.NODE_ENV === 'test') {
      return this.environments.test;
    } else if (isDevelopment) {
      return this.environments.development;
    } else {
      return this.environments.production;
    }
  },

  // Helper to check if PWA should be enabled
  shouldEnablePWA() {
    return this.getCurrentConfig().enablePWA;
  },

  // Get cache configuration for current environment
  getCacheConfig() {
    return this.getCurrentConfig().caching;
  }
};