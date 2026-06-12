'use client';

import { SignedIn } from '@/components/auth/supabase-auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import UploadModal from '@/components/pages/UploadModal';
import { XCard } from '@/components/ui/XCard';
import { useState, useCallback, useEffect } from 'react';
import {
    FileText,
    Image as ImageIcon,
    MessageSquare,
    Globe,
    Github,
    Link2,
    Youtube,
    Search,
    Plus,
    Zap,
    Clock,
    Star,
    Loader,
    RefreshCw,
    Trash2,
    ExternalLink,
    BarChart3,
    LayoutGrid,
    Play,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ContentItem {
    id: string;
    type: 'tweet' | 'reddit' | 'image' | 'youtube' | 'text' | 'github' | 'website';
    title: string;
    content: string;
    summary?: string;
    thumbnail?: string;
    url?: string;
    createdAt: string;
    tags: string[];
    userNote?: string;
    size?: string;
    platform?: string;
    author?: string;
    metrics?: {
        likes: number;
        views: number;
        comments: number;
        score: number;
    };
    tweetData?: {
        id: string;
        text: string;
        username: string;
        handle: string;
        timestamp: string;
        metrics: {
            likes: number;
            retweets: number;
            replies: number;
            views?: number;
        };
        images: string[];
        url: string;
    };
}

/* Deterministic pseudo-random rotation per card position */
const ROTS = [-2.5, 1.5, -1, 2.5, -1.8, 1, -3, 2];
const PINS = ['pin', 'pin pin-blue', 'tape', 'pin pin-green', 'tape', 'pin'];

// Tags are real hashtags now; drop legacy placeholders ("tag1") and bucket-name
// tags ("reddit", "youtube"…) still present on rows saved before that change.
const BUCKET_NAMES = new Set(['tweet', 'reddit', 'image', 'youtube', 'text', 'github', 'website', 'note', 'x', 'document']);
function realTags(tags: string[] | undefined): string[] {
    return (tags ?? []).filter((t) => t && !/^tag\d+$/i.test(t) && !BUCKET_NAMES.has(t.toLowerCase()));
}

export default function Board() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [contentItems, setContentItems] = useState<ContentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [userStats, setUserStats] = useState({
        totalContent: 0,
        aiQueries: 0,
        timeSavedHours: '0.0',
        favorites: 0,
    });

    const fetchUserStats = useCallback(async () => {
        try {
            const response = await fetch('/api/user/stats');
            if (response.ok) {
                const data = await response.json();
                setUserStats(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        }
    }, []);

    const fetchContent = useCallback(
        async (refresh = false) => {
            if (refresh) setIsRefreshing(true);
            else setIsLoading(true);

            try {
                const params = new URLSearchParams();
                if (selectedCategory !== 'all') params.append('type', selectedCategory);
                if (searchQuery) params.append('search', searchQuery);

                const response = await fetch(`/api/content?${params}`);
                if (response.ok) {
                    const data = await response.json();
                    setContentItems(data.data || []);
                }
            } catch (error) {
                console.error('Failed to fetch content:', error);
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        },
        [selectedCategory, searchQuery]
    );

    useEffect(() => {
        fetchContent();
        fetchUserStats();
    }, [fetchContent, fetchUserStats]);

    const handleUploadSuccess = useCallback(
        (newContent: unknown) => {
            setContentItems((prev) => [newContent as ContentItem, ...prev]);
            fetchContent(true);
            fetchUserStats();
            // AI summary + tags are generated in the background after the save;
            // refresh once more to pull them in.
            setTimeout(() => fetchContent(true), 8000);
        },
        [fetchContent, fetchUserStats]
    );

    const handleDeleteContent = useCallback(
        async (itemId: string) => {
            try {
                const response = await fetch(`/api/content/${itemId}`, { method: 'DELETE' });
                if (response.ok) {
                    setContentItems((prev) => prev.filter((item) => item.id !== itemId));
                    fetchUserStats();
                } else {
                    console.error('Failed to delete content');
                }
            } catch (error) {
                console.error('Error deleting content:', error);
            }
        },
        [fetchUserStats]
    );

    const handleOpenContent = useCallback((item: ContentItem) => {
        const link = item.url || (item as unknown as { originalLink?: string }).originalLink;
        if (link) {
            window.open(link, '_blank');
        }
    }, []);

    // Repos saved before migration 0002 are stored as website+GitHub.
    const inBucket = (item: ContentItem, bucket: string) => {
        const isGithub = item.type === 'github' || item.platform === 'GitHub';
        if (bucket === 'github') return isGithub;
        if (bucket === 'website') return item.type === 'website' && !isGithub;
        return item.type === bucket;
    };

    const categories = [
        { id: 'all', name: 'Everything', icon: LayoutGrid, color: 'bg-ink text-paper', count: contentItems.length },
        { id: 'tweet', name: 'X posts', icon: MessageSquare, color: 'bg-brand-blue text-white', count: contentItems.filter((i) => inBucket(i, 'tweet')).length },
        { id: 'reddit', name: 'Reddit', icon: Globe, color: 'bg-brand-orange text-white', count: contentItems.filter((i) => inBucket(i, 'reddit')).length },
        { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-brand-coral text-white', count: contentItems.filter((i) => inBucket(i, 'youtube')).length },
        { id: 'github', name: 'GitHub', icon: Github, color: 'bg-ink text-paper', count: contentItems.filter((i) => inBucket(i, 'github')).length },
        { id: 'website', name: 'Links', icon: Link2, color: 'bg-brand-purple text-white', count: contentItems.filter((i) => inBucket(i, 'website')).length },
        { id: 'image', name: 'Images', icon: ImageIcon, color: 'bg-brand-green text-white', count: contentItems.filter((i) => inBucket(i, 'image')).length },
        { id: 'text', name: 'Notes', icon: FileText, color: 'bg-brand-yellow', count: contentItems.filter((i) => inBucket(i, 'text')).length },
    ];

    const filteredItems = contentItems.filter((item) => {
        const matchesCategory = selectedCategory === 'all' || inBucket(item, selectedCategory);
        const matchesSearch =
            searchQuery === '' ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const stats = [
        { label: 'pins on board', value: userStats.totalContent, icon: BarChart3, color: 'bg-brand-yellow', rot: -2 },
        { label: 'questions asked', value: userStats.aiQueries, icon: Zap, color: 'bg-brand-pink', rot: 1.5 },
        { label: 'hours saved', value: `${userStats.timeSavedHours}`, icon: Clock, color: 'bg-brand-green text-white', rot: -1 },
        { label: 'favorites', value: userStats.favorites, icon: Star, color: 'bg-brand-blue text-white', rot: 2 },
    ];

    return (
        <SignedIn>
            <div className="min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-paper/95 backdrop-blur">
                    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
                        <button onClick={() => router.push('/')} className="flex items-center gap-2">
                            <div className="border-2 border-ink bg-white p-0.5 shadow-hard-sm">
                                <Image src="/assets/logo.svg" alt="Memoric" width={30} height={30} className="h-7 w-7 object-contain" />
                            </div>
                            <span className="hidden text-xl font-extrabold tracking-tight sm:inline">
                                Memoric<span className="text-brand-coral">.</span>
                            </span>
                        </button>

                        <div className="order-3 flex w-full items-center gap-2 border-[3px] border-ink bg-white px-3 py-1.5 shadow-hard-sm sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
                            <Search size={16} className="shrink-0 text-ink/50" />
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search your board…"
                                className="min-w-0 flex-1 bg-transparent py-1 text-sm font-medium outline-none placeholder:text-ink/40"
                            />
                        </div>

                        <button
                            onClick={() => fetchContent(true)}
                            disabled={isRefreshing}
                            className="ml-auto border-2 border-ink bg-white p-2 shadow-hard-sm transition hover:-translate-y-0.5 disabled:opacity-50 sm:ml-0"
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-1.5 border-[3px] border-ink bg-brand-coral px-4 py-1.5 font-extrabold text-white shadow-hard transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                        >
                            <Plus size={18} /> Pin it
                        </button>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                    {/* Stats as sticky notes */}
                    <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {stats.map((s) => {
                            const Icon = s.icon;
                            return (
                                <div
                                    key={s.label}
                                    style={{ transform: `rotate(${s.rot}deg)` }}
                                    className={`border-[3px] border-ink p-3.5 shadow-hard ${s.color}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-3xl font-extrabold">{s.value}</p>
                                        <Icon size={20} />
                                    </div>
                                    <p className="font-hand text-xl leading-none opacity-80">{s.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Category tabs */}
                    <div className="mb-6 flex flex-wrap items-center gap-2.5">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const active = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-1.5 border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 ${
                                        active ? `${cat.color} shadow-hard-sm -translate-y-0.5` : 'bg-white'
                                    }`}
                                >
                                    <Icon size={14} />
                                    {cat.name}
                                    <span className={`ml-0.5 text-xs ${active ? 'opacity-80' : 'text-ink/40'}`}>{cat.count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Board */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="border-[3px] border-ink bg-brand-yellow p-4 shadow-hard">
                                <Loader className="animate-spin" size={28} />
                            </div>
                            <p className="mt-4 font-hand text-2xl">unrolling your board…</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="mx-auto flex max-w-md flex-col items-center border-[3px] border-dashed border-ink/40 px-6 py-20 text-center">
                            <div className="rotate-[-3deg] border-[3px] border-ink bg-brand-yellow p-5 shadow-hard">
                                <p className="font-hand text-3xl">nothing pinned yet!</p>
                            </div>
                            <p className="mt-6 font-medium text-ink/60">
                                {searchQuery ? 'No pins match your search.' : 'Save your first link, note or post and it shows up here.'}
                            </p>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="mt-5 flex items-center gap-2 border-[3px] border-ink bg-brand-coral px-5 py-2.5 font-extrabold text-white shadow-hard transition hover:-translate-x-0.5 hover:-translate-y-0.5"
                            >
                                <Plus size={18} /> Pin something
                            </button>
                        </div>
                    ) : (
                        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
                            {filteredItems.map((item, idx) => {
                                const rot = ROTS[idx % ROTS.length];
                                const pinCls = PINS[idx % PINS.length];

                                if (item.type === 'tweet') {
                                    return (
                                        <div
                                            key={item.id}
                                            style={{ transform: `rotate(${rot}deg)` }}
                                            className={`relative mb-6 break-inside-avoid border-[3px] border-ink shadow-hard ${pinCls}`}
                                        >
                                            <XCard
                                                id={item.id}
                                                title={item.title}
                                                tweetData={item.tweetData}
                                                url={item.url}
                                                createdAt={item.createdAt}
                                                tags={item.tags}
                                                onDelete={() => handleDeleteContent(item.id)}
                                                onTitleChange={() => {}}
                                                onClick={() => handleOpenContent(item)}
                                            />
                                        </div>
                                    );
                                }

                                const isNote = item.type === 'text';
                                const noteColors = ['bg-brand-yellow', 'bg-brand-pink', 'bg-brand-green text-white'];
                                const noteColor = noteColors[idx % noteColors.length];

                                return (
                                    <article
                                        key={item.id}
                                        style={{ ['--rot' as string]: `${rot}deg`, transform: `rotate(${rot}deg)` }}
                                        onClick={() => handleOpenContent(item)}
                                        className={`hover-lift group relative mb-6 break-inside-avoid cursor-pointer border-[3px] border-ink p-4 shadow-hard ${pinCls} ${
                                            isNote ? noteColor : 'bg-white'
                                        }`}
                                    >
                                        {/* Type strip for link content; delete sits top-right on every card */}
                                        {!isNote && (
                                            <div className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide">
                                                {item.type === 'youtube' && <span className="flex items-center gap-1 bg-brand-coral px-1.5 py-0.5 text-white"><Play size={11} fill="white" /> YouTube</span>}
                                                {item.type === 'reddit' && <span className="flex items-center gap-1 bg-brand-orange px-1.5 py-0.5 text-white"><Globe size={11} /> Reddit</span>}
                                                {item.type === 'image' && <span className="flex items-center gap-1 bg-brand-green px-1.5 py-0.5 text-white"><ImageIcon size={11} /> Image</span>}
                                                {inBucket(item, 'github') && <span className="flex items-center gap-1 bg-ink px-1.5 py-0.5 text-paper"><Github size={11} /> GitHub</span>}
                                                {inBucket(item, 'website') && <span className="flex items-center gap-1 bg-brand-purple px-1.5 py-0.5 text-white"><Link2 size={11} /> Link</span>}
                                                <span className="ml-auto font-medium normal-case text-ink/40">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteContent(item.id);
                                                    }}
                                                    className="p-0.5 text-ink/35 opacity-0 transition hover:text-brand-coral group-hover:opacity-100"
                                                    title="Unpin"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        {isNote && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteContent(item.id);
                                                }}
                                                className="absolute right-2 top-2 z-10 border-2 border-ink bg-white p-1 text-ink opacity-0 shadow-hard-sm transition hover:bg-brand-coral hover:text-white group-hover:opacity-100"
                                                title="Unpin"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}

                                        {item.thumbnail && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.thumbnail} alt={item.title} className="mb-3 w-full border-2 border-ink object-cover" />
                                        )}

                                        {isNote ? (
                                            <>
                                                <h3 className="font-hand text-3xl leading-none">{item.title}</h3>
                                                {item.content?.trim() && (
                                                    <p className="mt-2 line-clamp-5 font-hand text-xl leading-snug opacity-80">
                                                        {item.content}
                                                    </p>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="line-clamp-2 text-[17px] font-extrabold leading-snug">{item.title}</h3>
                                                {item.summary?.trim() && (
                                                    <p className="mt-1.5 line-clamp-3 text-sm font-medium text-ink/60">
                                                        {item.summary}
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {/* The user's own note, as a taped sticky annotation */}
                                        {!isNote && item.userNote && (
                                            <div className="relative mt-3 -rotate-1 border-2 border-ink bg-brand-yellow px-3 pb-2 pt-3 shadow-hard-sm">
                                                <span className="absolute -top-2 left-1/2 h-3.5 w-12 -translate-x-1/2 -rotate-2 border border-ink/20 bg-white/60" />
                                                <span className="font-hand text-base leading-none text-ink/50">my note</span>
                                                <p className="mt-0.5 line-clamp-4 font-hand text-xl leading-snug text-ink">
                                                    {item.userNote}
                                                </p>
                                            </div>
                                        )}

                                        {realTags(item.tags).length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {realTags(item.tags).slice(0, 3).map((tag, i) => (
                                                    <span key={i} className={`border-2 border-ink px-1.5 py-0.5 text-[11px] font-bold ${isNote ? 'bg-white/60 text-ink' : 'bg-paper'}`}>
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {item.url && (
                                            <div className="mt-3 flex items-center">
                                                <span className={`flex items-center gap-1 text-xs font-bold ${isNote ? 'opacity-60' : 'text-ink/40'}`}>
                                                    <ExternalLink size={12} /> open
                                                </span>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </main>

                <UploadModal
                    isOpen={showUploadModal}
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={handleUploadSuccess}
                />
            </div>
        </SignedIn>
    );
}
