import { NextResponse } from 'next/server';

const SECURITY_TXT = `Contact: mailto:security@oliviermarcolin.com
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: en
Policy: https://dashboard.oliviermarcolin.com/security-policy
Canonical: https://dashboard.oliviermarcolin.com/api/.well-known/security.txt
`;

export async function GET() {
  return new NextResponse(SECURITY_TXT, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
