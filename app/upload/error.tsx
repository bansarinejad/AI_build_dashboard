'use client';
export default function Error({ error }: { error: Error & { digest?: string } }) {
  return <main><p style={{ color:'crimson' }}>Something went wrong: {error.message}</p></main>;
}
