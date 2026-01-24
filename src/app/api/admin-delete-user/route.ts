// src/app/api/admin-delete-user/route.ts

/**
 * Secure Admin User Deletion API Endpoint
 * 
 * This endpoint implements production-ready, security-compliant logging practices:
 * 
 * LOGGING STRATEGY:
 * - DEBUG: Development-only logs for troubleshooting (auto-disabled in production)
 * - INFO: General operation status with non-sensitive context
 * - WARN: Validation failures and recoverable errors
 * - ERROR: Application errors with sanitized messages (generic in production)
 * - AUDIT: Security events for compliance (UUIDs only, no PII)
 * - SECURITY: Violations and suspicious activity with severity levels
 * 
 * PII PROTECTION:
 * - All logs automatically sanitize email addresses, names, and tokens
 * - Production error messages are generic to prevent information disclosure
 * - Only UUIDs and non-sensitive metadata logged
 * - Request IDs enable correlation without exposing sensitive data
 * 
 * COMPLIANCE:
 * - OWASP logging guidelines followed
 * - GDPR compliant (no PII in logs)
 * - Complete audit trail for regulatory requirements
 * - Structured JSON output for production log analysis
 */

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logger, extractRequestContext, createErrorResponse } from '@/lib/logger';
import { z } from 'zod';
import { apiRateLimit, checkRateLimit } from '@/lib/rate-limit';

// Validation schema for delete user request
const deleteUserSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  confirmEmail: z.string().email({ message: 'Invalid email address format for confirmation' }),
});

