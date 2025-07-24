'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DotPattern } from '@/components/ui/dot-pattern';
import { ShineBorder } from '@/components/ui/shine-border';
import { useState, useCallback, memo, useEffect, useRef } from 'react';
import { ChevronDown, Settings, LogOut, Bot, MessageSquare, X, User, Loader } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Create a separate component for the search input to isolate its state
const SearchInput = memo(() => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sources?: Array<{ title: string; type: string; id: string; }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: prompt,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);
    setShowChatHistory(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: data.response,
        timestamp: new Date().toISOString(),
        sources: data.sources || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = useCallback(() => {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    handleSubmit(event as any);
  }, [prompt, isLoading]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerate();
    }
  }, [handleGenerate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="relative w-full">
      {/* Chat History Overlay */}
      {showChatHistory && messages.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-4 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl max-h-96 overflow-y-auto shadow-2xl z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
            <h3 className="text-white font-semibold flex items-center space-x-2">
              <MessageSquare size={16} />
              <span>Chat with your Knowledge</span>
            </h3>
            <button
              onClick={() => setShowChatHistory(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${message.type === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-100'
                  }`}>
                  <div className="flex items-start space-x-2">
                    {message.type === 'assistant' && <Bot size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />}
                    {message.type === 'user' && <User size={16} className="text-white mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400">
                          <p className="font-medium">Sources:</p>
                          {message.sources.map((source, idx) => (
                            <span key={idx} className="inline-block bg-gray-700 rounded px-2 py-1 mr-1 mt-1">
                              {source.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 text-gray-100 rounded-lg p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <Bot size={16} className="text-purple-400" />
                    <Loader size={16} className="animate-spin text-purple-400" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Main Search Input */}
      <div className="relative bg-gray-900/95 backdrop-blur-sm rounded-[calc(1rem-2px)] sm:rounded-[calc(1.5rem-2px)]">
        <form onSubmit={handleSubmit} className="flex items-center space-x-2 sm:space-x-3 px-4 sm:px-6 py-3 sm:py-4">
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
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="p-2 sm:p-3 text-white hover:bg-white/10 transition-colors duration-200 rounded-lg sm:rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isLoading ? (
              <Loader size={16} className="animate-spin sm:w-5 sm:h-5" />
            ) : (
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
            )}
          </button>
        </form>
      </div>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export default function Home() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Redirect authenticated users to /space
  useEffect(() => {
    // This will be handled by middleware, but we can also do client-side redirect
    // The middleware approach is better for performance
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden select-none">
      {/* Dot Pattern Overlay - Optimized for performance */}
      <DotPattern
        width={12}
        height={12}
        cx={1}
        cy={1}
        cr={1}
        glow={true}
        className="text-purple-400/50 sm:text-purple-400/70"
      />

      {/* Top Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
          >
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
          </button>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-6">
          <SignedOut>
            <button
              onClick={() => router.push('/how-it-works')}
              className="bg-white/10 backdrop-blur-lg border border-white/20 text-white px-3 py-2 sm:px-6 lg:px-8 sm:py-2.5 rounded-xl sm:rounded-2xl lg:rounded-3xl text-sm sm:text-base font-medium hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-lg shadow-white/5"
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white sm:w-4 sm:h-4"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 16V12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 8H12.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden sm:inline font-medium">How It Works</span>
              </div>
            </button>

            <SignInButton>
              <button className="bg-white text-black border border-gray-300 px-4 py-2 sm:px-6 md:px-8 lg:px-12 sm:py-2.5 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-medium shadow-lg hover:shadow-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 cursor-pointer">
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
              onClick={() => router.push('/how-it-works')}
              className="bg-white/10 backdrop-blur-lg border border-white/20 text-white px-3 py-2 sm:px-6 lg:px-8 sm:py-2.5 rounded-xl sm:rounded-2xl lg:rounded-3xl text-sm sm:text-base font-medium hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 cursor-pointer shadow-lg shadow-white/5"
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white sm:w-4 sm:h-4"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 16V12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 8H12.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="hidden sm:inline font-medium">How It Works</span>
              </div>
            </button>

            <button
              onClick={() => router.push('/space')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400 px-4 py-2 sm:px-6 md:px-8 lg:px-12 sm:py-2.5 rounded-2xl sm:rounded-3xl text-sm sm:text-base font-medium shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-pink-700 hover:border-purple-300 transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <div className="flex items-center space-x-1 sm:space-x-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white sm:w-4 sm:h-4"
                >
                  <path
                    d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 12H16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 8H12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-medium hidden sm:inline">My Space</span>
                <span className="font-medium sm:hidden">Space</span>
              </div>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 hover:bg-white/20 transition-all duration-200"
              >
                <UserButton />
                <ChevronDown size={16} className="text-white" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-xl shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/space');
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    >
                      <Settings size={16} />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        // Clerk handles logout automatically
                        window.location.href = '/';
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
                    >
                      <LogOut size={16} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
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
