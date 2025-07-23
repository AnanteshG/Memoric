'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DotPattern } from '@/components/ui/dot-pattern';
import { ShineBorder } from '@/components/ui/shine-border';
import { useState, useCallback, memo } from 'react';

// Create a separate component for the search input to isolate its state
const SearchInput = memo(() => {
  const [prompt, setPrompt] = useState('');

  const handleGenerate = useCallback(() => {
    if (prompt.trim()) {
      console.log('Generating for:', prompt);
      // Lightweight feedback can be added here
    }
  }, [prompt]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  }, [handleGenerate]);

  return (
    <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-[calc(1rem-2px)] sm:rounded-[calc(1.5rem-2px)]">
      <div className="flex items-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-3 sm:py-4">
        <input
          type="text"
          value={prompt}
          onChange={handleInputChange}
          placeholder="Ask me anything about your stored knowledge..."
          className="flex-1 bg-transparent text-white placeholder-gray-400 text-sm sm:text-base lg:text-lg focus:outline-none font-normal"
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          className="p-2 sm:p-3 text-white hover:bg-white/10 transition-colors duration-200 rounded-lg sm:rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transform rotate-45 sm:w-5 sm:h-5"
          >
            <path
              d="M7 17L17 7M17 7H7M17 7V17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black relative overflow-hidden select-none">
      {/* Dot Pattern Overlay - Optimized for performance */}
      <DotPattern
        width={20}
        height={20}
        cx={2}
        cy={2}
        cr={1}
        glow={true}
        className="text-purple-400/50 sm:text-purple-400/70"
      />

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="relative w-12 h-12 sm:w-16 sm:h-16">
            <Image
              src="/assets/Logo.png"
              alt="Memoric Logo"
              width={64}
              height={64}
              className="rounded-lg"
            />
          </div>
          <span className="text-white text-xl sm:text-2xl lg:text-3xl font-semibold tracking-tight">Memoric</span>
        </div>

        <div className="flex items-center space-x-3 sm:space-x-6">
          <SignedOut>
            <SignInButton>
              <button className="bg-white text-black border border-gray-300 px-4 py-2 sm:px-8 lg:px-12 sm:py-2.5 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-medium shadow-lg hover:shadow-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 cursor-pointer">
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
                  <span className="font-medium">Sign In</span>
                </div>
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gradient-to-r from-purple-600/80 to-pink-600/80 backdrop-blur-md border border-purple-400/30 text-white px-4 py-2 sm:px-6 lg:px-8 sm:py-3 rounded-xl sm:rounded-2xl hover:from-purple-700/80 hover:to-pink-700/80 transition-all duration-300 text-sm sm:text-base font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              My Space
            </button>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl p-1">
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[75vh] sm:min-h-[80vh] px-4 sm:px-6 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent block sm:inline">
            AI Powered
          </span>
          <span className="text-white/80 sm:ml-4 font-medium block sm:inline">Second Brain</span>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-8 sm:mb-12 max-w-xl sm:max-w-2xl font-normal leading-relaxed px-2">
          Store, search, and interact with your digital content using AI.
          Upload documents, save tweets, add notes, and chat with your data.
        </p>

        {/* Input Section */}
        <div className="w-full max-w-sm sm:max-w-2xl lg:max-w-4xl relative p-[2px]">
          <div
            className="absolute inset-0 w-full h-full rounded-xl sm:rounded-2xl animate-gradient-move pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, #9333ea, #ec4899, #06b6d4, #9333ea)',
              backgroundSize: '300% 300%',
            }}
          />
          <SearchInput />
        </div>

        <p className="text-gray-400 text-xs sm:text-sm mt-3 sm:mt-4 font-normal px-4">
          Sign in to start building your personal knowledge base
        </p>
      </div>
    </div>
  );
}
