/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for user inputs and API responses
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: unknown;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
  custom?: (value: unknown) => boolean;
  sanitize?: (value: unknown) => unknown;
}

class Validator {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  sanitizeString(input: unknown): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize HTML content (for cases where HTML is needed)
   */
  sanitizeHtml(input: unknown): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '');
  }

  /**
   * Validate and sanitize a value based on rules
   */
  validate(value: unknown, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];
    let sanitizedValue = value;

    // Required validation
    if (
      rules.required &&
      (value === null || value === undefined || value === '')
    ) {
      errors.push('This field is required');
      return { isValid: false, errors };
    }

    // Skip further validation if value is empty and not required
    if (
      !rules.required &&
      (value === null || value === undefined || value === '')
    ) {
      return { isValid: true, errors: [], sanitizedValue: value };
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push('Value must be a string');
          } else {
            sanitizedValue = this.sanitizeString(value);
          }
          break;
        case 'number':
          if (typeof value !== 'number' && !this.isNumericString(value)) {
            errors.push('Value must be a number');
          } else {
            sanitizedValue =
              typeof value === 'number' ? value : parseFloat(value as string);
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push('Value must be a boolean');
          }
          break;
        case 'date':
          if (!this.isValidDate(value)) {
            errors.push('Value must be a valid date');
          } else {
            sanitizedValue = new Date(value as string | number);
          }
          break;
        case 'email':
          if (typeof value !== 'string' || !this.isValidEmail(value)) {
            errors.push('Value must be a valid email address');
          } else {
            sanitizedValue = this.sanitizeString(value).toLowerCase();
          }
          break;
        case 'url':
          if (typeof value !== 'string') {
            errors.push('Value must be a string');
          } else if (!this.isValidUrl(value)) {
            errors.push('Value must be a valid URL');
          } else {
            sanitizedValue = this.sanitizeString(value);
          }
          break;
      }
    }

    // Length validation (for strings)
    if (typeof sanitizedValue === 'string') {
      if (rules.minLength && sanitizedValue.length < rules.minLength) {
        errors.push(
          `Value must be at least ${rules.minLength} characters long`
        );
      }
      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(
          `Value must be no more than ${rules.maxLength} characters long`
        );
      }
    }

    // Pattern validation (for strings)
    if (typeof sanitizedValue === 'string' && rules.pattern) {
      if (!rules.pattern.test(sanitizedValue)) {
        errors.push('Value does not match required pattern');
      }
    }

    // Custom validation
    if (rules.custom && !rules.custom(sanitizedValue)) {
      errors.push('Value failed custom validation');
    }

    // Custom sanitization
    if (rules.sanitize) {
      sanitizedValue = rules.sanitize(sanitizedValue);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue,
    };
  }

  /**
   * Validate race data from API
   */
  validateRaceData(data: unknown): ValidationResult {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Race data must be an object'] };
    }

    const race = data as Record<string, unknown>;
    const errors: string[] = [];

    // Required fields
    const requiredFields = [
      'race_id',
      'race_name',
      'race_number',
      'meeting_name',
      'category_id',
      'advertised_start',
      'venue_name',
    ];

    for (const field of requiredFields) {
      if (!race[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate specific fields
    if (race['race_id'] && typeof race['race_id'] !== 'string') {
      errors.push('race_id must be a string');
    }

    if (race['race_number'] && typeof race['race_number'] !== 'number') {
      errors.push('race_number must be a number');
    }

    if (race['advertised_start']) {
      const startValidation = this.validate(race['advertised_start'], {
        type: 'date',
      });
      if (!startValidation.isValid) {
        errors.push(
          ...startValidation.errors.map(e => `advertised_start: ${e}`)
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: data,
    };
  }

  /**
   * Validate category ID
   */
  validateCategoryId(categoryId: unknown): ValidationResult {
    const validCategoryIds = [
      '9daef0d7-bf3c-4f50-921d-8e818c60fe61', // Greyhound
      '161d9be2-e909-4326-8c2c-35ed71fb460b', // Harness
      '4a2788f8-e825-4d36-9894-efd4baf1cfae', // Horse
    ];

    return this.validate(categoryId, {
      required: true,
      type: 'string',
      custom: value => validCategoryIds.includes(value as string),
    });
  }

  /**
   * Validate API response structure
   */
  validateApiResponse(data: unknown): ValidationResult {
    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['API response must be an object'] };
    }

    const response = data as Record<string, unknown>;
    const errors: string[] = [];

    if (!response['data'] || typeof response['data'] !== 'object') {
      errors.push('API response must have a data property');
    } else {
      const responseData = response['data'] as Record<string, unknown>;

      if (!Array.isArray(responseData['next_to_go_ids'])) {
        errors.push('next_to_go_ids must be an array');
      }

      if (
        !responseData['race_summaries'] ||
        typeof responseData['race_summaries'] !== 'object'
      ) {
        errors.push('race_summaries must be an object');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedValue: data,
    };
  }

  // Helper methods
  private isNumericString(value: unknown): boolean {
    return (
      typeof value === 'string' &&
      !isNaN(Number(value)) &&
      !isNaN(parseFloat(value))
    );
  }

  private isValidDate(value: unknown): boolean {
    if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  }

  private isValidEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isValidUrl(value: string): boolean {
    try {
      const url = new URL(value);
      // Check if the URL has a valid protocol (http or https)
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const validator = new Validator();

// Export for testing
export { Validator };
