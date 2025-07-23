'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="w-full max-w-md">
                <SignUp
                    appearance={{
                        elements: {
                            rootBox: "mx-auto",
                            card: "bg-gray-900 border border-gray-700",
                            headerTitle: "text-white",
                            headerSubtitle: "text-gray-300",
                            socialButtonsBlockButton: "bg-gray-800 border-gray-700 text-white hover:bg-gray-700",
                            formButtonPrimary: "bg-purple-600 hover:bg-purple-700",
                            formFieldInput: "bg-gray-800 border-gray-700 text-white",
                            formFieldLabel: "text-gray-300",
                            footerActionLink: "text-purple-400 hover:text-purple-300"
                        }
                    }}
                />
            </div>
        </div>
    );
}
