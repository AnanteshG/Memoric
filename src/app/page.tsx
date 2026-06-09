'use client';

import { SignInButton, SignedIn, SignedOut, SignOutButton, useUser } from '@/components/auth/supabase-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, useCallback, memo, useEffect, useRef } from 'react';
import {
  ChevronDown,
  LogOut,
  Bot,
  MessageSquare,
  X,
  User,
  Loader,
  Library,
  Search,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Hero chat demo — isolated state so typing doesn't re-render the page.
const SearchInput = memo(() => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      type: 'user' | 'assistant';
      content: string;
      timestamp: string;
      sources?: Array<{ title: string; type: string; id: string }>;
    }>
  >([]);
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
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsLoading(true);
    setShowChatHistory(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: data.answer,
          timestamp: new Date().toISOString(),
          sources: data.sources || [],
        },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'assistant' as const,
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="relative w-full">
      {/* Chat history overlay */}
      {showChatHistory && messages.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-4 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/5 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <MessageSquare size={16} className="text-violet-400" />
              Chat with your knowledge
            </h3>
            <button onClick={() => setShowChatHistory(false)} className="text-zinc-400 transition hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4 p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-xl p-3 ${
                    message.type === 'user' ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-100'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'assistant' && <Bot size={16} className="mt-0.5 shrink-0 text-violet-400" />}
                    {message.type === 'user' && <User size={16} className="mt-0.5 shrink-0 text-white" />}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 text-xs text-zinc-400">
                          <p className="font-medium">Sources:</p>
                          {message.sources.map((source, idx) => (
                            <span key={idx} className="mr-1 mt-1 inline-block rounded bg-white/10 px-2 py-1">
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
                <div className="max-w-[80%] rounded-xl bg-white/5 p-3 text-zinc-100">
                  <div className="flex items-center gap-2">
                    <Bot size={16} className="text-violet-400" />
                    <Loader size={16} className="animate-spin text-violet-400" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-3 shadow-lg backdrop-blur transition focus-within:border-violet-500/50 focus-within:shadow-violet-500/10 sm:px-5 sm:py-4"
      >
        <Search size={18} className="shrink-0 text-zinc-500" />
        <input
          type="text"
          value={prompt}
          onChange={handleInputChange}
          placeholder="Ask anything about your saved knowledge..."
          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none sm:text-base"
          autoComplete="off"
          spellCheck="false"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || isLoading}
          className="flex shrink-0 items-center justify-center rounded-xl bg-violet-600 p-2 text-white transition hover:bg-violet-500 disabled:opacity-40 sm:p-2.5"
        >
          {isLoading ? <Loader size={18} className="animate-spin" /> : <ArrowRight size={18} />}
        </button>
      </form>
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

const FEATURES = [
  {
    icon: Library,
    title: 'Save anything',
    desc: 'Links, tweets, YouTube videos, Reddit posts, notes, and images — all in one place.',
  },
  {
    icon: Sparkles,
    title: 'Auto-organized',
    desc: 'Every item is summarized and tagged automatically so your library stays tidy.',
  },
  {
    icon: MessageSquare,
    title: 'Chat with your data',
    desc: 'Ask questions in plain English. Semantic search finds answers by meaning, not keywords.',
  },
];

export default function Home() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { user } = useUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Subtle violet glow backdrop */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-10%] h-[500px] w-[800px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
      />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <button onClick={() => router.push('/')} className="flex items-center gap-2.5 transition hover:opacity-80">
          <Image src="/assets/Logo.png" alt="Memoric" width={36} height={36} className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-xl font-semibold tracking-tight">Memoric</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push('/how-it-works')}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
          >
            <Info size={15} />
            <span className="hidden sm:inline">How it works</span>
          </button>

          <SignedOut>
            <SignInButton>
              <button className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 sm:px-5">
                Sign in
                <ArrowRight size={15} />
              </button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <button
              onClick={() => router.push('/space')}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 sm:px-5"
            >
              My Space
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-2 py-1.5 transition hover:bg-white/5"
              >
                {user?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt={user.firstName} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-600 text-sm font-medium text-white">
                    {user?.firstName?.charAt(0).toUpperCase() ?? 'U'}
                  </div>
                )}
                <ChevronDown size={15} className="text-zinc-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-white/10 bg-zinc-900/95 shadow-lg backdrop-blur-md">
                  <div className="p-2">
                    <SignOutButton>
                      <button
                        onClick={() => setShowUserMenu(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
                      >
                        <LogOut size={16} />
                        <span>Log out</span>
                      </button>
                    </SignOutButton>
                  </div>
                </div>
              )}
            </div>
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
          <Sparkles size={13} className="text-violet-400" />
          AI-powered second brain
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Your knowledge,{' '}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            searchable
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Save links, tweets, videos, and notes — then ask questions and get answers from everything you&apos;ve stored.
        </p>

        <div className="mt-10 w-full max-w-2xl">
          <SearchInput />
          <SignedOut>
            <p className="mt-3 text-xs text-zinc-500">Sign in to start building your personal knowledge base.</p>
          </SignedOut>
        </div>

        {/* Features */}
        <div className="mt-20 grid w-full gap-4 pb-20 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/15">
                  <Icon size={18} className="text-violet-400" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
