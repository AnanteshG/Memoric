'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function AddContentPage() {
    useEffect(() => {
        // Redirect to the main space page since add-content functionality is integrated there
        redirect('/space');
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center">
            <div className="text-white text-center">
                <p>Redirecting to your space...</p>
            </div>
        </div>
    );
}