'use client';

import { SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { DotPattern } from '@/components/ui/dot-pattern';
import UploadModal from '@/components/pages/UploadModal';
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
    ChevronDown,
    Settings,
    LogOut,
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
    Twitter,
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
}

export default function Space() {
    const router = useRouter();
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
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

    const categories = [
        { id: 'all', name: 'All Content', icon: Grid, count: contentItems.length },
        { id: 'document', name: 'Documents', icon: FileText, count: contentItems.filter(item => item.type === 'document').length },
        { id: 'tweet', name: 'Tweets', icon: MessageSquare, count: contentItems.filter(item => item.type === 'tweet').length },
        { id: 'reddit', name: 'Reddit', icon: Globe, count: contentItems.filter(item => item.type === 'reddit').length },
        { id: 'youtube', name: 'YouTube', icon: Youtube, count: contentItems.filter(item => item.type === 'youtube').length },
        { id: 'image', name: 'Images', icon: ImageIcon, count: contentItems.filter(item => item.type === 'image').length },
        { id: 'text', name: 'Notes', icon: FileText, count: contentItems.filter(item => item.type === 'text').length }
    ];

    const uploadOptions = [
        { id: 'document', name: 'Upload Document', icon: FileText, description: 'PDF, DOCX, TXT files', color: 'from-blue-500 to-cyan-500' },
        { id: 'tweet', name: 'Save Tweet', icon: MessageSquare, description: 'Twitter URLs or screenshots', color: 'from-sky-500 to-blue-500' },
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

                                        return (
                                            <div
                                                key={item.id}
                                                className={`bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl hover:border-purple-500/30 transition-all duration-300 group cursor-pointer ${viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center space-x-4'
                                                    }`}
                                            >
                                                {viewMode === 'grid' ? (
                                                    <>
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className={`p-2 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 ${getTypeColor(item.type)}`}>
                                                                <TypeIcon size={20} />
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200">
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200">
                                                                    <Share size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {item.thumbnail && (
                                                            <div className="w-full h-32 bg-gray-800 rounded-lg mb-4 overflow-hidden">
                                                                <Image
                                                                    src={item.thumbnail}
                                                                    alt={item.title}
                                                                    width={400}
                                                                    height={200}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        )}

                                                        <h3 className="text-white font-semibold mb-2 line-clamp-2">
                                                            {item.title}
                                                        </h3>

                                                        {/* Platform and Author Info */}
                                                        {(item.platform || item.author) && (
                                                            <div className="flex items-center space-x-2 mb-2">
                                                                {item.platform && (
                                                                    <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
                                                                        {item.platform}
                                                                    </span>
                                                                )}
                                                                {item.author && (
                                                                    <span className="text-gray-400 text-xs">
                                                                        by {item.author}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                                                            {item.summary || item.content}
                                                        </p>

                                                        {/* External Data Metrics */}
                                                        {item.metrics && (item.metrics.likes > 0 || item.metrics.views > 0 || item.metrics.comments > 0) && (
                                                            <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500">
                                                                {item.metrics.views > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <Eye size={12} />
                                                                        <span>{item.metrics.views.toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                                {item.metrics.likes > 0 && (
                                                                    <div className="flex items-center space-x-1">
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-red-400">
                                                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" />
                                                                        </svg>
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

                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {(item.tags || []).map((tag, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full text-xs"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                                            <span>{createdAt.toLocaleDateString()}</span>
                                                            {item.size && <span>{item.size}</span>}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`p-3 rounded-lg ${getTypeColor(item.type)}`}>
                                                            <TypeIcon size={24} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                                                            <p className="text-gray-400 text-sm mb-2 line-clamp-1">{item.summary || item.content}</p>
                                                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                                                                <span>{createdAt.toLocaleDateString()}</span>
                                                                {item.size && <span>{item.size}</span>}
                                                                <div className="flex space-x-1">
                                                                    {(item.tags || []).slice(0, 3).map((tag, index) => (
                                                                        <span key={index} className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200">
                                                                <Eye size={16} />
                                                            </button>
                                                            <button className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200">
                                                                <Share size={16} />
                                                            </button>
                                                        </div>
                                                    </>
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
