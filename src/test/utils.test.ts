import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ref, computed } from 'vue';
import { Logger, LogLevel } from '../utils/logger';
import { Validator } from '../utils/validator';
import { ConfigManager } from '../config';

describe('Logger', () => {
  let logger: Logger;
  let consoleSpy: any;

  beforeEach(() => {
    logger = new Logger();
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    // Clear logs before each test
    logger.clearLogs();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    logger.clearLogs();
  });

  it('should log debug messages in development', () => {
    logger.debug('Test debug message', { test: true });
    expect(consoleSpy.debug).toHaveBeenCalledWith(
      expect.stringContaining('Test debug message')
    );
  });

  it('should log info messages', () => {
    logger.info('Test info message', { test: true });
    expect(consoleSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('Test info message')
    );
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message', { test: true });
    expect(consoleSpy.warn).toHaveBeenCalledWith(
      expect.stringContaining('Test warning message')
    );
  });

  it('should log error messages', () => {
    const error = new Error('Test error');
    logger.error('Test error message', { test: true }, error);
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('Test error message')
    );
  });

  it('should log API errors with context', () => {
    const error = new Error('API Error');
    (error as any).config = { url: '/test', method: 'GET' };
    (error as any).response = { status: 404 };

    logger.apiError('API request failed', error, { additional: 'context' });
    expect(consoleSpy.error).toHaveBeenCalledWith(
      expect.stringContaining('API Error: API request failed')
    );
  });

  it('should log user actions', () => {
    logger.userAction('Button clicked', { buttonId: 'test-button' });
    expect(consoleSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('User Action: Button clicked')
    );
  });

  it('should log performance metrics', () => {
    logger.performance('API Request', 150, { endpoint: '/races' });
    expect(consoleSpy.info).toHaveBeenCalledWith(
      expect.stringContaining('Performance: API Request took 150ms')
    );
  });

  it('should store logs in memory', () => {
    logger.info('Test message');
    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test message');
    expect(logs[0].level).toBe(LogLevel.INFO);
  });

  it('should clear stored logs', () => {
    logger.info('Test message');
    expect(logger.getLogs()).toHaveLength(1);

    logger.clearLogs();
    expect(logger.getLogs()).toHaveLength(0);
  });
});

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('sanitizeString', () => {
    it('should sanitize potentially dangerous strings', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = validator.sanitizeString(input);
      expect(result).toBe('scriptalert("xss")/scriptHello');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = validator.sanitizeString(input);
      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'onclick="alert(1)"';
      const result = validator.sanitizeString(input);
      expect(result).toBe('"alert(1)"');
    });

    it('should handle non-string input', () => {
      expect(validator.sanitizeString(null)).toBe('');
      expect(validator.sanitizeString(undefined)).toBe('');
      expect(validator.sanitizeString(123)).toBe('');
    });
  });

  describe('validate', () => {
    it('should validate required fields', () => {
      const result = validator.validate('', { required: true });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required');
    });

    it('should validate string type', () => {
      const result = validator.validate(123, { type: 'string' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be a string');
    });

    it('should validate number type', () => {
      const result = validator.validate('not a number', { type: 'number' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be a number');
    });

    it('should validate email format', () => {
      const result = validator.validate('invalid-email', { type: 'email' });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value must be a valid email address');
    });

    it('should validate URL format', () => {
      // Test valid URLs
      const validResult1 = validator.validate('https://example.com', {
        type: 'url',
        required: true,
      });
      expect(validResult1.isValid).toBe(true);
      expect(validResult1.errors).toHaveLength(0);

      const validResult2 = validator.validate('http://example.com', {
        type: 'url',
        required: true,
      });
      expect(validResult2.isValid).toBe(true);
      expect(validResult2.errors).toHaveLength(0);

      // Test invalid URLs
      const invalidResult = validator.validate('not-a-url', {
        type: 'url',
        required: true,
      });

      // Check that we got at least one error
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Value must be a valid URL');
    });

    it('should validate string length', () => {
      const result = validator.validate('hi', {
        type: 'string',
        minLength: 5,
        maxLength: 10,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Value must be at least 5 characters long'
      );
    });

    it('should validate pattern', () => {
      const result = validator.validate('abc', {
        type: 'string',
        pattern: /^[0-9]+$/,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value does not match required pattern');
    });

    it('should validate with custom validator', () => {
      const result = validator.validate('test', {
        custom: value => value === 'valid',
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value failed custom validation');
    });
  });

  describe('validateRaceData', () => {
    it('should validate valid race data', () => {
      const validRace = {
        race_id: 'test-1',
        race_name: 'Test Race',
        race_number: 1,
        meeting_name: 'Test Meeting',
        category_id: 'test-category',
        advertised_start: new Date(),
        venue_name: 'Test Venue',
      };

      const result = validator.validateRaceData(validRace);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid race data', () => {
      const invalidRace = {
        race_id: 'test-1',
        // Missing required fields
      };

      const result = validator.validateRaceData(invalidRace);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject non-object input', () => {
      const result = validator.validateRaceData('not an object');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Race data must be an object');
    });
  });

  describe('validateCategoryId', () => {
    it('should validate valid category IDs', () => {
      const validIds = [
        '9daef0d7-bf3c-4f50-921d-8e818c60fe61', // Greyhound
        '161d9be2-e909-4326-8c2c-35ed71fb460b', // Harness
        '4a2788f8-e825-4d36-9894-efd4baf1cfae', // Horse
      ];

      validIds.forEach(id => {
        const result = validator.validateCategoryId(id);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid category IDs', () => {
      const result = validator.validateCategoryId('invalid-id');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Value failed custom validation');
    });
  });

  describe('validateApiResponse', () => {
    it('should validate valid API response', () => {
      const validResponse = {
        data: {
          next_to_go_ids: ['race-1', 'race-2'],
          race_summaries: {
            'race-1': {},
            'race-2': {},
          },
        },
      };

      const result = validator.validateApiResponse(validResponse);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid API response', () => {
      const invalidResponse = {
        data: {
          // Missing required fields
        },
      };

      const result = validator.validateApiResponse(invalidResponse);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('ConfigManager', () => {
  let config: ConfigManager;

  beforeEach(() => {
    // Reset environment variables
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.stubEnv('VITE_API_TIMEOUT', '');
    vi.stubEnv('VITE_LOG_LEVEL', '');
    config = new ConfigManager();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should load default configuration', () => {
    expect(config.get('API_BASE_URL')).toBe(
      'https://api.neds.com.au/rest/v1/racing'
    );
    expect(config.get('API_TIMEOUT')).toBe(10000);
    expect(config.get('AUTO_REFRESH_INTERVAL')).toBe(30000);
    expect(config.get('MAX_RACES_DISPLAYED')).toBe(5);
  });

  it('should load configuration from environment variables', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://custom-api.com');
    vi.stubEnv('VITE_API_TIMEOUT', '15000');
    vi.stubEnv('VITE_LOG_LEVEL', 'error');

    const customConfig = new ConfigManager();
    expect(customConfig.get('API_BASE_URL')).toBe('https://custom-api.com');
    expect(customConfig.get('API_TIMEOUT')).toBe(15000);
    expect(customConfig.get('LOG_LEVEL')).toBe('error');
  });

  it('should validate configuration', () => {
    const validation = config.validateConfig();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect invalid configuration', () => {
    vi.stubEnv('VITE_API_TIMEOUT', '500'); // Too low
    vi.stubEnv('VITE_AUTO_REFRESH_INTERVAL', '1000'); // Too low
    vi.stubEnv('VITE_MAX_RACES_DISPLAYED', '100'); // Too high

    const invalidConfig = new ConfigManager();
    const validation = invalidConfig.validateConfig();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should construct API URLs correctly', () => {
    expect(config.getApiUrl()).toBe('https://api.neds.com.au/rest/v1/racing/');
    expect(config.getApiUrl('/races')).toBe(
      'https://api.neds.com.au/rest/v1/racing/races'
    );
    expect(config.getApiUrl('races')).toBe(
      'https://api.neds.com.au/rest/v1/racing/races'
    );
  });

  it('should determine log levels correctly', () => {
    expect(config.getLogLevel()).toBe(0); // debug level in test environment
    expect(config.shouldLog('info')).toBe(true);
    expect(config.shouldLog('debug')).toBe(true);
    expect(config.shouldLog('warn')).toBe(true);
    expect(config.shouldLog('error')).toBe(true);
  });

  it('should detect environment correctly', () => {
    expect(config.isDevelopment()).toBe(true);
    expect(config.isProduction()).toBe(false);
    expect(config.isTest()).toBe(true); // In test environment, this should be true
  });
});
