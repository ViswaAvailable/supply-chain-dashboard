import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';

const signupRedirectUrl = process.env.NEXT_PUBLIC_BASE_URL
  ? `${process.env.NEXT_PUBLIC_BASE_URL}/signup`
  : 'http://localhost:3000/signup';

const InviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  role: z.enum(['admin', 'viewer']),
  org_id: z.string().min(1, "Organization ID is required"),
  org_name: z.string().min(1, "Organization name is required"),
});

export async function POST(req: NextRequest) {
  try {
    console.log("=== API Debug Info ===");
    // Log headers
    const authHeader = req.headers.get('authorization');
    console.log("Auth header:", authHeader ? "Present" : "Missing");
    console.log("Auth header preview:", authHeader?.substring(0, 50) + "...");
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log("❌ Authorization header format invalid");
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log("Token extracted, length:", token.length);

    // Try to verify token
    const supabaseAdmin = getSupabaseAdmin();
    console.log("Getting user with token...");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    console.log("User result:", user ? `Found user ${user.id}` : "No user");
    console.log("User error:", userError?.message || "No error");

    if (userError || !user) {
      console.log("❌ User validation failed");
      return NextResponse.json({ error: 'Could not authenticate user', debug: userError?.message }, { status: 401 });
    }

    // Initialize admin client
    const supabaseAdmin = getSupabaseAdmin();
    
    // 1. Parse and validate body
    const body = await req.json();
    const parse = InviteSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parse.error.issues }, { status: 400 });
    }
    const { name, email, role, org_id, org_name } = parse.data;

    // 2. Get and verify the requesting user from cookies/session
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get: (key) => req.cookies.get(key)?.value,
        set: (key, value, options) => {}, // No-op for API route
        remove: (key, options) => {}, // No-op for API route
      },
    });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !session.user) {
      return NextResponse.json({ error: 'Could not authenticate user' }, { status: 401 });
    }

    const userId = session.user.id;

    // Check user role in public.users
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'Could not fetch user profile' }, { status: 403 });
    }

    if (userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can invite users' }, { status: 403 });
    }

    // 3. Check for duplicate email
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserError) {
      return NextResponse.json({ error: 'Error checking for existing user' }, { status: 500 });
    }

    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    // 4. Send invite via Supabase Admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        name,
        role,
        org_id,
        org_name,
      },
      app_metadata: {
        role,
      },
    });

    if (error) {
      if (error.message && error.message.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || 'Failed to send invitation.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
