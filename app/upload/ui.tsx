'use client';

import { useState } from 'react';

export default function UploadClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        // show structured errors if present
        const detail = data?.errors?.length ? `\n- ${data.errors.join('\n- ')}` : '';
        throw new Error((data?.error || 'Upload failed') + detail);
      }
      // store summary for dashboard banner and redirect
      sessionStorage.setItem('lastImport', JSON.stringify(data));
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>Upload Excel</h1>
      <form onSubmit={onSubmit}>
        <label>Choose File
          <input type="file" name="file" accept=".xlsx,.xls" required />
        </label>
        <div style={{ marginTop: 12 }}>
          <button disabled={busy} type="submit">{busy ? 'Uploading…' : 'Upload & Import'}</button>
        </div>
      </form>
      {error && <p style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{error}</p>}
    </main>
  );
}

