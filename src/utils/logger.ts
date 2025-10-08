/**
 * Production-ready logging utility
 * Provides structured logging with different levels and proper error handling
 */

import { CONFIG } from '../config';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly minLevel: LogLevel;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    // Map string log level to enum
    const logLevelMap: Record<string, LogLevel> = {
      debug: LogLevel.DEBUG,
      info: LogLevel.INFO,
      warn: LogLevel.WARN,
      error: LogLevel.ERROR,
    };
    this.minLevel = this.isDevelopment
      ? LogLevel.DEBUG
      : (logLevelMap[CONFIG.LOG_LEVEL] ?? LogLevel.WARN);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];

    let formattedMessage = `[${timestamp}] ${levelName}: ${message}`;

    if (context && Object.keys(context).length > 0) {
      formattedMessage += ` | Context: ${JSON.stringify(context)}`;
    }

    if (error) {
      formattedMessage += ` | Error: ${error.message}`;
      if (error.stack) {
        formattedMessage += ` | Stack: ${error.stack}`;
      }
    }

    return formattedMessage;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context, error);
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(error && { error }),
    };

    // In development, use console methods for better debugging
    if (this.isDevelopment) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
      }
    } else {
      // In production, you might want to send logs to a service
      // For now, we'll use console methods but they should be removed in production builds
      switch (level) {
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        default:
          // In production, only log warnings and errors
          break;
      }
    }

    // Store logs for potential error reporting (in production, send to monitoring service)
    this.storeLog(logEntry);
  }

  private storeLog(logEntry: LogEntry): void {
    // In a real application, you would send this to a logging service
    // For now, we'll store in memory (limited to prevent memory leaks)
    if (typeof window !== 'undefined') {
      const logs = (window as any).__appLogs || [];
      logs.push(logEntry);

      // Keep only last 100 logs to prevent memory leaks
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      (window as any).__appLogs = logs;
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(
    message: string,
    context?: Record<string, unknown>,
    error?: Error,
  ): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Utility method for API errors
  apiError(
    message: string,
    error: Error,
    context?: Record<string, unknown>,
  ): void {
    this.error(
      `API Error: ${message}`,
      {
        ...context,
        url: (error as any).config?.url,
        method: (error as any).config?.method,
        status: (error as any).response?.status,
      },
      error,
    );
  }

  // Utility method for user actions
  userAction(action: string, context?: Record<string, unknown>): void {
    this.info(`User Action: ${action}`, context);
  }

  // Utility method for performance monitoring
  performance(
    operation: string,
    duration: number,
    context?: Record<string, unknown>,
  ): void {
    this.info(`Performance: ${operation} took ${duration}ms`, context);
  }

  // Get stored logs (useful for error reporting)
  getLogs(): LogEntry[] {
    if (typeof window !== 'undefined') {
      return (window as any).__appLogs || [];
    }
    return [];
  }

  // Clear stored logs
  clearLogs(): void {
    if (typeof window !== 'undefined') {
      (window as any).__appLogs = [];
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
