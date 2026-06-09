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
    Youtube,
    Search,
    Grid,
    List,
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
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Define the types for content items
interface ContentItem {
    id: string;
    type: 'tweet' | 'reddit' | 'image' | 'youtube' | 'text';
    title: string;
    content: string;
    summary?: string;
    thumbnail?: string;
    url?: string;
    createdAt: string;
    tags: string[];
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

export default function Space() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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

    // Fetch user statistics
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

    // Fetch content from API
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

    // Handle successful upload
    const handleUploadSuccess = useCallback(
        (newContent: ContentItem) => {
            setContentItems((prev) => [newContent, ...prev]);
            fetchContent(true);
            fetchUserStats();
        },
        [fetchContent, fetchUserStats]
    );

    // Handle delete content
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

    // Handle opening content
    const handleOpenContent = useCallback((item: ContentItem) => {
        const link = item.url || (item as unknown as { originalLink?: string }).originalLink;
        if (link) {
            window.open(link, '_blank');
        }
    }, []);

    const categories = [
        { id: 'all', name: 'All Content', icon: LayoutGrid, count: contentItems.length },
        { id: 'tweet', name: 'X Posts', icon: MessageSquare, count: contentItems.filter((i) => i.type === 'tweet').length },
        { id: 'reddit', name: 'Reddit', icon: Globe, count: contentItems.filter((i) => i.type === 'reddit').length },
        { id: 'youtube', name: 'YouTube', icon: Youtube, count: contentItems.filter((i) => i.type === 'youtube').length },
        { id: 'image', name: 'Images', icon: ImageIcon, count: contentItems.filter((i) => i.type === 'image').length },
        { id: 'text', name: 'Notes', icon: FileText, count: contentItems.filter((i) => i.type === 'text').length },
    ];

