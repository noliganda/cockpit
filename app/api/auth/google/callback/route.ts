import { NextRequest, NextResponse } from 'next/server';

const REDIRECT_URI = 'https://dashboard.oliviermarcolin.com/api/auth/google/callback';

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.nextUrl.origin);

  if (error || !code) {
    console.error('[Google OAuth] Authorization error or missing code:', { error, hasCode: !!code });
    settingsUrl.searchParams.set('google', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokens = (await tokenRes.json()) as GoogleTokenResponse;

    if (!tokenRes.ok || tokens.error) {
      console.error('[Google OAuth] Token exchange failed:', {
        status: tokenRes.status,
        error: tokens.error,
        description: tokens.error_description,
      });
      settingsUrl.searchParams.set('google', 'error');
      return NextResponse.redirect(settingsUrl.toString());
    }

    console.log('[Google OAuth] Tokens obtained successfully:', {
      token_type: tokens.token_type,
      scope: tokens.scope,
      expires_in: tokens.expires_in,
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
    });

    settingsUrl.searchParams.set('google', 'connected');
    const response = NextResponse.redirect(settingsUrl.toString());

    if (tokens.access_token) {
      response.cookies.set('google_access_token', tokens.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: tokens.expires_in ?? 3600,
        path: '/',
      });
    }

    if (tokens.refresh_token) {
      response.cookies.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('[Google OAuth] Unexpected error during token exchange:', err);
    settingsUrl.searchParams.set('google', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }
}
