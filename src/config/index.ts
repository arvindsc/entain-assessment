/**
 * Environment configuration
 * Centralized configuration management for different environments
 */

export interface AppConfig {
  readonly API_BASE_URL: string;
  readonly API_TIMEOUT: number;
  readonly AUTO_REFRESH_INTERVAL: number;
  readonly MAX_RACES_DISPLAYED: number;
  readonly TIME_FILTER_HOURS: number;
  readonly RACE_REMOVAL_BUFFER: number;
  readonly LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  readonly ENABLE_ANALYTICS: boolean;
  readonly ENABLE_ERROR_REPORTING: boolean;
  readonly VERSION: string;
  readonly BUILD_TIME: string;
}

class ConfigManager {
  private readonly config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    const isDevelopment = import.meta.env.DEV;
    const isProduction = import.meta.env.PROD;

    return {
      // API Configuration
      API_BASE_URL:
        import.meta.env.VITE_API_BASE_URL ||
        'https://api.neds.com.au/rest/v1/racing',
      API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000', 10),

      // Application Configuration
      AUTO_REFRESH_INTERVAL: parseInt(
        import.meta.env.VITE_AUTO_REFRESH_INTERVAL || '30000',
        10
      ),
      MAX_RACES_DISPLAYED: parseInt(
        import.meta.env.VITE_MAX_RACES_DISPLAYED || '5',
        10
      ),
      TIME_FILTER_HOURS: parseInt(
        import.meta.env.VITE_TIME_FILTER_HOURS || '24',
        10
      ),
      RACE_REMOVAL_BUFFER: parseInt(
        import.meta.env.VITE_RACE_REMOVAL_BUFFER || '60000',
        10
      ),

      // Logging Configuration
      LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL ||
        (isDevelopment ? 'debug' : 'warn')) as AppConfig['LOG_LEVEL'],

      // Feature Flags
      ENABLE_ANALYTICS:
        import.meta.env.VITE_ENABLE_ANALYTICS === 'true' && isProduction,
      ENABLE_ERROR_REPORTING:
        import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true' && isProduction,

      // Build Information
      VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
      BUILD_TIME: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
    };
  }

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return import.meta.env.DEV;
  }

  isProduction(): boolean {
    return import.meta.env.PROD;
  }

  isTest(): boolean {
    return import.meta.env.MODE === 'test';
  }

  // Validation methods
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate API timeout
    if (this.config.API_TIMEOUT < 1000 || this.config.API_TIMEOUT > 60000) {
      errors.push('API_TIMEOUT must be between 1000 and 60000 milliseconds');
    }

    // Validate refresh interval
    if (
      this.config.AUTO_REFRESH_INTERVAL < 5000 ||
      this.config.AUTO_REFRESH_INTERVAL > 300000
    ) {
      errors.push(
        'AUTO_REFRESH_INTERVAL must be between 5000 and 300000 milliseconds'
      );
    }

    // Validate max races
    if (
      this.config.MAX_RACES_DISPLAYED < 1 ||
      this.config.MAX_RACES_DISPLAYED > 50
    ) {
      errors.push('MAX_RACES_DISPLAYED must be between 1 and 50');
    }

    // Validate time filter
    if (
      this.config.TIME_FILTER_HOURS < 1 ||
      this.config.TIME_FILTER_HOURS > 168
    ) {
      errors.push('TIME_FILTER_HOURS must be between 1 and 168 hours');
    }

    // Validate API base URL
    try {
      new URL(this.config.API_BASE_URL);
    } catch {
      errors.push('API_BASE_URL must be a valid URL');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Environment-specific helpers
  getApiUrl(endpoint: string = ''): string {
    const baseUrl = this.config.API_BASE_URL.endsWith('/')
      ? this.config.API_BASE_URL.slice(0, -1)
      : this.config.API_BASE_URL;

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    return `${baseUrl}${cleanEndpoint}`;
  }

  getLogLevel(): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[this.config.LOG_LEVEL];
  }

  shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level] >= this.getLogLevel();
  }
}

// Export singleton instance
export const config = new ConfigManager();

// Export for testing
export { ConfigManager };
