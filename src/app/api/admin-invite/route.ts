// src/app/api/admin-invite/route.ts

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin'; // Assuming this is your admin client helper
import { z } from 'zod';

// Define a schema for the incoming request body for validation
const inviteSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export async function POST(req: Request) {
  try {
    // --- FIX APPLIED HERE ---
    // Initialize the admin client ONCE at the beginning of the function.
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Parse and validate the request body
    const body = await req.json();
    const validation = inviteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // 2. Use the admin client to send the invitation
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (error) {
      // Handle potential errors, like user already exists
      console.error('Supabase invite error:', error);
      return NextResponse.json({ error: error.message }, { status: 409 }); // 409 Conflict is a good status here
    }

    // --- The duplicate declaration on line 49 has been removed ---
    // The previous code likely had another `const supabaseAdmin = ...` here, causing the error.

    return NextResponse.json({
      message: 'Invitation sent successfully.',
      user: data.user,
    });

  } catch (err) {
    console.error('API Error:', err);
    // Handle cases where JSON parsing fails or other unexpected errors
    if (err instanceof Error) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unknown internal server error occurred' }, { status: 500 });
  }
}
