'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DotPattern } from '@/components/ui/dot-pattern';
import {
    Brain,
    Upload,
    Search,
    MessageSquare,
    Zap,
    Shield,
    Smartphone,
    ArrowLeft,
    Play,
    Info,
    CheckCircle,
    Clock,
    Users,
    Target
} from 'lucide-react';

export default function HowItWorks() {
    const router = useRouter();

    const features = [
        {
            icon: Upload,
            title: "Upload & Store",
            description: "Upload documents, save Reddit posts, create notes, and store any digital content in your personal knowledge base.",
            benefit: "Never lose important information again"
        },
        {
            icon: Brain,
            title: "AI Processing",
            description: "Our advanced AI powered by Google Gemini analyzes and understands your content, creating intelligent connections.",
            benefit: "Understand your data like never before"
        },
        {
            icon: Search,
            title: "Smart Search",
            description: "Find exactly what you need with intelligent search that understands context, not just keywords.",
            benefit: "Save hours of searching through files"
        },
        {
            icon: MessageSquare,
            title: "Chat with Your Data",
            description: "Ask questions about your stored content and get instant, accurate answers with source references.",
            benefit: "Get insights from your knowledge instantly"
        }
    ];

    const benefits = [
        {
            icon: Clock,
            title: "Save 5+ Hours Weekly",
            description: "Stop wasting time searching through scattered files and documents"
        },
        {
            icon: Target,
            title: "Make Better Decisions",
            description: "Access all your knowledge instantly to make informed choices"
        },
        {
            icon: Users,
            title: "Never Forget Again",
            description: "Your AI assistant remembers everything so you don't have to"
        }
    ];

    return (
        <div className="min-h-screen bg-black relative overflow-hidden">
            {/* Dot Pattern Background */}
            <DotPattern
                width={12}
                height={12}
                cx={1}
                cy={1}
                cr={1}
                glow={true}
                className="text-purple-400/50 sm:text-purple-400/70"
            />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
                <div className="flex items-center space-x-3 sm:space-x-4">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                        <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                        <span className="text-sm font-medium hidden sm:inline">Back to Home</span>
                        <span className="text-sm font-medium sm:hidden">Back</span>
                    </button>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-4">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
                    >
                        <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16">
                            <Image
                                src="/assets/Logo.png"
                                alt="Memoric Logo"
                                width={64}
                                height={64}
                                className="rounded-lg"
                            />
                        </div>
                        <span className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight">Memoric</span>
                    </button>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-6">
                    <SignedOut>
                        <SignInButton>
                            <button className="bg-white text-black border border-gray-300 px-3 py-2 sm:px-6 md:px-8 lg:px-12 sm:py-2.5 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-medium shadow-lg hover:shadow-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="text-black sm:w-4 sm:h-4"
                                    >
                                        <path
                                            d="M15 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H15"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M10 17L15 12L10 7"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M15 12H3"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <span className="font-medium hidden sm:inline">Sign In</span>
                                </div>
                            </button>
                        </SignInButton>
                    </SignedOut>

                    <SignedIn>
                        <button
                            onClick={() => router.push('/space')}
                            className="bg-white/10 backdrop-blur-lg border border-white/20 text-white px-3 py-2 sm:px-6 lg:px-8 sm:py-2.5 rounded-xl sm:rounded-2xl lg:rounded-3xl text-sm sm:text-base font-medium hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-lg shadow-white/5"
                        >
                            <span className="font-medium hidden sm:inline">My Space</span>
                            <span className="font-medium sm:hidden">Space</span>
                        </button>
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-1">
                            <UserButton />
                        </div>
                    </SignedIn>
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20">

                {/* Hero Section */}
                <div className="text-center py-8 sm:py-12 md:py-20">
                    <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1.5 sm:px-4 sm:py-2 mb-4 sm:mb-6">
                        <Info size={14} className="text-purple-400 sm:w-4 sm:h-4" />
                        <span className="text-purple-300 text-xs sm:text-sm font-medium">How It Works</span>
                    </div>

                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-tight px-2">
                        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
                            From Chaos
                        </span>
                        <span className="text-white/90 block sm:inline sm:ml-4">
                            to Clarity
                        </span>
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-xs sm:max-w-2xl md:max-w-3xl mx-auto leading-relaxed px-4">
                        Transform your scattered digital content into an intelligent, searchable knowledge base.
                        Let AI help you remember everything and find anything instantly.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-4">
                        <div className="flex items-center space-x-2 text-green-400">
                            <CheckCircle size={16} className="sm:w-5 sm:h-5" />
                            <span className="text-xs sm:text-sm font-medium">No more lost files</span>
                        </div>
                        <div className="flex items-center space-x-2 text-blue-400">
                            <CheckCircle size={16} className="sm:w-5 sm:h-5" />
                            <span className="text-xs sm:text-sm font-medium">Instant AI answers</span>
                        </div>
                        <div className="flex items-center space-x-2 text-purple-400">
                            <CheckCircle size={16} className="sm:w-5 sm:h-5" />
                            <span className="text-xs sm:text-sm font-medium">Always organized</span>
                        </div>
                    </div>
                </div>

                {/* Demo Video Section */}
                <div className="mb-16 sm:mb-20">
                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-sm border border-purple-500/20">
                        <div className="text-center mb-6 sm:mb-8">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4">
                                See Memoric in Action
                            </h2>
                            <p className="text-gray-300 text-base sm:text-lg px-4">
                                Watch how easy it is to build your AI-powered second brain
                            </p>
                        </div>

                        {/* Video Placeholder */}
                        <div className="relative bg-gray-900/50 rounded-xl sm:rounded-2xl aspect-video flex items-center justify-center border border-gray-700/50">
                            <div className="text-center">
                                <div className="bg-white/10 backdrop-blur-sm rounded-full p-4 sm:p-6 mb-3 sm:mb-4 mx-auto w-fit">
                                    <Play size={24} className="text-white sm:w-8 sm:h-8" />
                                </div>
                                <p className="text-gray-400 text-base sm:text-lg font-medium">Demo Video Coming Soon</p>
                                <p className="text-gray-500 text-xs sm:text-sm mt-2 px-4">
                                    See how Memoric transforms your digital chaos into organized clarity
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* How It Works Steps */}
                <div className="mb-16 sm:mb-20">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
                            Simple, Yet Powerful
                        </h2>
                        <p className="text-gray-300 text-base sm:text-lg max-w-xl sm:max-w-2xl mx-auto px-4">
                            Four simple steps to unlock the full potential of your digital knowledge
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="relative group">
                                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 h-full hover:border-purple-500/30 transition-all duration-300 group-hover:bg-gray-900/70">
                                    <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg sm:rounded-xl p-2.5 sm:p-3 w-fit mb-3 sm:mb-4">
                                        <feature.icon size={20} className="text-purple-400 sm:w-6 sm:h-6" />
                                    </div>

                                    <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                                        <span className="bg-purple-500/20 text-purple-300 text-xs font-bold px-2 py-1 rounded-full">
                                            STEP {index + 1}
                                        </span>
                                    </div>

                                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                                        {feature.title}
                                    </h3>

                                    <p className="text-gray-300 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">
                                        {feature.description}
                                    </p>

                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 sm:p-3">
                                        <p className="text-green-400 text-xs sm:text-sm font-medium flex items-center">
                                            <Zap size={12} className="mr-2 sm:w-3.5 sm:h-3.5" />
                                            {feature.benefit}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Benefits Section */}
                <div className="mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                                "Your Life, Simplified"
                            </span>
                        </h2>
                        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                            Discover how Memoric transforms your daily workflow and boosts your productivity
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {benefits.map((benefit, index) => (
                            <div key={index} className="text-center">
                                <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-full p-4 w-fit mx-auto mb-4">
                                    <benefit.icon size={32} className="text-blue-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-3">
                                    {benefit.title}
                                </h3>
                                <p className="text-gray-300 leading-relaxed">
                                    {benefit.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features Showcase */}
                <div className="mb-20">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                                "Knowledge at Your Fingertips"
                            </span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl p-8 border border-purple-500/20">
                            <div className="flex items-center space-x-3 mb-6">
                                <Shield size={24} className="text-purple-400" />
                                <h3 className="text-xl font-semibold text-white">Secure & Private</h3>
                            </div>
                            <p className="text-gray-300 mb-4">
                                Your data is encrypted and secure. Only you have access to your personal knowledge base.
                            </p>
                            <ul className="space-y-2">
                                <li className="flex items-center space-x-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm">End-to-end encryption</span>
                                </li>
                                <li className="flex items-center space-x-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm">GDPR compliant</span>
                                </li>
                                <li className="flex items-center space-x-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm">No data sharing</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-2xl p-8 border border-blue-500/20">
                            <div className="flex items-center space-x-3 mb-6">
                                <Smartphone size={24} className="text-blue-400" />
                                <h3 className="text-xl font-semibold text-white">Always Accessible</h3>
                            </div>
                            <p className="text-gray-300 mb-4">
                                Access your knowledge base from anywhere, on any device. Your data syncs in real-time.
                            </p>
                            <ul className="space-y-2">
                                <li className="flex items-center space-x-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm">Mobile responsive</span>
                                </li>
                                <li className="flex items-center space-x-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm">Real-time sync</span>
                                </li>
                                <li className="flex items-center space-x-2 text-gray-300">
                                    <CheckCircle size={16} className="text-green-400" />
                                    <span className="text-sm">Offline capabilities</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
