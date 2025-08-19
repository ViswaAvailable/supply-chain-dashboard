// src/app/api/admin-delete-user/route.ts

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

// Validation schema for delete user request
const deleteUserSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  confirmEmail: z.string().email({ message: 'Invalid email address format for confirmation' }),
});

export async function DELETE(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get authorization header
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Unauthorized: Missing or invalid token.' 
      }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Validate the admin user's token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth token validation error:', userError);
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid token.' 
      }, { status: 401 });
    }

    // Verify admin role from JWT metadata
    if (user.app_metadata.role !== 'admin') {
      console.error('Non-admin user attempted deletion:', user.id);
      return NextResponse.json({ 
        error: 'Forbidden: You must be an admin to delete users.' 
      }, { status: 403 });
    }

    // Get admin's organization info
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile || !adminProfile.org_id) {
      console.error('Admin profile fetching error:', profileError);
      return NextResponse.json({ 
        error: 'Could not fetch admin organization info.' 
      }, { status: 500 });
    }

    // Additional server-side admin role verification
    if (adminProfile.role !== 'admin') {
      console.error('Role mismatch for user:', user.id, 'JWT says admin, DB says:', adminProfile.role);
      return NextResponse.json({ 
        error: 'Forbidden: Role verification failed.' 
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = deleteUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: validation.error.flatten().fieldErrors 
      }, { status: 400 });
    }

    const { userId, confirmEmail } = validation.data;

    // Prevent self-deletion
    if (userId === user.id) {
      console.error('Admin attempted self-deletion:', user.id);
      return NextResponse.json({ 
        error: 'Forbidden: Cannot delete your own account.' 
      }, { status: 403 });
    }

    // Get target user information and verify they exist in the same organization
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, org_id, role, name')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      console.error('Target user not found:', userId, targetUserError);
      return NextResponse.json({ 
        error: 'User not found.' 
      }, { status: 404 });
    }

    // Verify same organization (critical security check)
    if (targetUser.org_id !== adminProfile.org_id) {
      console.error('Cross-organization deletion attempt:', {
        adminId: user.id,
        adminOrgId: adminProfile.org_id,
        targetUserId: userId,
        targetOrgId: targetUser.org_id
      });
      return NextResponse.json({ 
        error: 'Forbidden: Cannot delete users from other organizations.' 
      }, { status: 403 });
    }

    // Verify email confirmation matches target user
    if (targetUser.email.toLowerCase() !== confirmEmail.toLowerCase()) {
      console.error('Email confirmation mismatch for deletion:', {
        targetEmail: targetUser.email,
        confirmEmail: confirmEmail,
        adminId: user.id
      });
      return NextResponse.json({ 
        error: 'Email confirmation does not match target user.' 
      }, { status: 400 });
    }

    // Begin atomic transaction for deletion
    console.log('Starting user deletion process:', {
      adminId: user.id,
      targetUserId: userId,
      targetEmail: targetUser.email,
      orgId: adminProfile.org_id
    });

    // Step 1: Delete from public.users table first (to maintain referential integrity)
    const { error: publicDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)
      .eq('org_id', adminProfile.org_id); // Additional safety check

    if (publicDeleteError) {
      console.error('Failed to delete from public.users:', publicDeleteError);
      return NextResponse.json({ 
        error: 'Failed to delete user profile. Please try again.' 
      }, { status: 500 });
    }

    // Step 2: Delete from auth.users using admin client
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Failed to delete from auth.users:', authDeleteError);
      
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
        
        console.log('Rolled back public.users deletion due to auth deletion failure');
      } catch (rollbackError) {
        console.error('CRITICAL: Failed to rollback public.users deletion:', rollbackError);
        // In production, this would trigger an alert for manual intervention
      }

      return NextResponse.json({ 
        error: 'Failed to delete user authentication. Please contact support.' 
      }, { status: 500 });
    }

    // Log successful deletion for audit trail
    console.log('User successfully deleted:', {
      deletedUserId: userId,
      deletedUserEmail: targetUser.email,
      adminId: user.id,
      adminEmail: user.email,
      orgId: adminProfile.org_id,
      timestamp: new Date().toISOString()
    });

    // TODO: In production, send audit email notification here
    // await sendAuditNotification({
    //   action: 'USER_DELETED',
    //   adminId: user.id,
    //   targetUserId: userId,
    //   targetUserEmail: targetUser.email,
    //   orgId: adminProfile.org_id
    // });

    return NextResponse.json({
      message: 'User successfully deleted.',
      deletedUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name
      }
    });

  } catch (err) {
    console.error('API Route Error in admin-delete-user:', err);
    return NextResponse.json({ 
      error: 'An internal server error occurred' 
    }, { status: 500 });
  }
}
