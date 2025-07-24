export const dynamic = 'force-dynamic';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-white mb-4">404</h1>
                <p className="text-gray-400 text-xl mb-8">Page not found</p>
                <a
                    href="/"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300"
                >
                    Go Home
                </a>
            </div>
        </div>
    );
}