    const filteredItems = contentItems.filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.type === selectedCategory;
        const matchesSearch =
            searchQuery === '' ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'tweet': return MessageSquare;
            case 'reddit': return Globe;
            case 'youtube': return Youtube;
            case 'image': return ImageIcon;
            case 'text': return FileText;
            default: return FileText;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'tweet': return 'text-sky-400';
            case 'reddit': return 'text-orange-400';
            case 'youtube': return 'text-red-400';
            case 'image': return 'text-emerald-400';
            case 'text': return 'text-violet-400';
            default: return 'text-zinc-400';
        }
    };

    const stats = [
        { label: 'Total Content', value: userStats.totalContent, icon: BarChart3, accent: 'text-violet-400' },
        { label: 'AI Queries', value: userStats.aiQueries, icon: Zap, accent: 'text-amber-400' },
        { label: 'Time Saved', value: `${userStats.timeSavedHours}h`, icon: Clock, accent: 'text-emerald-400' },
        { label: 'Favorites', value: userStats.favorites, icon: Star, accent: 'text-rose-400' },
    ];

    const activeCategoryName = categories.find((c) => c.id === selectedCategory)?.name ?? 'All Content';

    return (
        <SignedIn>
            <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
                {/* ---------- Sidebar ---------- */}
                <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-black/60 p-4 lg:flex">
                    <button
                        onClick={() => router.push('/')}
                        className="mb-6 flex items-center gap-2.5 px-2"
                    >
                        <Image src="/assets/Logo.png" alt="Memoric" width={32} height={32} className="h-8 w-8 object-contain" />
                        <span className="text-lg font-semibold tracking-tight">Memoric</span>
                    </button>

                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500"
                    >
                        <Plus size={16} /> Add content
                    </button>

                    <nav className="flex flex-col gap-1">
                        <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Library</p>
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const active = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                        active
                                            ? 'bg-white/10 text-white'
                                            : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                    }`}
                                >
                                    <Icon size={16} className={active ? 'text-violet-400' : ''} />
                                    <span className="flex-1 text-left">{cat.name}</span>
                                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">{cat.count}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* ---------- Main ---------- */}
                <main className="flex-1 overflow-x-hidden">
                    {/* Top bar */}
                    <header className="sticky top-0 z-10 border-b border-white/5 bg-zinc-950/80 backdrop-blur">
                        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
                            <div className="mr-auto">
                                <h1 className="text-xl font-semibold tracking-tight">Your Space</h1>
                                <p className="text-sm text-zinc-500">Store, organize, and chat with your content</p>
                            </div>

                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search your content..."
                                    className="w-56 rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-violet-500/50 focus:bg-white/10"
                                />
                            </div>

                            <button
                                onClick={() => fetchContent(true)}
                                disabled={isRefreshing}
                                className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                                title="Refresh"
                            >
                                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                            </button>

                            <div className="flex items-center rounded-lg border border-white/10 p-0.5">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`rounded-md p-1.5 transition ${viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`rounded-md p-1.5 transition ${viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    <List size={16} />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 lg:hidden"
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>
                    </header>

                    <div className="px-5 py-6">
                        {/* Stats */}
                        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {stats.map((s) => {
                                const Icon = s.icon;
                                return (
                                    <div
                                        key={s.label}
                                        className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/10"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-zinc-500">{s.label}</span>
                                            <Icon size={16} className={s.accent} />
                                        </div>
                                        <p className="mt-2 text-2xl font-semibold">{s.value}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Content header */}
                        <div className="mb-4 flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{activeCategoryName}</h2>
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">{filteredItems.length}</span>
                        </div>

                        {/* States */}
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                                <Loader className="mb-3 animate-spin" size={28} />
                                <p>Loading your content...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-24 text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
                                    <Plus className="text-violet-400" size={24} />
                                </div>
                                <h3 className="text-lg font-medium">Nothing here yet</h3>
                                <p className="mt-1 max-w-sm text-sm text-zinc-500">
                                    {searchQuery
                                        ? 'No content matches your search.'
                                        : 'Save your first link, note, or post to start building your second brain.'}
                                </p>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="mt-5 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
                                >
                                    <Plus size={16} /> Add content
                                </button>
                            </div>
                        ) : (
                            <div
                                className={
                                    viewMode === 'grid'
                                        ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
                                        : 'flex flex-col gap-3'
                                }
                            >
                                {filteredItems.map((item) => {
                                    if (item.type === 'tweet') {
                                        return (
                                            <XCard
                                                key={item.id}
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
                                        );
                                    }

                                    const TypeIcon = getTypeIcon(item.type);
                                    return (
                                        <article
                                            key={item.id}
                                            onClick={() => handleOpenContent(item)}
                                            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] p-4 transition hover:border-white/15 hover:bg-white/[0.06]"
                                        >
                                            {item.thumbnail && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={item.thumbnail}
                                                    alt={item.title}
                                                    className="mb-3 h-36 w-full rounded-lg object-cover"
                                                />
                                            )}

                                            <div className="mb-2 flex items-center gap-2">
                                                <span className={`flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1 text-xs ${getTypeColor(item.type)}`}>
                                                    <TypeIcon size={12} />
                                                    {item.platform || item.type}
                                                </span>
                                                <span className="ml-auto text-xs text-zinc-500">
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            <h3 className="line-clamp-2 font-semibold text-zinc-100">{item.title}</h3>
                                            {(item.summary || item.content) && (
                                                <p className="mt-1 line-clamp-3 text-sm text-zinc-400">
                                                    {item.summary || item.content}
                                                </p>
                                            )}

                                            {item.tags?.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {item.tags.slice(0, 3).map((tag, i) => (
                                                        <span key={i} className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="mt-4 flex items-center gap-2 pt-3">
                                                {item.url && (
                                                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                                                        <ExternalLink size={12} /> Open
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteContent(item.id);
                                                    }}
                                                    className="ml-auto rounded-md p-1.5 text-zinc-500 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>
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
