'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AUTH_KEY = 'ops-dashboard-auth';

export function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    setAuthenticated(stored === 'true');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (json.data?.authenticated) {
        sessionStorage.setItem(AUTH_KEY, 'true');
        setAuthenticated(true);
      } else {
        setError('Incorrect password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (authenticated === null) return null; // loading

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A]">
              <Lock className="h-6 w-6 text-[#A0A0A0]" />
            </div>
            <h1 className="text-xl font-semibold text-white">Ops Dashboard</h1>
            <p className="mt-1 text-sm text-[#A0A0A0]">Enter your password to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="text-center tracking-widest"
            />
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}
            <Button
              type="submit"
              variant="solid"
              className="w-full"
              disabled={loading || !password}
            >
              {loading ? 'Checking...' : 'Enter'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
