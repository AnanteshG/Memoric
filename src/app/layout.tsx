import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SupabaseAuthProvider } from '@/components/auth/supabase-auth';
import "./globals.css";

export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memoric - AI-Powered Personal Knowledge Base",
  description: "Transform your digital content into a powerful queryable knowledge base with AI-powered insights.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
      </body>
    </html>
  );
}
