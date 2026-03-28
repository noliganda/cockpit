import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@neondatabase/serverless', 'bcryptjs'],
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
