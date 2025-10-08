/**
 * Application configuration
 */

export const CONFIG = {
  /**
   * API Configuration
   */
  API_BASE_URL:
    import.meta.env['VITE_API_BASE_URL'] ||
    'https://api.neds.com.au/rest/v1/racing',
  USE_CORS_PROXY: import.meta.env['VITE_USE_CORS_PROXY'] === 'true' || false,
  CORS_PROXY_URL:
    import.meta.env['VITE_CORS_PROXY_URL'] ||
    'https://api.allorigins.win/raw?url=',

  /**
   * Logging Configuration
   */
  LOG_LEVEL: import.meta.env['VITE_LOG_LEVEL'] || 'info',
  ENABLE_ERROR_REPORTING:
    import.meta.env['VITE_ENABLE_ERROR_REPORTING'] === 'true' || false,
  ENABLE_ANALYTICS:
    import.meta.env['VITE_ENABLE_ANALYTICS'] === 'true' || false,

  /**
   * Feature Flags
   */
  ENABLE_MOCK_DATA:
    import.meta.env['VITE_ENABLE_MOCK_DATA'] === 'true' || false,

  /**
   * Race Display Configuration
   */
  MAX_RACES_DISPLAYED: 5,
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  TIME_FILTER_HOURS: 24, // Show races within next 24 hours
  RACE_REMOVAL_BUFFER: 60000, // Remove races 1 minute after start
} as const;

export type Config = typeof CONFIG;
