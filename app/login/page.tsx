'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError('Invalid email or password')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0F0F]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">OPS Dashboard</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Sign in to continue</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {[{ color: '#D4A017' }, { color: '#008080' }, { color: '#F97316' }].map((ws, i) => (
              <div key={i} className="w-2 h-2 rounded-full opacity-60" style={{ backgroundColor: ws.color }} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            autoFocus
            required
            className="w-full px-4 py-3 rounded-[8px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] focus:outline-none focus:border-[rgba(255,255,255,0.16)] text-sm transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-[8px] bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] placeholder-[#4B5563] focus:outline-none focus:border-[rgba(255,255,255,0.16)] text-sm transition-colors"
          />

          {error && (
            <p className="text-sm text-[#EF4444]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !email}
            className="w-full py-3 rounded-[8px] bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm font-medium hover:bg-[#222222] hover:border-[rgba(255,255,255,0.10)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
