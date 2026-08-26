import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Supabase Auth Callback Route
 *
 * Supabase redirects here after:
 *   - Email verification (signup confirmation)
 *   - Password reset
 *   - Magic link login
 *
 * URL format from Supabase:
 *   /auth/callback?code=PKCE_CODE           (PKCE flow)
 *   /auth/callback?token_hash=TOKEN&type=signup  (email OTP flow)
 *   /auth/callback?type=recovery            (password reset)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code       = searchParams.get('code');
  const tokenHash  = searchParams.get('token_hash');
  const type       = searchParams.get('type') as string | null;
  const next       = searchParams.get('next') ?? '/';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── PKCE code exchange (most common flow for email confirmation)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to appropriate page based on flow type
      if (type === 'recovery') {
        // Password reset — go to reset password page
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      // Email verification confirmed — show success page
      return NextResponse.redirect(`${origin}/auth/verified`);
    }
  }

  // ── Token hash verification (older email OTP flow)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }
      return NextResponse.redirect(`${origin}/auth/verified`);
    }
  }

  // ── Fallback — something went wrong, go to error page
  return NextResponse.redirect(
    `${origin}/auth/verified?error=true`
  );
}
