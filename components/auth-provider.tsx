'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

// Routes that handle their own auth and bypass the main lock screen
const STANDALONE_ROUTES = ['/metrics/korus'];

// ─── types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  logout: () => void;
  sessionExpiresAt: number | null;
}

const AuthContext = createContext<AuthContextType>({
  logout: () => {},
  sessionExpiresAt: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─── constants ────────────────────────────────────────────────────────────────

const SESSION_KEY = 'ops_auth_session';
const DEFAULT_PASSWORD = 'opsdb2026';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadSession(): { expires: number } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.expires === 'number' && parsed.expires > Date.now()) {
      return parsed;
    }
    localStorage.removeItem(SESSION_KEY);
    return null;
  } catch {
    return null;
  }
}

function saveSession() {
  const expires = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ expires }));
  return expires;
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// ─── lock screen ─────────────────────────────────────────────────────────────

function LockScreen({ onUnlock }: { onUnlock: (expires: number) => void }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Check stored custom password, fall back to default
    let correctPw = DEFAULT_PASSWORD;
    try {
      const custom = localStorage.getItem('ops_custom_password');
      if (custom) correctPw = custom;
    } catch { /* ignore */ }

    if (password === correctPw) {
      const expires = saveSession();
      onUnlock(expires);
    } else {
      setError('Incorrect password. Try again.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#C8FF3D] flex items-center justify-center mb-4">
            <Zap className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">OPS DASHBOARD</h1>
          <p className="text-sm text-[#A0A0A0] mt-1">Byron Film × KORUS Group</p>
        </div>

        {/* Card */}
        <motion.div
          animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-5">
            <Lock className="w-4 h-4 text-[#6B7280]" />
            <span className="text-sm font-medium text-[#A0A0A0]">Password required</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter password"
                autoFocus
                className="w-full px-4 py-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-white placeholder:text-[#6B7280] text-sm focus:outline-none focus:border-[#3A3A3A] pr-11 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-xs text-[#EF4444]"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!password}
              className="w-full py-3 bg-[#C8FF3D] text-black text-sm font-semibold rounded-xl transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              Unlock
            </button>
          </form>
        </motion.div>

        <p className="text-center text-[10px] text-[#3A3A3A] mt-6 uppercase tracking-widest">
          Protected workspace
        </p>
      </motion.div>
    </div>
  );
}

// ─── provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_ROUTES.includes(pathname);

  const [authed, setAuthed] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setAuthed(true);
      setSessionExpiresAt(session.expires);
    }
    setChecked(true);
  }, []);

  function handleUnlock(expires: number) {
    setAuthed(true);
    setSessionExpiresAt(expires);
  }

  function logout() {
    clearSession();
    setAuthed(false);
    setSessionExpiresAt(null);
  }

  // Standalone routes handle their own auth — skip the main lock screen entirely
  if (isStandalone) {
    return <AuthContext.Provider value={{ logout, sessionExpiresAt }}>{children}</AuthContext.Provider>;
  }

  // Don't render anything until we've checked localStorage (avoids flash)
  if (!checked) return null;

  if (!authed) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <AuthContext.Provider value={{ logout, sessionExpiresAt }}>
      {children}
    </AuthContext.Provider>
  );
}
