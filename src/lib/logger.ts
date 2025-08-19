// src/lib/logger.ts

/**
 * Production-ready logging system with audit capabilities
 * 
 * This module provides structured logging with the following features:
 * - Environment-aware log levels
 * - PII protection and data sanitization
 * - Separate audit trail logging
 * - OWASP-compliant error handling
 * - Structured JSON output for production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  AUDIT = 4,
}

export interface LogContext {
  userId?: string;
  orgId?: string;
  action?: string;
  targetUserId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: any;
}

export interface AuditEvent {
  eventType: 'USER_DELETION_ATTEMPT' | 'USER_DELETION_SUCCESS' | 'USER_DELETION_FAILED' | 'UNAUTHORIZED_ACCESS' | 'SECURITY_VIOLATION';
  adminUserId: string;
  orgId: string;
  targetUserId?: string;
  result: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  reason?: string;
  timestamp: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Sanitizes data to remove PII and sensitive information
   */
  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove or mask PII fields
    const piiFields = ['email', 'name', 'password', 'token', 'secret', 'key'];
    const sensitiveFields = ['authorization', 'cookie', 'session'];
    
    for (const key in sanitized) {
      const lowerKey = key.toLowerCase();
      
      if (piiFields.some(field => lowerKey.includes(field))) {
        if (lowerKey.includes('email')) {
          // For emails, show domain but mask local part
          const email = sanitized[key];
          if (typeof email === 'string' && email.includes('@')) {
            const [, domain] = email.split('@');
            sanitized[key] = `***@${domain}`;
          } else {
            sanitized[key] = '[REDACTED_EMAIL]';
          }
        } else {
          sanitized[key] = '[REDACTED_PII]';
        }
      } else if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED_SENSITIVE]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Generates a unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const timestamp = new Date().toISOString();
    const requestId = context?.requestId || this.generateRequestId();

    const logEntry = {
      timestamp,
      level: LogLevel[level],
      message,
      requestId,
      ...(context && { context: this.sanitizeData(context) }),
      ...(error && this.isDevelopment && { 
        error: {
          name: error.name,
          message: error.message,
          // Only include stack trace in development
          ...(this.isDevelopment && { stack: error.stack })
        }
      })
    };

    // In production, use structured JSON logging
    if (this.isProduction) {
      console.log(JSON.stringify(logEntry));
    } else {
      // In development, use more readable format
      console.log(`[${LogLevel[level]}] ${timestamp} - ${message}`, context ? this.sanitizeData(context) : '');
      if (error && this.isDevelopment) {
        console.error(error);
      }
    }
  }

  /**
   * Debug logging - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Info logging - general application events
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Warning logging - potential issues
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Error logging - application errors (sanitized for production)
   */
  error(message: string, context?: LogContext, error?: Error): void {
    // Sanitize error message for production
    const sanitizedMessage = this.isProduction 
      ? 'Application error occurred' 
      : message;
    
    this.log(LogLevel.ERROR, sanitizedMessage, context, error);
  }

  /**
   * Security-focused audit logging
   * This should be sent to a secure audit log system in production
   */
  audit(event: AuditEvent): void {
    const auditEntry = {
      level: 'AUDIT',
      ...event,
      // Ensure timestamp is always current if not provided
      timestamp: event.timestamp || new Date().toISOString()
    };

    // In production, this should be sent to a dedicated audit logging system
    // For now, we'll use structured console output with clear AUDIT prefix
    if (this.isProduction) {
      console.log(JSON.stringify({ ...auditEntry, logType: 'SECURITY_AUDIT' }));
    } else {
      console.log('[AUDIT]', JSON.stringify(auditEntry, null, 2));
    }

    // TODO: In production, send to dedicated audit system
    // await sendToAuditSystem(auditEntry);
  }

  /**
   * Security event logging for violations and suspicious activity
   */
  security(message: string, context: LogContext & { severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' }): void {
    const securityEvent: AuditEvent = {
      eventType: 'SECURITY_VIOLATION',
      adminUserId: context.userId || 'UNKNOWN',
      orgId: context.orgId || 'UNKNOWN',
      result: 'BLOCKED',
      reason: message,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      metadata: {
        severity: context.severity,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress
      }
    };

    this.audit(securityEvent);
  }
}

// Export singleton instance
export const logger = new Logger();

/**
 * Utility function to create sanitized error responses
 */
export function createErrorResponse(
  message: string, 
  statusCode: number, 
  context?: LogContext,
  internalError?: Error
): { message: string; statusCode: number; errorId: string } {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Log the internal error with full context
  logger.error(
    `API Error: ${message}`,
    { ...context, errorId },
    internalError
  );

  // Return sanitized response
  return {
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred processing your request' 
      : message,
    statusCode,
    errorId
  };
}

/**
 * Middleware to extract request context for logging
 */
export function extractRequestContext(req: Request, userId?: string): LogContext {
  return {
    userId,
    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userAgent: req.headers.get('user-agent') || 'unknown',
    // Note: In a real deployment behind a proxy, you'd extract real IP from X-Forwarded-For
    ipAddress: 'server-side', // Cannot get real IP in Next.js API routes without proxy headers
    timestamp: new Date().toISOString()
  };
}
