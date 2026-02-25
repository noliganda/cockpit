import { NextRequest, NextResponse } from 'next/server';

const REDIRECT_URI = 'https://dashboard.oliviermarcolin.com/api/auth/google/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    console.error('[Google OAuth] GOOGLE_CLIENT_ID env var is not set');
    const settingsUrl = new URL('/settings', request.nextUrl.origin);
    settingsUrl.searchParams.set('google', 'error');
    return NextResponse.redirect(settingsUrl.toString());
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
