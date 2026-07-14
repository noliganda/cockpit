import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  outputFileTracingRoot: path.join(__dirname),
  // Contacts moved from /crm → /contacts (SPEC-2026-07-15-contacts-crm-split).
  // Keep old bookmarks working. Does not affect /api/crm/webhooks/*.
  async redirects() {
    return [
      { source: '/crm', destination: '/contacts', permanent: true },
      { source: '/crm/:id', destination: '/contacts/:id', permanent: true },
    ]
  },
}

export default nextConfig