export async function DELETE(req: Request) {
  // Extract request context for logging (no PII at this stage)
  const requestContext = extractRequestContext(req);
  
  logger.info('Admin user deletion request initiated', {
    ...requestContext,
    action: 'USER_DELETION_REQUEST'
  });

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get authorization header
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.security('Unauthorized deletion attempt - missing token', {
        ...requestContext,
        severity: 'MEDIUM'
      });
      
      const errorResponse = createErrorResponse(
        'Authentication required',
        401,
        { ...requestContext, action: 'AUTH_MISSING' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Validate the admin user's token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      logger.security('Invalid authentication token used in deletion attempt', {
        ...requestContext,
        severity: 'HIGH',
        reason: 'Invalid or expired JWT token'
      });
      
      const errorResponse = createErrorResponse(
        'Invalid authentication token',
        401,
        { ...requestContext, action: 'AUTH_INVALID' },
        userError || new Error('User not found')
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 401 });
    }

    // Update request context with authenticated user (UUID only, no PII)
    const authContext = {
      ...requestContext,
      userId: user.id,
      action: 'USER_DELETION_AUTH_SUCCESS'
    };

    // Verify admin role from JWT metadata
    if (user.app_metadata.role !== 'admin') {
      logger.security('Non-admin user attempted deletion', {
        ...authContext,
        severity: 'HIGH',
        reason: 'User role is not admin',
        userRole: user.app_metadata.role
      });
      
      const errorResponse = createErrorResponse(
        'Insufficient privileges',
        403,
        { ...authContext, action: 'ROLE_INSUFFICIENT' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 403 });
    }

    // Rate limiting: 100 requests per minute per user
    const { success: rateLimitSuccess, limit, remaining, reset } = await checkRateLimit(
      user.id,
      apiRateLimit
    );

    if (!rateLimitSuccess) {
      logger.security('Rate limit exceeded for user deletion', {
        ...authContext,
        severity: 'MEDIUM',
        limit,
        remaining,
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit?.toString() || '',
            'X-RateLimit-Remaining': remaining?.toString() || '',
            'X-RateLimit-Reset': reset?.toString() || '',
            'Retry-After': reset ? Math.ceil((reset - Date.now()) / 1000).toString() : '60',
          },
        }
      );
    }

    // Get admin's organization info
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile || !adminProfile.org_id) {
      logger.error('Failed to fetch admin profile during deletion', {
        ...authContext,
        action: 'ADMIN_PROFILE_FETCH_ERROR'
      }, profileError || undefined);

      const errorResponse = createErrorResponse(
        'Profile verification failed',
        500,
        { ...authContext, action: 'PROFILE_ERROR' },
        profileError || undefined
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 500 });
    }

    // Additional server-side admin role verification
    if (adminProfile.role !== 'admin') {
      logger.security('Role verification mismatch detected', {
        ...authContext,
        severity: 'CRITICAL',
        reason: 'JWT role does not match database role',
        jwtRole: user.app_metadata.role,
        dbRole: adminProfile.role
      });
      
      const errorResponse = createErrorResponse(
        'Role verification failed',
        403,
        { ...authContext, action: 'ROLE_MISMATCH' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 403 });
    }

    // Update context with organization info (UUID only, no PII)
    const orgContext = {
      ...authContext,
      orgId: adminProfile.org_id,
      action: 'USER_DELETION_VALIDATION'
    };

    // Parse and validate request body
    const body = await req.json();
    const validation = deleteUserSchema.safeParse(body);
    
    if (!validation.success) {
      logger.warn('Invalid request data in deletion attempt', {
        ...orgContext,
        action: 'VALIDATION_ERROR',
        validationErrors: validation.error.flatten().fieldErrors
      });
      
      const errorResponse = createErrorResponse(
        'Invalid request format',
        400,
        { ...orgContext, action: 'INVALID_INPUT' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        details: process.env.NODE_ENV === 'development' 
          ? validation.error.flatten().fieldErrors 
          : undefined,
        errorId: errorResponse.errorId
      }, { status: 400 });
    }

    const { userId, confirmEmail } = validation.data;

    // Update context with target user ID (UUID only)
    const deleteContext = {
      ...orgContext,
      targetUserId: userId,
      action: 'USER_DELETION_PROCESS'
    };

    // Prevent self-deletion
    if (userId === user.id) {
      logger.security('Admin attempted self-deletion', {
        ...deleteContext,
        severity: 'MEDIUM',
        reason: 'Self-deletion attempt blocked'
      });
      
      const errorResponse = createErrorResponse(
        'Cannot delete own account',
        403,
        { ...deleteContext, action: 'SELF_DELETE_BLOCKED' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 403 });
    }

    // Get target user information and verify they exist in the same organization
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, org_id, role, name')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      logger.warn('Target user not found during deletion attempt', {
        ...deleteContext,
        action: 'TARGET_USER_NOT_FOUND',
        error: targetUserError?.message
      });
      
      const errorResponse = createErrorResponse(
        'User not found',
        404,
        { ...deleteContext, action: 'USER_NOT_FOUND' },
        targetUserError || undefined
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 404 });
    }

    // Verify same organization (critical security check)
    if (targetUser.org_id !== adminProfile.org_id) {
      logger.security('Cross-organization deletion attempt detected', {
        ...deleteContext,
        severity: 'CRITICAL',
        reason: 'Admin attempted to delete user from different organization',
        adminOrgId: adminProfile.org_id,
        targetOrgId: targetUser.org_id
      });
      
      const errorResponse = createErrorResponse(
        'Access denied',
        403,
        { ...deleteContext, action: 'CROSS_ORG_BLOCKED' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 403 });
    }

    // Verify email confirmation matches target user (PII sanitized in logs)
    if (targetUser.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      logger.security('Email confirmation mismatch in deletion attempt', {
        ...deleteContext,
        severity: 'MEDIUM',
        reason: 'Provided confirmation email does not match target user'
        // Note: No actual emails logged for PII protection
      });
      
      const errorResponse = createErrorResponse(
        'Email confirmation mismatch',
        400,
        { ...deleteContext, action: 'EMAIL_MISMATCH' }
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 400 });
    }

    // Audit log: Deletion attempt initiated
    logger.audit({
      eventType: 'USER_DELETION_ATTEMPT',
      adminUserId: user.id,
      orgId: adminProfile.org_id,
      targetUserId: userId,
      result: 'FAILED', // Will be updated to SUCCESS if completed
      timestamp: new Date().toISOString(),
      requestId: deleteContext.requestId,
      metadata: {
        targetUserRole: targetUser.role,
        adminRole: adminProfile.role
      }
    });

    logger.info('Initiating user deletion process', {
      ...deleteContext,
      action: 'DELETION_START',
      targetUserRole: targetUser.role
    });

    // Step 1: Delete from public.users table first (to maintain referential integrity)
    const { error: publicDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('org_id', adminProfile.org_id); // Additional safety check

    if (publicDeleteError) {
      logger.error('Failed to delete user profile', {
        ...deleteContext,
        action: 'PUBLIC_DELETE_FAILED'
      }, publicDeleteError || undefined);
      
      // Audit log: Profile deletion failed
      logger.audit({
        eventType: 'USER_DELETION_FAILED',
        adminUserId: user.id,
        orgId: adminProfile.org_id,
        targetUserId: userId,
        result: 'FAILED',
        reason: 'Profile deletion failed',
        timestamp: new Date().toISOString(),
        requestId: deleteContext.requestId
      });
      
      const errorResponse = createErrorResponse(
        'Failed to delete user profile',
        500,
        { ...deleteContext, action: 'PROFILE_DELETE_ERROR' },
        publicDeleteError || undefined
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 500 });
    }

    logger.debug('User profile deleted successfully', {
      ...deleteContext,
      action: 'PUBLIC_DELETE_SUCCESS'
    });

    // Step 2: Delete from auth.users using admin client
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      logger.error('Failed to delete user authentication', {
        ...deleteContext,
        action: 'AUTH_DELETE_FAILED'
      }, authDeleteError || undefined);
      
      // Attempt to rollback public.users deletion by recreating the record
      // Note: This is a best-effort rollback, but in production you'd want proper transaction handling
      try {
        await supabaseAdmin
          .from('users')
          .insert({
            id: targetUser.id,
            email: targetUser.email,
            org_id: targetUser.org_id,
            role: targetUser.role,
            name: targetUser.name
          });
        
        logger.warn('Rolled back profile deletion due to auth deletion failure', {
          ...deleteContext,
          action: 'ROLLBACK_SUCCESS'
        });
        
      } catch (rollbackError) {
        logger.error('CRITICAL: Failed to rollback profile deletion', {
          ...deleteContext,
          action: 'ROLLBACK_FAILED',
          severity: 'CRITICAL'
        }, rollbackError as Error);
        
        // In production, this would trigger an alert for manual intervention
        logger.security('Data consistency issue detected', {
          ...deleteContext,
          severity: 'CRITICAL',
          reason: 'Profile deleted but auth deletion failed, rollback also failed'
        });
      }

      // Audit log: Auth deletion failed
      logger.audit({
        eventType: 'USER_DELETION_FAILED',
        adminUserId: user.id,
        orgId: adminProfile.org_id,
        targetUserId: userId,
        result: 'FAILED',
        reason: 'Authentication deletion failed',
        timestamp: new Date().toISOString(),
        requestId: deleteContext.requestId
      });
      
      const errorResponse = createErrorResponse(
        'Failed to delete user authentication',
        500,
        { ...deleteContext, action: 'AUTH_DELETE_ERROR' },
        authDeleteError || undefined
      );
      
      return NextResponse.json({ 
        error: errorResponse.message,
        errorId: errorResponse.errorId
      }, { status: 500 });
    }

    // Success! Both auth and profile deleted
    logger.info('User deletion completed successfully', {
      ...deleteContext,
      action: 'DELETION_SUCCESS'
    });

    // Audit log: Successful deletion
    logger.audit({
      eventType: 'USER_DELETION_SUCCESS',
      adminUserId: user.id,
      orgId: adminProfile.org_id,
      targetUserId: userId,
      result: 'SUCCESS',
      timestamp: new Date().toISOString(),
      requestId: deleteContext.requestId,
      metadata: {
        targetUserRole: targetUser.role,
        adminRole: adminProfile.role
      }
    });

    // TODO: In production, send audit email notification here
    // await sendAuditNotification({
    //   action: 'USER_DELETED',
    //   adminId: user.id,
    //   targetUserId: userId,
    //   orgId: adminProfile.org_id
    // });

    return NextResponse.json({
      message: 'User successfully deleted.',
      deletedUser: {
        id: targetUser.id,
        // Note: In production, consider whether to return PII in response
        email: process.env.NODE_ENV === 'development' ? targetUser.email : undefined,
        name: process.env.NODE_ENV === 'development' ? targetUser.name : undefined
      }
    });

  } catch (err) {
    // Extract context for error logging if available
    const errorContext = requestContext || {};
    
    logger.error('Unexpected error in admin user deletion', {
      ...errorContext,
      action: 'UNEXPECTED_ERROR'
    }, err as Error);

    // Audit log: Unexpected failure
    logger.audit({
      eventType: 'USER_DELETION_FAILED',
      adminUserId: errorContext.userId || 'UNKNOWN',
      orgId: errorContext.orgId || 'UNKNOWN',
      targetUserId: errorContext.targetUserId || 'UNKNOWN',
      result: 'FAILED',
      reason: 'Unexpected server error',
      timestamp: new Date().toISOString(),
      requestId: errorContext.requestId
    });

    const errorResponse = createErrorResponse(
      'An internal server error occurred',
      500,
      { ...errorContext, action: 'INTERNAL_ERROR' },
      err as Error
    );

    return NextResponse.json({ 
      error: errorResponse.message,
      errorId: errorResponse.errorId
    }, { status: 500 });
  }
}
