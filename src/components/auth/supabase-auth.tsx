'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

// A Clerk-shaped user object so existing pages keep working with a simple
// import swap (user.firstName, user.imageUrl, user.primaryEmailAddress, ...).
export interface AppUser {
  id: string;
  firstName: string;
  fullName: string;
  imageUrl: string;
  email: string;
  primaryEmailAddress: { emailAddress: string };
}

function mapUser(u: User | null): AppUser | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as Record<string, string>;
  const fullName = meta.full_name || meta.name || '';
  const firstName = fullName.split(' ')[0] || u.email?.split('@')[0] || 'there';
  return {
    id: u.id,
    firstName,
    fullName,
    imageUrl: meta.avatar_url || meta.picture || '',
    email: u.email ?? '',
    primaryEmailAddress: { emailAddress: u.email ?? '' },
  };
}

interface AuthContextValue {
  user: AppUser | null;
  isLoaded: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(mapUser(data.user));
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(mapUser(session?.user ?? null));
      setIsLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoaded,
      async signInWithGoogle() {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      },
      async signOut() {
        await supabase.auth.signOut();
        window.location.href = '/';
      },
    }),
    [user, isLoaded, supabase]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <SupabaseAuthProvider>');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Drop-in replacements for the Clerk components the pages already use.
// ---------------------------------------------------------------------------

export function useUser() {
  const { user, isLoaded } = useAuth();
  return { isSignedIn: !!user, isLoaded, user };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useAuth();
  return isLoaded && user ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useAuth();
  return isLoaded && !user ? <>{children}</> : null;
}

export function SignInButton({ children }: { children?: ReactNode }) {
  const { signInWithGoogle } = useAuth();
  return (
    <span onClick={signInWithGoogle} style={{ cursor: 'pointer' }}>
      {children ?? <button>Sign in</button>}
    </span>
  );
}

export function SignOutButton({ children }: { children?: ReactNode }) {
  const { signOut } = useAuth();
  return (
    <span onClick={signOut} style={{ cursor: 'pointer' }}>
      {children ?? <button>Sign out</button>}
    </span>
  );
}

export function UserButton() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-gray-700"
        aria-label="Account menu"
      >
        {user.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.imageUrl} alt={user.firstName} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-medium text-white">
            {user.firstName.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
          <div className="px-2 py-1 text-sm text-gray-700">{user.email}</div>
          <button
            onClick={signOut}
            className="mt-1 w-full rounded px-2 py-1 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
