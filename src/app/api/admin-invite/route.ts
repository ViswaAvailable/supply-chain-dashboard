// src/app/api/admin-invite/route.ts

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await req.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // ==================== THE FIX IS HERE ====================
    // 1. Construct the full redirect URL using your environment variable.
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/onboard`;

    // 2. Pass this URL to the inviteUserByEmail function.
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo: redirectUrl } // <-- This is the crucial addition
    );
    // ========================================================

    if (error) {
      console.error('Supabase invite error:', error);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({
      message: 'Invitation sent successfully.',
      user: data.user,
    });

  } catch (err) {
    console.error('API Error:', err);
    if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown internal server error occurred' }, { status: 500 });
  }
}
