import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // 1. Extract email from the request body
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  // 2. Create a Supabase admin client
  // This uses the SERVICE_ROLE_KEY for privileged operations
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 3. Construct the redirect URL from environment variables
  // This will be http://localhost:3000/onboard in dev
  // and https://your-site.com/onboard in production
  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/onboard`;

  console.log('--- INVITE DEBUG ---');
  console.log('Generated Redirect URL:', redirectUrl);
  console.log('Environment Variable NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
  console.log('--------------------');

  // 4. Invite the user
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: redirectUrl }
  );

  if (error) {
    console.error('Supabase invite error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 5. Return the success response
  return NextResponse.json({ message: 'Invite sent successfully', user: data.user });
}
