import { NextRequest, NextResponse } from 'next/server';

interface MicrosoftTokenResponse {
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
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = new URL('/settings', request.nextUrl.origin);

  if (error || !code) {
    console.error('[Microsoft OAuth] Authorization error or missing code:', { error, hasCode: !!code });
    settingsUrl.searchParams.set('microsoft', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  const storedState = request.cookies.get('ms_oauth_state')?.value;
  const codeVerifier = request.cookies.get('ms_code_verifier')?.value;

  if (!storedState || storedState !== state || !codeVerifier) {
    console.error('[Microsoft OAuth] State mismatch or missing PKCE verifier');
    settingsUrl.searchParams.set('microsoft', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';

  if (!clientId || !clientSecret) {
    console.error('[Microsoft OAuth] Missing MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET');
    settingsUrl.searchParams.set('microsoft', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `${request.nextUrl.origin}/api/auth/microsoft/callback`,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        }).toString(),
      }
    );

    const tokens = (await tokenRes.json()) as MicrosoftTokenResponse;

    if (!tokenRes.ok || tokens.error) {
      console.error('[Microsoft OAuth] Token exchange failed:', {
        status: tokenRes.status,
        error: tokens.error,
        description: tokens.error_description,
      });
      settingsUrl.searchParams.set('microsoft', 'error');
      return NextResponse.redirect(settingsUrl.toString());
    }

    console.log('[Microsoft OAuth] Tokens obtained successfully:', {
      token_type: tokens.token_type,
      scope: tokens.scope,
      expires_in: tokens.expires_in,
      has_access_token: !!tokens.access_token,
      has_refresh_token: !!tokens.refresh_token,
    });

    settingsUrl.searchParams.set('microsoft', 'connected');
    const response = NextResponse.redirect(settingsUrl.toString());

    // Clear PKCE cookies
    response.cookies.delete('ms_code_verifier');
    response.cookies.delete('ms_oauth_state');

    if (tokens.access_token) {
      response.cookies.set('ms_access_token', tokens.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: tokens.expires_in ?? 3600,
        path: '/',
      });
    }

    if (tokens.refresh_token) {
      response.cookies.set('ms_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('[Microsoft OAuth] Unexpected error during token exchange:', err);
    settingsUrl.searchParams.set('microsoft', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }
}
