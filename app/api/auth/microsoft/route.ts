import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function base64URLEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function GET(request: NextRequest) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? 'common';
  const origin = request.nextUrl.origin;

  if (!clientId) {
    console.error('[Microsoft OAuth] MICROSOFT_CLIENT_ID env var is not set');
    const settingsUrl = new URL('/settings', origin);
    settingsUrl.searchParams.set('microsoft', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  // Generate PKCE code verifier and S256 challenge
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(
    Buffer.from(crypto.createHash('sha256').update(codeVerifier).digest())
  );
  const state = base64URLEncode(crypto.randomBytes(16));

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', `${origin}/api/auth/microsoft/callback`);
  authUrl.searchParams.set('scope', 'openid profile email offline_access');
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl.toString());

  // Store PKCE verifier and state in short-lived httpOnly cookies
  response.cookies.set('ms_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('ms_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}
