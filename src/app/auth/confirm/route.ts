import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

const VALID_OTP_TYPES: EmailOtpType[] = [
  'signup',
  'invite',
  'recovery',
  'magiclink',
  'email_change',
]

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const baseUrl = request.nextUrl.origin

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Missing verification parameters')}`
    )
  }

  if (!VALID_OTP_TYPES.includes(type)) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Invalid verification type')}`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    let message = 'Verification failed. Please try again.'
    if (error.message.includes('expired')) {
      message = 'This link has expired. Please request a new one.'
    } else if (error.message.includes('already') || error.message.includes('used')) {
      message = 'This link has already been used.'
    }
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(message)}`
    )
  }

  // Redirect based on verification type
  if (type === 'recovery') {
    return NextResponse.redirect(`${baseUrl}/update-password`)
  }

  return NextResponse.redirect(`${baseUrl}/dashboard`)
}
