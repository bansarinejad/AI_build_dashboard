import { requireUser } from '@/lib/server-auth';

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <main style={{ maxWidth: 800, margin: '2rem auto' }}>
      <h1>Dashboard</h1>
      <p>Welcome, <strong>{user.username}</strong>! 🎉</p>
      <p>This page is protected. Next we’ll add the product charts and upload flow.</p>
      <form action="/api/auth/logout" method="post">
        <button type="submit" style={{ marginTop: 16 }}>Logout</button>
      </form>
    </main>
  );
}
