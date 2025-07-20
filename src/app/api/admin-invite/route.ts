// src/app/api/admin-invite/route.ts

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

// CORRECTED ZOD SCHEMA: Using a single 'message' property as the error dictates.
const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  name: z.string().min(1, { message: 'Name is required' }),
  role: z.enum(['admin', 'viewer'], {
    message: "Invalid role: must be 'admin' or 'viewer'",
  }),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // CORRECT HEADERS USAGE:
    const headersList = await headers();
    const authHeader = headersList.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid token.' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
        console.error('Auth token validation error:', userError);
        return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }


    if (user.app_metadata.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: You must be an admin to invite users.' }, { status: 403 });
    }

    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('org_id, org_name')
      .eq('id', user.id)
      .single();
    


    if (profileError || !adminProfile || !adminProfile.org_id) {
      console.error('Admin profile fetching error:', profileError);
      return NextResponse.json({ error: 'Could not fetch admin organization info.' }, { status: 500 });
    }
    
    const body = await req.json();
    const validation = inviteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.flatten().fieldErrors }, { status: 400 });
    }
    const { email, name, role } = validation.data;
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`;

    // This is the data we are about to send to Supabase for the invite
    const inviteDataPayload = {
        org_id: adminProfile.org_id,
        org_name: adminProfile.org_name,
        name: name,
        role: role,
    };
    

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          org_id: adminProfile.org_id,
          org_name: adminProfile.org_name,
          name: name,
          role: role,
        },
      }
    );

    if (inviteError) {
      console.error('Supabase invite error:', inviteError);
      if (inviteError.message.includes('User already exists')) {
          return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Invitation sent successfully.',
      user: inviteData.user,
    });

  } catch (err) {
    console.error('API Route Error:', err);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}
