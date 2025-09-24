'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const url = mode === 'login' ? '/api/login' : '/api/auth/register';
      const body = { email, password };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Request failed');
      }
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '2rem', border: '1px solid #eee', borderRadius: 8 }}>
      <h1 style={{ marginBottom: 16 }}>{mode === 'login' ? 'Login' : 'Create account'}</h1>
      <form onSubmit={submit}>
        <label>Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ display: 'block', width: '100%', margin: '8px 0', padding: 8 }}
          />
        </label>

        <label>Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ display: 'block', width: '100%', margin: '8px 0', padding: 8 }}
          />
        </label>

        {error && <p style={{ color: 'crimson' }}>{error}</p>}

        <button disabled={busy} type="submit" style={{ padding: '8px 12px', marginTop: 8 }}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Login' : 'Register & Sign in'}
        </button>

        <div style={{ marginTop: 12 }}>
          {mode === 'login' ? (
            <span>
              New here?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('register');
                }}
              >
                Create an account
              </a>
            </span>
          ) : (
            <span>
              Have an account?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setMode('login');
                }}
              >
                Log in
              </a>
            </span>
          )}
        </div>
      </form>
    </main>
  );
}
