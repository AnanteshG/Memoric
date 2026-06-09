import { SignInButton, SignOutButton, useUser } from '@/components/auth/supabase-auth';

export function AuthButton() {
    const { isSignedIn, user } = useUser();

    if (isSignedIn && user) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">Hello, {user.firstName}!</span>
                <SignOutButton>
                    <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                        Sign Out
                    </button>
                </SignOutButton>
            </div>
        );
    }

    return (
        <SignInButton>
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                Sign In
            </button>
        </SignInButton>
    );
}
