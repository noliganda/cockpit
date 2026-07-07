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
    <div className="min-h-screen flex items-center justify-center bg-[#1A1410]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[26px] font-medium text-[#E8DFCE]">Cockpit</h1>
          <p className="text-sm text-[#A79B78] mt-1">Sign in to continue</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {[{ color: '#C99A1F' }, { color: '#3E7A70' }, { color: '#C96F2E' }].map((ws, i) => (
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
            className="w-full px-4 py-3 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] focus:outline-none focus:border-[rgba(167,155,120,0.35)] text-sm transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 rounded-none bg-[#140F0B] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] placeholder-[#5C5340] focus:outline-none focus:border-[rgba(167,155,120,0.35)] text-sm transition-colors"
          />

          {error && (
            <p className="text-sm text-[#C0452E]">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !email}
            className="w-full py-3 rounded-none bg-[#281E16] border border-[rgba(167,155,120,0.13)] text-[#E8DFCE] text-sm font-medium hover:bg-[#2F241A] hover:border-[rgba(167,155,120,0.22)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
