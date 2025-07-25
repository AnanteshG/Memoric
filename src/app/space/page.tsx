'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DotPattern } from '@/components/ui/dot-pattern';
import UploadModal from '@/components/pages/UploadModal';
import PdfPreview from '@/components/ui/PdfPreview';
import { useState, useCallback, useEffect } from 'react';
import {
    Upload,
    FileText,
    Image as ImageIcon,
    MessageSquare,
    Globe,
    Youtube,
    Brain,
    Search,
    Grid,
    List,
    Filter,
    Plus,
    Zap,
    Clock,
    Star,
    Eye,
    Download,
    Share,
    Loader,
    RefreshCw,
    Trash2,
    Heart,
    X,
    MoreHorizontal,
    ExternalLink,
    Edit3,
    Repeat2,
    BarChart3,
    CheckCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Define the types for content items
interface ContentItem {
    id: string;
    type: 'tweet' | 'reddit' | 'image' | 'youtube' | 'text' | 'document';
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
    // X (formerly Twitter) specific data
    tweetData?: {
        username: string;
        handle: string;
        verified: boolean;
        profileImage: string;
        tweetText: string;
        timestamp: string;
        replies: number;
        retweets: number;
        likes: number;
        views?: number;
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
        favorites: 0
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
    const fetchContent = useCallback(async (refresh = false) => {
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
    }, [selectedCategory, searchQuery]);

    useEffect(() => {
        fetchContent();
        fetchUserStats();
    }, [fetchContent, fetchUserStats]);

    // Handle successful upload
    const handleUploadSuccess = useCallback((newContent: any) => {
        setContentItems(prev => [newContent, ...prev]);
        fetchContent(true); // Refresh to get the latest data
        fetchUserStats(); // Refresh stats
    }, [fetchContent, fetchUserStats]);

    // Handle delete content
    const handleDeleteContent = useCallback(async (itemId: string) => {
        try {
            const response = await fetch(`/api/content/${itemId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                // Remove item from local state immediately for instant feedback
                setContentItems(prev => prev.filter(item => item.id !== itemId));
                // Refresh stats to reflect the change
                fetchUserStats();
            } else {
                console.error('Failed to delete content');
                // You might want to show a toast notification here
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            // You might want to show an error toast notification here
        }
    }, [fetchUserStats]);

    const categories = [
        { id: 'all', name: 'All Content', icon: Grid, count: contentItems.length },
        { id: 'document', name: 'Documents', icon: FileText, count: contentItems.filter(item => item.type === 'document').length },
        { id: 'tweet', name: 'X Posts', icon: MessageSquare, count: contentItems.filter(item => item.type === 'tweet').length },
        { id: 'reddit', name: 'Reddit', icon: Globe, count: contentItems.filter(item => item.type === 'reddit').length },
        { id: 'youtube', name: 'YouTube', icon: Youtube, count: contentItems.filter(item => item.type === 'youtube').length },
        { id: 'image', name: 'Images', icon: ImageIcon, count: contentItems.filter(item => item.type === 'image').length },
        { id: 'text', name: 'Notes', icon: FileText, count: contentItems.filter(item => item.type === 'text').length }
    ];

    const uploadOptions = [
        { id: 'document', name: 'Upload Document', icon: FileText, description: 'PDF, DOCX, TXT files', color: 'from-blue-500 to-cyan-500' },
        { id: 'tweet', name: 'Save X Post', icon: MessageSquare, description: 'X URLs or screenshots', color: 'from-sky-500 to-blue-500' },
        { id: 'reddit', name: 'Save Reddit Post', icon: Globe, description: 'Reddit post URLs', color: 'from-orange-500 to-red-500' },
        { id: 'youtube', name: 'Save YouTube Video', icon: Youtube, description: 'YouTube video URLs', color: 'from-red-500 to-pink-500' },
        { id: 'image', name: 'Upload Image', icon: ImageIcon, description: 'JPG, PNG, GIF files', color: 'from-green-500 to-emerald-500' },
        { id: 'text', name: 'Create Note', icon: FileText, description: 'Text notes and ideas', color: 'from-purple-500 to-violet-500' }
    ];

    const filteredItems = contentItems.filter(item => {
        const matchesCategory = selectedCategory === 'all' || item.type === selectedCategory;
        const matchesSearch = searchQuery === '' ||
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'document': return FileText;
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
            case 'document': return 'text-blue-400';
            case 'tweet': return 'text-sky-400';
            case 'reddit': return 'text-orange-400';
            case 'youtube': return 'text-red-400';
            case 'image': return 'text-green-400';
            case 'text': return 'text-purple-400';
            default: return 'text-gray-400';
        }
    };

    const handleUpload = useCallback(() => {
        setShowUploadModal(true);
    }, []);

    return (
        <SignedIn>
            <div className="min-h-screen bg-black relative overflow-hidden">
                {/* Dot Pattern Background */}
                <DotPattern
                    width={12}
                    height={12}
                    cx={1}
                    cy={1}
                    cr={1}
                    glow={true}
                    className="text-purple-400/30"
                />

                {/* Navigation */}
                <nav className="relative z-10 flex items-center justify-between p-4 sm:p-6 max-w-7xl mx-auto">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
                        >
                            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
                                <Image
                                    src="/assets/Logo.png"
                                    alt="Memoric Logo"
                                    width={48}
                                    height={48}
                                    className="rounded-lg"
                                />
                            </div>
                            <span className="text-white text-lg sm:text-xl font-semibold tracking-tight">Memoric</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-end">
                        {/* Removed user menu section */}
                    </div>
                </nav>

                {/* Main Content */}
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                                    Your <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Knowledge Space</span>
                                </h1>
                                <p className="text-gray-400 text-lg">
                                    Store, organize, and chat with your digital content
                                </p>
                            </div>

                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => fetchContent(true)}
                                    disabled={isRefreshing}
                                    className="bg-gray-700/50 text-white px-4 py-2 rounded-lg hover:bg-gray-700/70 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                                    <span className="hidden sm:inline">Refresh</span>
                                </button>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2"
                                >
                                    <Plus size={20} />
                                    <span>Add Content</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4 border border-purple-500/30">
                            <div className="flex items-center space-x-3">
                                <Brain className="text-purple-400" size={24} />
                                <div>
                                    <p className="text-2xl font-bold text-white">{userStats.totalContent}</p>
                                    <p className="text-gray-400 text-sm">Total Items</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-4 border border-blue-500/30">
                            <div className="flex items-center space-x-3">
                                <Zap className="text-blue-400" size={24} />
                                <div>
                                    <p className="text-2xl font-bold text-white">{userStats.aiQueries}</p>
                                    <p className="text-gray-400 text-sm">AI Queries</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl p-4 border border-green-500/30">
                            <div className="flex items-center space-x-3">
                                <Clock className="text-green-400" size={24} />
                                <div>
                                    <p className="text-2xl font-bold text-white">{userStats.timeSavedHours}h</p>
                                    <p className="text-gray-400 text-sm">Time Saved</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-xl p-4 border border-orange-500/30">
                            <div className="flex items-center space-x-3">
                                <Star className="text-orange-400" size={24} />
                                <div>
                                    <p className="text-2xl font-bold text-white">{userStats.favorites}</p>
                                    <p className="text-gray-400 text-sm">Favorites</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col lg:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search your knowledge base..."
                                    className="w-full bg-gray-900/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-colors duration-200"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex bg-gray-900/50 border border-gray-700/50 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <Grid size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <List size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content Layout */}
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar Categories */}
                        <div className="lg:w-64">
                            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                                <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
                                    <Filter size={18} />
                                    <span>Categories</span>
                                </h3>
                                <div className="space-y-2">
                                    {categories.map((category) => {
                                        const Icon = category.icon;
                                        return (
                                            <button
                                                key={category.id}
                                                onClick={() => setSelectedCategory(category.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${selectedCategory === category.id
                                                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <Icon size={16} />
                                                    <span className="text-sm font-medium">{category.name}</span>
                                                </div>
                                                <span className="text-xs bg-gray-700/50 px-2 py-1 rounded-full">
                                                    {category.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Content Grid */}
                        <div className="flex-1">
                            {isLoading ? (
                                <div className="text-center py-20">
                                    <Loader size={48} className="mx-auto mb-4 text-purple-400 animate-spin" />
                                    <h3 className="text-xl font-semibold text-white mb-2">Loading your content...</h3>
                                    <p className="text-gray-400">Please wait while we fetch your knowledge base.</p>
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="text-center py-20">
                                    <div className="text-gray-400 mb-4">
                                        <Brain size={64} className="mx-auto mb-4 opacity-50" />
                                        <h3 className="text-xl font-semibold mb-2">
                                            {searchQuery ? 'No matching content found' : 'No content found'}
                                        </h3>
                                        <p>
                                            {searchQuery
                                                ? 'Try adjusting your search terms or filters.'
                                                : 'Start by adding your first piece of content to your knowledge base.'
                                            }
                                        </p>
                                    </div>
                                    {!searchQuery && (
                                        <button
                                            onClick={() => setShowUploadModal(true)}
                                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center space-x-2 mx-auto"
                                        >
                                            <Plus size={20} />
                                            <span>Add Your First Content</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className={`${viewMode === 'grid'
                                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                                    : 'space-y-4'
                                    }`}>
                                    {filteredItems.map((item) => {
                                        const TypeIcon = getTypeIcon(item.type);
                                        const createdAt = new Date(item.createdAt);

                                        // Card Action Menu Component
                                        const CardActionMenu = ({ item }: { item: ContentItem }) => {
                                            const [showMenu, setShowMenu] = useState(false);

                                            return (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowMenu(!showMenu)}
                                                        className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                                                    >
                                                        <MoreHorizontal size={16} />
                                                    </button>
                                                    {showMenu && (
                                                        <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[120px]">
                                                            <button
                                                                onClick={() => {
                                                                    if (item.url) window.open(item.url, '_blank');
                                                                    setShowMenu(false);
                                                                }}
                                                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200"
                                                            >
                                                                <ExternalLink size={14} />
                                                                <span>Open</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    // TODO: Implement edit functionality
                                                                    setShowMenu(false);
                                                                }}
                                                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors duration-200"
                                                            >
                                                                <Edit3 size={14} />
                                                                <span>Edit</span>
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    setShowMenu(false);
                                                                    if (confirm('Are you sure you want to delete this content?')) {
                                                                        await handleDeleteContent(item.id);
                                                                    }
                                                                }}
                                                                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors duration-200"
                                                            >
                                                                <Trash2 size={14} />
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        };

                                        // X Card Component
                                        const XCard = ({ item }: { item: ContentItem }) => (
                                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group cursor-pointer overflow-hidden">
                                                {/* Header */}
                                                <div className="p-6 pb-4">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center flex-shrink-0">
                                                                <X size={16} className="text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-white font-medium text-sm truncate">
                                                                    {item.tweetData?.username || item.author || 'X Post'}
                                                                </h3>
                                                                <p className="text-blue-300 text-xs">
                                                                    @{item.tweetData?.handle || 'x_user'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <CardActionMenu item={item} />
                                                    </div>

                                                    {/* Post Content */}
                                                    <div className="mb-4">
                                                        <p className="text-gray-200 text-sm leading-relaxed line-clamp-4">
                                                            {item.tweetData?.tweetText || item.content}
                                                        </p>
                                                    </div>

                                                    {/* Post Image */}
                                                    {item.thumbnail && (
                                                        <div className="w-full h-44 bg-gray-800/50 rounded-xl mb-4 overflow-hidden">
                                                            <Image
                                                                src={item.thumbnail}
                                                                alt="Post image"
                                                                width={400}
                                                                height={200}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Metrics */}
                                                    {((item.tweetData?.likes || item.metrics?.likes || 0) > 0 ||
                                                        (item.tweetData?.replies || item.metrics?.comments || 0) > 0 ||
                                                        (item.tweetData?.retweets || 0) > 0) && (
                                                            <div className="flex items-center space-x-4 mb-4 text-xs text-blue-300/80">
                                                                {(item.tweetData?.likes || item.metrics?.likes || 0) > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <Heart size={12} className="text-pink-400" />
                                                                        <span>{(item.tweetData?.likes || item.metrics?.likes || 0).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                {(item.tweetData?.replies || item.metrics?.comments || 0) > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <MessageSquare size={12} />
                                                                        <span>{(item.tweetData?.replies || item.metrics?.comments || 0).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                {(item.tweetData?.retweets || 0) > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <Repeat2 size={12} />
                                                                        <span>{item.tweetData?.retweets?.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    {/* Tags */}
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                                            {item.tags.slice(0, 3).map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {item.tags.length > 3 && (
                                                                <span className="text-blue-400/60 text-xs px-2 py-1 font-medium">
                                                                    +{item.tags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="px-6 py-3 bg-blue-500/5 border-t border-blue-500/10 flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">{createdAt.toLocaleDateString()}</span>
                                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-medium">
                                                        X Post
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        // YouTube Card Component
                                        const YouTubeCard = ({ item }: { item: ContentItem }) => (
                                            <div className="bg-gradient-to-br from-red-900/20 to-red-800/20 backdrop-blur-sm border border-red-500/30 rounded-xl hover:border-red-400/50 transition-all duration-300 group cursor-pointer p-6">
                                                {/* Header with action menu */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                                                            <Youtube size={20} className="text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white font-semibold text-sm line-clamp-1">
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-red-300 text-xs">
                                                                {item.author || 'YouTube'} • Video
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <CardActionMenu item={item} />
                                                </div>

                                                {/* Video thumbnail */}
                                                {item.thumbnail && (
                                                    <div className="relative w-full h-40 bg-gray-800 rounded-lg mb-4 overflow-hidden group">
                                                        <Image
                                                            src={item.thumbnail}
                                                            alt="Video thumbnail"
                                                            width={400}
                                                            height={200}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        {/* Play button overlay */}
                                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                                    <path d="M8 5v14l11-7z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Video description preview */}
                                                <div className="mb-4">
                                                    <p className="text-white text-sm leading-relaxed line-clamp-3">
                                                        {item.content}
                                                    </p>
                                                </div>

                                                {/* Video metrics */}
                                                {item.metrics && (
                                                    <div className="flex items-center space-x-4 mb-4 text-xs text-red-300">
                                                        {item.metrics.views > 0 && (
                                                            <div className="flex items-center space-x-1">
                                                                <Eye size={12} />
                                                                <span>{item.metrics.views.toLocaleString()} views</span>
                                                            </div>
                                                        )}
                                                        {item.metrics.likes > 0 && (
                                                            <div className="flex items-center space-x-1">
                                                                <Heart size={12} className="text-red-400" />
                                                                <span>{item.metrics.likes.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Tags */}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {item.tags.slice(0, 4).map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-red-600/20 text-red-300 px-2 py-1 rounded-full text-xs"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 4 && (
                                                            <span className="text-red-400 text-xs px-2 py-1">
                                                                +{item.tags.length - 4} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-xs text-gray-400">
                                                    <span>{createdAt.toLocaleDateString()}</span>
                                                    <span className="bg-red-600/20 text-red-300 px-2 py-1 rounded-full">
                                                        YouTube
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        // Document/PDF Card Component
                                        const DocumentCard = ({ item }: { item: ContentItem }) => (
                                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-emerald-400/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group cursor-pointer overflow-hidden">
                                                {/* Header */}
                                                <div className="p-6 pb-4">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                                                                <FileText size={16} className="text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-white font-medium text-sm line-clamp-2 leading-5">
                                                                    {item.title}
                                                                </h3>
                                                                <p className="text-emerald-300 text-xs mt-1">
                                                                    {item.size || 'PDF Document'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <CardActionMenu item={item} />
                                                    </div>

                                                    {/* PDF Preview */}
                                                    {item.type === 'document' ? (
                                                        <div className="mb-4">
                                                            <PdfPreview
                                                                url={item.url || ''}
                                                                title={item.title}
                                                                onClick={() => window.open(item.url, '_blank')}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
                                                            <div className="flex items-center space-x-2 mb-3">
                                                                <Eye size={14} className="text-emerald-400" />
                                                                <span className="text-emerald-300 text-xs font-medium">Document Preview</span>
                                                            </div>
                                                            <div className="text-gray-200 text-sm leading-relaxed">
                                                                <div className="line-clamp-6">
                                                                    {item.content.length > 300
                                                                        ? `${item.content.substring(0, 300)}...`
                                                                        : item.content
                                                                    }
                                                                </div>
                                                            </div>
                                                            {item.content.length > 300 && (
                                                                <div className="mt-2 text-emerald-400 text-xs font-medium">
                                                                    Click to read more
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Tags */}
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                                            {item.tags.slice(0, 3).map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full text-xs font-medium"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {item.tags.length > 3 && (
                                                                <span className="text-emerald-400/60 text-xs px-2 py-1 font-medium">
                                                                    +{item.tags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="px-6 py-3 bg-emerald-500/5 border-t border-emerald-500/10 flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">{createdAt.toLocaleDateString()}</span>
                                                    <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full font-medium">
                                                        Document
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        // Reddit Card Component
                                        const RedditCard = ({ item }: { item: ContentItem }) => (
                                            <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/20 backdrop-blur-sm border border-orange-500/30 rounded-xl hover:border-orange-400/50 transition-all duration-300 group cursor-pointer p-6">
                                                {/* Header with action menu */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
                                                            <Globe size={20} className="text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white font-semibold text-sm line-clamp-2">
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-orange-300 text-xs">
                                                                {item.author || 'Reddit'} • r/{item.platform || 'reddit'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <CardActionMenu item={item} />
                                                </div>

                                                {/* Reddit post content */}
                                                <div className="mb-4">
                                                    <p className="text-white text-sm leading-relaxed line-clamp-4">
                                                        {item.content}
                                                    </p>
                                                </div>

                                                {/* Reddit metrics */}
                                                {item.metrics && (
                                                    <div className="flex items-center space-x-4 mb-4 text-xs text-orange-300">
                                                        {item.metrics.score > 0 && (
                                                            <div className="flex items-center space-x-1">
                                                                <BarChart3 size={12} />
                                                                <span>{item.metrics.score} upvotes</span>
                                                            </div>
                                                        )}
                                                        {item.metrics.comments > 0 && (
                                                            <div className="flex items-center space-x-1">
                                                                <MessageSquare size={12} />
                                                                <span>{item.metrics.comments} comments</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Tags */}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {item.tags.slice(0, 4).map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-orange-600/20 text-orange-300 px-2 py-1 rounded-full text-xs"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 4 && (
                                                            <span className="text-orange-400 text-xs px-2 py-1">
                                                                +{item.tags.length - 4} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-xs text-gray-400">
                                                    <span>{createdAt.toLocaleDateString()}</span>
                                                    <span className="bg-orange-600/20 text-orange-300 px-2 py-1 rounded-full">
                                                        Reddit
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        // Image Card Component
                                        const ImageCard = ({ item }: { item: ContentItem }) => (
                                            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-xl hover:border-purple-400/50 transition-all duration-300 group cursor-pointer p-6">
                                                {/* Header with action menu */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center">
                                                            <ImageIcon size={20} className="text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white font-semibold text-sm line-clamp-1">
                                                                {item.title}
                                                            </h3>
                                                            <p className="text-purple-300 text-xs">
                                                                Image • {item.size || 'Unknown size'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <CardActionMenu item={item} />
                                                </div>

                                                {/* Image preview */}
                                                {item.thumbnail && (
                                                    <div className="w-full h-48 bg-gray-800 rounded-lg mb-4 overflow-hidden">
                                                        <Image
                                                            src={item.thumbnail}
                                                            alt="Image preview"
                                                            width={400}
                                                            height={300}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}

                                                {/* Tags */}
                                                {item.tags && item.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mb-4">
                                                        {item.tags.slice(0, 4).map((tag, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full text-xs"
                                                            >
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                        {item.tags.length > 4 && (
                                                            <span className="text-purple-400 text-xs px-2 py-1">
                                                                +{item.tags.length - 4} more
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-xs text-gray-400">
                                                    <span>{createdAt.toLocaleDateString()}</span>
                                                    <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
                                                        Image
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        // Text/Note Card Component
                                        const TextCard = ({ item }: { item: ContentItem }) => (
                                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 group cursor-pointer overflow-hidden">
                                                {/* Header */}
                                                <div className="p-6 pb-4">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                                <FileText size={16} className="text-white" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="text-white font-medium text-sm line-clamp-1">
                                                                    {item.title}
                                                                </h3>
                                                                <p className="text-indigo-300 text-xs mt-1">
                                                                    {item.content.length} characters
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <CardActionMenu item={item} />
                                                    </div>

                                                    {/* Text Content Preview */}
                                                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mb-4">
                                                        <div className="flex items-center space-x-2 mb-3">
                                                            <MessageSquare size={14} className="text-indigo-400" />
                                                            <span className="text-indigo-300 text-xs font-medium">Note Content</span>
                                                        </div>
                                                        <div className="text-gray-200 text-sm leading-relaxed line-clamp-6">
                                                            {item.content}
                                                        </div>
                                                    </div>

                                                    {/* Tags */}
                                                    {item.tags && item.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                                            {item.tags.slice(0, 3).map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full text-xs font-medium"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {item.tags.length > 3 && (
                                                                <span className="text-indigo-400/60 text-xs px-2 py-1 font-medium">
                                                                    +{item.tags.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer */}
                                                <div className="px-6 py-3 bg-indigo-500/5 border-t border-indigo-500/10 flex items-center justify-between text-xs">
                                                    <span className="text-gray-400">{createdAt.toLocaleDateString()}</span>
                                                    <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full font-medium">
                                                        Text Note
                                                    </span>
                                                </div>
                                            </div>
                                        );

                                        // Default Card Component
                                        const DefaultCard = ({ item }: { item: ContentItem }) => (
                                            <div
                                                className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl hover:border-purple-400/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group cursor-pointer overflow-hidden ${viewMode === 'grid' ? '' : 'flex items-center'
                                                    }`}
                                            >
                                                {viewMode === 'grid' ? (
                                                    <>
                                                        {/* Header */}
                                                        <div className="p-6 pb-4">
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0 ${getTypeColor(item.type)}`}>
                                                                        <TypeIcon size={16} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <h3 className="text-white font-medium text-sm line-clamp-2 leading-5">
                                                                            {item.title}
                                                                        </h3>
                                                                        <div className="flex items-center space-x-2 mt-1">
                                                                            {item.platform && (
                                                                                <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded text-xs font-medium">
                                                                                    {item.platform}
                                                                                </span>
                                                                            )}
                                                                            {item.author && (
                                                                                <span className="text-gray-400 text-xs">
                                                                                    {item.author}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <CardActionMenu item={item} />
                                                            </div>

                                                            {/* Thumbnail */}
                                                            {item.thumbnail && (
                                                                <div className="w-full h-40 bg-gray-800/50 rounded-xl mb-4 overflow-hidden">
                                                                    <Image
                                                                        src={item.thumbnail}
                                                                        alt={item.title}
                                                                        width={400}
                                                                        height={200}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Content Preview */}
                                                            <div className="bg-gray-500/5 border border-gray-500/20 rounded-xl p-4 mb-4">
                                                                <div className="flex items-center space-x-2 mb-3">
                                                                    <Eye size={14} className="text-gray-400" />
                                                                    <span className="text-gray-300 text-xs font-medium">Content Preview</span>
                                                                </div>
                                                                <div className="text-gray-200 text-sm leading-relaxed line-clamp-4">
                                                                    {item.content.length > 200
                                                                        ? `${item.content.substring(0, 200)}...`
                                                                        : item.content
                                                                    }
                                                                </div>
                                                            </div>

                                                            {/* External Data Metrics */}
                                                            {item.metrics && (item.metrics.likes > 0 || item.metrics.views > 0 || item.metrics.comments > 0) && (
                                                                <div className="flex items-center space-x-4 mb-4 text-xs text-gray-400">
                                                                    {item.metrics.views > 0 && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <Eye size={12} />
                                                                            <span>{item.metrics.views.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.metrics.likes > 0 && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <Heart size={12} className="text-pink-400" />
                                                                            <span>{item.metrics.likes.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.metrics.comments > 0 && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <MessageSquare size={12} />
                                                                            <span>{item.metrics.comments.toLocaleString()}</span>
                                                                        </div>
                                                                    )}
                                                                    {item.metrics.score > 0 && (
                                                                        <div className="flex items-center space-x-1">
                                                                            <Star size={12} />
                                                                            <span>{item.metrics.score}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Tags */}
                                                            {(item.tags || []).length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 mb-4">
                                                                    {(item.tags || []).slice(0, 3).map((tag, index) => (
                                                                        <span
                                                                            key={index}
                                                                            className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full text-xs font-medium"
                                                                        >
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                    {(item.tags || []).length > 3 && (
                                                                        <span className="text-purple-400/60 text-xs px-2 py-1 font-medium">
                                                                            +{(item.tags || []).length - 3}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Footer */}
                                                        <div className="px-6 py-3 bg-gray-500/5 border-t border-gray-500/10 flex items-center justify-between text-xs">
                                                            <span className="text-gray-400">{createdAt.toLocaleDateString()}</span>
                                                            {item.size && <span className="text-gray-400">{item.size}</span>}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="p-4 flex items-center space-x-4 w-full">
                                                            <div className={`p-3 rounded-xl ${getTypeColor(item.type)} bg-gray-700/50`}>
                                                                <TypeIcon size={24} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-white font-medium mb-1 line-clamp-1">{item.title}</h3>
                                                                <p className="text-gray-400 text-sm mb-2 line-clamp-1">{item.content}</p>
                                                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                    <span>{createdAt.toLocaleDateString()}</span>
                                                                    {item.size && <span>{item.size}</span>}
                                                                    <div className="flex space-x-1">
                                                                        {(item.tags || []).slice(0, 2).map((tag, index) => (
                                                                            <span key={index} className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
                                                                                {tag}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <CardActionMenu item={item} />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );

                                        // Render the appropriate card type
                                        return (
                                            <div key={item.id}>
                                                {item.type === 'tweet' ? (
                                                    <XCard item={item} />
                                                ) : item.type === 'youtube' ? (
                                                    <YouTubeCard item={item} />
                                                ) : item.type === 'document' ? (
                                                    <DocumentCard item={item} />
                                                ) : item.type === 'reddit' ? (
                                                    <RedditCard item={item} />
                                                ) : item.type === 'image' ? (
                                                    <ImageCard item={item} />
                                                ) : item.type === 'text' ? (
                                                    <TextCard item={item} />
                                                ) : (
                                                    <DefaultCard item={item} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Upload Modal */}
                <UploadModal
                    isOpen={showUploadModal}
                    onClose={() => {
                        setShowUploadModal(false);
                    }}
                    onSuccess={handleUploadSuccess}
                />
            </div>
        </SignedIn>
    );
}
