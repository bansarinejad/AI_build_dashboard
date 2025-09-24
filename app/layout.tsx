// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cookies } from "next/headers";
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Data Visualisation Dashboard",
  description:
    "Visualise procurement, sales, and inventory across days; upload Excel and compare products.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Show Login/Logout based on presence of the session cookie
  const hasSession = Boolean((await cookies()).get("session")?.value);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header
          style={{
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <nav
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "10px 16px",
              display: "flex",
              gap: 16,
              alignItems: "center",
            }}
          >
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/upload">Upload</Link>
            <div style={{ marginLeft: "auto" }}>
              {!hasSession ? (
                <Link href="/login">Login</Link>
              ) : (
                <form action="/api/auth/logout" method="post" style={{ display: "inline" }}>
                  <button type="submit" style={{ background: "transparent", border: 0, cursor: "pointer" }}>
                    Logout
                  </button>
                </form>
              )}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
