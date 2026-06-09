import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat } from "next/font/google";
import { SupabaseAuthProvider } from '@/components/auth/supabase-auth';
import "./globals.css";

export const dynamic = 'force-dynamic';

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const hand = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memoric | Save it. Ask it later.",
  description: "Save links, tweets, videos and notes to a colorful pinboard, then chat with everything you have stored.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${hand.variable} antialiased`}>
        <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
      </body>
    </html>
  );
}
