'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <p style={{ color:'crimson' }}>Dashboard error: {error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </main>
  );
}
