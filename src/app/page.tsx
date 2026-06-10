'use client';

import { SignInButton, SignedIn, SignedOut, SignOutButton, useUser } from '@/components/auth/supabase-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState, memo, useEffect, useRef } from 'react';
import {
  Heart, MessageCircle, Repeat2, BarChart2, Bookmark, ArrowBigUp, ArrowBigDown,
  Play, Search, ArrowRight, LogOut, Loader, X, Plus,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

/* ------------------------------------------------------------------ */
/* Ask bar, wired to /api/chat                                        */
/* ------------------------------------------------------------------ */
const AskBar = memo(() => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; sources?: Array<{ title: string; url?: string | null }> }>>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    const text = prompt;
    setMessages((m) => [...m, { id: `${Date.now()}`, role: 'user', text }]);
    setPrompt('');
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json().catch(() => ({}));
      let reply: string;
      if (res.ok && data.answer) {
        reply = data.answer;
      } else if (res.status === 401) {
        reply = 'Sign in to ask your own library.';
      } else {
        reply = data.error ? `Something went wrong: ${data.error}` : 'Something went wrong. Try again.';
      }
      setMessages((m) => [
        ...m,
        { id: `${Date.now() + 1}`, role: 'assistant', text: reply, sources: res.ok ? data.sources : undefined },
      ]);
    } catch {
      setMessages((m) => [...m, { id: `${Date.now() + 1}`, role: 'assistant', text: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Scroll only the chat panel itself; scrollIntoView would scroll the page.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="relative w-full">
      {open && messages.length > 0 && (
        <div ref={listRef} className="absolute bottom-full left-0 right-0 z-40 mb-3 max-h-80 overflow-y-auto border-[3px] border-ink bg-paper p-3 shadow-hard-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-hand text-2xl text-brand-coral">your knowledge, answered</span>
            <button onClick={() => setOpen(false)} className="border-2 border-ink bg-white p-0.5 shadow-hard-sm"><X size={14} /></button>
          </div>
          <div className="space-y-2">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] border-2 border-ink px-3 py-2 text-sm shadow-hard-sm ${
                  m.role === 'user' ? 'ml-auto bg-brand-yellow' : 'bg-white'
                }`}
              >
                <span className="whitespace-pre-wrap">{m.text}</span>
                {m.sources && m.sources.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {m.sources.map((s, i) =>
                      s.url ? (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-ink/30 bg-paper px-1.5 py-0.5 text-[11px] font-bold text-ink/60 transition hover:border-ink hover:text-ink hover:underline"
                        >
                          📌 {s.title} ↗
                        </a>
                      ) : (
                        <span key={i} className="border border-ink/30 bg-paper px-1.5 py-0.5 text-[11px] font-bold text-ink/60">
                          📌 {s.title}
                        </span>
                      )
                    )}
                  </span>
                )}
              </div>
            ))}
            {loading && <div className="w-fit border-2 border-ink bg-white px-3 py-2 text-sm shadow-hard-sm">thinking…</div>}
          </div>
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 border-[3px] border-ink bg-white p-2 shadow-hard">
        <Search size={20} className="ml-1 shrink-0" />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask anything you've saved…"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-base font-medium outline-none placeholder:text-ink/40"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="flex shrink-0 items-center gap-1 border-2 border-ink bg-brand-coral px-3 py-2 font-bold text-white shadow-hard-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-40"
        >
          {loading ? <Loader size={18} className="animate-spin" /> : <>Ask<ArrowRight size={16} /></>}
        </button>
      </form>
    </div>
  );
});
AskBar.displayName = 'AskBar';

/* ------------------------------------------------------------------ */
/* Realistic platform cards                                            */
/* ------------------------------------------------------------------ */
function XPostCard() {
  return (
    <div className="w-[270px] bg-white p-3.5 text-left">
      <div className="flex items-start gap-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand-blue text-sm font-black text-white">A</div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold">Anantesh G</p>
          <p className="text-[13px] text-ink/45">@AnanteshG · 2h</p>
        </div>
        <svg viewBox="0 0 24 24" className="ml-auto h-5 w-5 shrink-0 fill-ink"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      </div>
      <p className="mt-2.5 text-[15px] leading-snug">Reading is faster than listening. Doing is faster than watching. Save what matters, search it when you need it.</p>
      <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2.5 text-[12px] text-ink/45">
        <span className="flex items-center gap-1"><MessageCircle size={14} /> 420</span>
        <span className="flex items-center gap-1 text-brand-green"><Repeat2 size={15} /> 3.2K</span>
        <span className="flex items-center gap-1 text-brand-coral"><Heart size={14} fill="currentColor" /> 18K</span>
        <span className="flex items-center gap-1"><BarChart2 size={14} /> 1.2M</span>
        <Bookmark size={14} />
      </div>
    </div>
  );
}

function RedditPostCard() {
  return (
    <div className="w-[250px] bg-white p-3.5 text-left">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-brand-orange">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white"><path d="M14.5 15.41c.08.09.08.22 0 .31-.71.7-1.84.79-2.5.79s-1.79-.09-2.5-.79c-.08-.09-.08-.22 0-.31.09-.08.22-.08.31 0 .44.45 1.41.61 2.19.61s1.74-.16 2.19-.61c.09-.08.22-.08.31 0zm-4.34-2.04c0-.61-.5-1.1-1.11-1.1-.61 0-1.11.49-1.11 1.1s.5 1.11 1.11 1.11c.61 0 1.11-.5 1.11-1.11zm4.78-1.1c-.61 0-1.11.49-1.11 1.1s.5 1.11 1.11 1.11c.61 0 1.11-.5 1.11-1.11s-.5-1.1-1.11-1.1zM22 12c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2s10 4.48 10 10zm-4.97-1.34c-.36 0-.69.15-.93.38-.92-.62-2.16-1.02-3.54-1.07l.71-3.34 2.36.5c.03.6.52 1.08 1.13 1.08.62 0 1.13-.51 1.13-1.13s-.51-1.13-1.13-1.13c-.44 0-.82.26-1 .63l-2.63-.56c-.13-.03-.26.06-.29.19l-.8 3.75c-1.39.05-2.64.45-3.57 1.07a1.33 1.33 0 0 0-2.25.96c0 .54.32 1 .78 1.21-.02.13-.03.27-.03.41 0 2.08 2.42 3.77 5.4 3.77s5.4-1.69 5.4-3.77c0-.13-.01-.27-.03-.4.47-.21.79-.67.79-1.22 0-.73-.6-1.33-1.33-1.33z"/></svg>
        </div>
        <p className="text-[12px] font-bold">r/productivity <span className="font-normal text-ink/40">· 8h</span></p>
      </div>
      <p className="mt-2 text-[14px] font-bold leading-snug">My second brain finally works. Here&apos;s the setup</p>
      <div className="mt-2.5 flex items-center gap-2 text-[12px] font-semibold text-ink/60">
        <span className="flex items-center gap-0.5 border-2 border-ink bg-paper px-1.5 py-0.5"><ArrowBigUp size={15} className="text-brand-orange" fill="currentColor" /> 2.4K <ArrowBigDown size={15} /></span>
        <span className="flex items-center gap-1 border-2 border-ink bg-paper px-1.5 py-0.5"><MessageCircle size={13} /> 318</span>
      </div>
    </div>
  );
}

function YouTubeCard() {
  return (
    <div className="w-[240px] bg-white p-2.5 text-left">
      <div className="relative flex h-[110px] items-center justify-center border-2 border-ink bg-ink">
        <div className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#ff0000]">
          <Play size={20} className="text-white" fill="white" />
        </div>
        <span className="absolute bottom-1.5 right-1.5 bg-ink px-1 text-[11px] font-bold text-white">12:04</span>
      </div>
      <p className="mt-2 text-[13.5px] font-bold leading-snug">System Design in 20 Minutes</p>
      <p className="text-[12px] text-ink/45">Fireship · 1.1M views</p>
    </div>
  );
}

function StickyNote({ color, rot, children, className = '' }: { color: string; rot: number; children: React.ReactNode; className?: string }) {
  return (
    <div
      style={{ ['--rot' as string]: `${rot}deg`, transform: `rotate(${rot}deg)` }}
      className={`border-2 border-ink p-3.5 shadow-hard ${color} ${className}`}
    >
      <p className="font-hand text-[22px] leading-tight">{children}</p>
    </div>
  );
}

function Pinned({ children, rot = 0, decoration = 'pin', float = false, delay = 0, className = '' }: {
  children: React.ReactNode; rot?: number; decoration?: 'pin' | 'pin pin-blue' | 'pin pin-green' | 'tape'; float?: boolean; delay?: number; className?: string;
}) {
  return (
    <div
      style={{ ['--rot' as string]: `${rot}deg`, transform: `rotate(${rot}deg)`, animationDelay: `${delay}s` }}
      className={`border-[3px] border-ink shadow-hard-lg ${decoration} ${float ? 'animate-float' : ''} relative ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
const BENTO = [
  { title: 'Save anything', body: 'Tweets, Reddit threads, YouTube videos, articles, images, plain notes. One place for all of it.', color: 'bg-brand-yellow', span: 'md:col-span-3', emoji: '📌' },
  { title: 'Auto-tagged', body: 'AI summarizes & tags every save.', color: 'bg-brand-green text-white', span: 'md:col-span-2', emoji: '🏷️' },
  { title: 'Ask, don’t scroll', body: 'Semantic search answers questions from your own library. By meaning, not keywords.', color: 'bg-brand-coral text-white', span: 'md:col-span-2', emoji: '💬' },
  { title: 'A pinboard, not a list', body: 'Your saves live on a colorful wall you can actually scan.', color: 'bg-brand-blue text-white', span: 'md:col-span-3', emoji: '🧠' },
];

export default function Home() {
  const router = useRouter();
  const { user } = useUser();
  const [menu, setMenu] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <div className="border-2 border-ink bg-white p-1 shadow-hard-sm">
            <Image src="/assets/logo.svg" alt="Memoric" width={34} height={34} className="h-8 w-8 object-contain" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">Memoric<span className="text-brand-coral">.</span></span>
        </button>

        <div className="flex items-center gap-2.5">
          <SignedOut>
            <SignInButton>
              <button className="border-[3px] border-ink bg-brand-yellow px-4 py-2 font-extrabold shadow-hard transition hover:-translate-x-0.5 hover:-translate-y-0.5 sm:px-6">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => router.push('/space')}
              className="border-[3px] border-ink bg-brand-green px-4 py-2 font-extrabold text-white shadow-hard transition hover:-translate-x-0.5 hover:-translate-y-0.5 sm:px-6"
            >
              My board
            </button>
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="block h-11 w-11 overflow-hidden rounded-full border-[3px] border-ink bg-brand-purple shadow-hard-sm">
                {user?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.imageUrl} alt={user.firstName} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-extrabold text-white">{user?.firstName?.charAt(0).toUpperCase() ?? 'U'}</span>
                )}
              </button>
              {menu && (
                <div className="absolute right-0 z-50 mt-2 w-44 border-[3px] border-ink bg-white shadow-hard">
                  <SignOutButton>
                    <button className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-bold hover:bg-paper-2">
                      <LogOut size={16} /> Log out
                    </button>
                  </SignOutButton>
                </div>
              )}
            </div>
          </SignedIn>
        </div>
      </nav>

      {/* Hero: text left, card collage right */}
      <header className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-4 lg:pt-10">
        <div className="text-center lg:text-left">
          <span className="inline-block -rotate-2 border-2 border-ink bg-brand-pink px-3 py-1 text-sm font-extrabold shadow-hard-sm">
            🧠 your second brain, on a corkboard
          </span>
          <h1 className="mt-5 text-[2.75rem] font-extrabold leading-[0.95] tracking-tight sm:text-6xl xl:text-7xl">
            Save it.
            <br />
            Forget it.
            <br />
            <span className="font-hand text-brand-coral text-6xl sm:text-8xl">ask it later.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-lg font-medium text-ink/70 lg:mx-0">
            Pin tweets, videos and articles to a colorful board, then just <span className="scribble font-bold">ask</span> and get answers from everything you saved.
          </p>

          <div className="mt-7 flex max-w-xl flex-col gap-3 lg:max-w-lg">
            <AskBar />
            <SignedOut>
              <SignInButton>
                <button className="mx-auto flex w-fit items-center gap-2 border-[3px] border-ink bg-brand-blue px-6 py-3 text-lg font-extrabold text-white shadow-hard-lg transition hover:-translate-x-0.5 hover:-translate-y-0.5 lg:mx-0">
                  <Plus size={20} /> Start your board for free
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Collage: overlapping pinned cards, contained */}
        <div className="relative mx-auto h-[460px] w-full max-w-[480px] sm:h-[500px]">
          <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 sm:left-8 sm:translate-x-0">
            <Pinned rot={-5} float delay={0}><XPostCard /></Pinned>
          </div>
          <div className="absolute right-0 top-40 z-20 hidden sm:block">
            <Pinned rot={4} decoration="tape" float delay={1.1}><RedditPostCard /></Pinned>
          </div>
          <div className="absolute bottom-16 left-0 z-20 sm:bottom-10 sm:left-4">
            <Pinned rot={3} decoration="pin pin-blue" float delay={0.5}><YouTubeCard /></Pinned>
          </div>
          <div className="absolute -bottom-2 right-2 z-30 sm:bottom-2 sm:right-10">
            <StickyNote color="bg-brand-yellow" rot={-4} className="w-40">read this before the interview!!</StickyNote>
          </div>
        </div>
      </header>

      {/* Marquee: two identical halves; translateX(-50%) loops seamlessly */}
      <div className="overflow-hidden border-y-[3px] border-ink bg-ink py-2.5 text-paper">
        <div className="flex w-max animate-marquee whitespace-nowrap text-lg font-extrabold uppercase tracking-wider">
          {[0, 1].map((half) => (
            <span key={half} aria-hidden={half === 1} className="flex items-center">
              {Array.from({ length: 3 }).map((_, rep) => (
                <span key={rep} className="flex items-center gap-8 pr-8">
                  <span>🐦 Tweets</span><span className="text-brand-yellow">★</span><span>📺 YouTube</span><span className="text-brand-coral">★</span>
                  <span>👽 Reddit</span><span className="text-brand-green">★</span><span>📝 Notes</span><span className="text-brand-pink">★</span>
                  <span>🖼️ Images</span><span className="text-brand-blue">★</span><span>🔗 Any link</span><span className="text-brand-orange">★</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Bento */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
          Not another <span className="font-hand text-brand-purple text-5xl sm:text-6xl">boring</span> bookmark app
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-5">
          {BENTO.map((b, i) => (
            <div
              key={b.title}
              style={{ ['--rot' as string]: `${i % 2 === 0 ? -0.5 : 0.5}deg`, transform: `rotate(${i % 2 === 0 ? -0.5 : 0.5}deg)` }}
              className={`hover-lift border-[3px] border-ink p-6 shadow-hard ${b.color} ${b.span}`}
            >
              <div className="mb-2 text-4xl">{b.emoji}</div>
              <h3 className="text-2xl font-extrabold">{b.title}</h3>
              <p className="mt-1 font-medium opacity-80">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t-[3px] border-ink bg-brand-yellow">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 pt-14 pb-8 text-center sm:px-6">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Your brain, but it actually remembers.</h2>
          <SignedOut>
            <SignInButton>
              <button className="border-[3px] border-ink bg-brand-coral px-8 py-3 text-lg font-extrabold text-white shadow-hard-lg transition hover:-translate-x-1 hover:-translate-y-1">
                📌 Pin your first note
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <button
              onClick={() => router.push('/space')}
              className="border-[3px] border-ink bg-brand-coral px-8 py-3 text-lg font-extrabold text-white shadow-hard-lg transition hover:-translate-x-1 hover:-translate-y-1"
            >
              📌 Open your board
            </button>
          </SignedIn>
          <p className="font-hand text-2xl text-ink/60">made for people with too many tabs</p>
        </div>
        <div className="mx-auto flex max-w-6xl justify-end px-4 pb-5 sm:px-6">
          <a
            href="https://anantesh.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-ink/50 transition hover:text-ink hover:underline"
          >
            made by Anantesh ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
