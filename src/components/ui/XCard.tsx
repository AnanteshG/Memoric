'use client';

import { Check, Edit, ExternalLink, MessageSquare, Trash2, Heart, Repeat2, MessageCircle, BarChart3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TweetData {
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
}

interface XCardProps {
    id?: string;
    title?: string;
    tweetData?: TweetData;
    url?: string;
    createdAt: string;
    tags?: string[];
    onDelete?: () => void;
    onTitleChange?: (title: string) => void;
    onClick?: () => void;
}

export function XCard({
    id,
    title = "",
    tweetData,
    url = "",
    createdAt,
    tags = [],
    onDelete,
    onTitleChange,
    onClick,
}: XCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(title);
    const [showFullPost, setShowFullPost] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);

    // Focus title input when editing
    useEffect(() => {
        if (isEditing) titleRef.current?.focus();
    }, [isEditing]);

    const saveEdits = () => {
        if (onTitleChange) {
            onTitleChange(editedTitle);
        }
        setIsEditing(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete();
        }
    };

    const formatMetric = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const getTimeSince = (timestamp: string): string => {
        const now = new Date();
        const posted = new Date(timestamp);
        const diffInHours = Math.floor((now.getTime() - posted.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'now';
        if (diffInHours < 24) return `${diffInHours}h`;
        if (diffInHours < 24 * 7) return `${Math.floor(diffInHours / 24)}d`;
        return posted.toLocaleDateString();
    };

    return (
        <div
            className="group bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300 cursor-pointer"
            onClick={onClick}
        >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800/50">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <div className="p-2 bg-sky-500/10 rounded-lg">
                            <MessageSquare size={18} className="text-sky-400" />
                        </div>
                        {isEditing ? (
                            <input
                                ref={titleRef}
                                type="text"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdits();
                                    if (e.key === "Escape") setIsEditing(false);
                                }}
                                className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-700 focus:outline-none focus:border-sky-500 text-sm"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <h3 className="font-medium text-white text-sm truncate max-w-[200px]">
                                {title || tweetData?.text?.slice(0, 50) + '...' || 'X Post'}
                            </h3>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-1">
                    {!isEditing && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Edit size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const postUrl = url || tweetData?.url;
                                    if (postUrl) {
                                        window.open(postUrl, '_blank');
                                    }
                                }}
                                className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-sky-400 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <ExternalLink size={14} />
                            </button>
                            {onDelete && (
                                <button
                                    onClick={handleDelete}
                                    className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </>
                    )}
                    {isEditing && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                saveEdits();
                            }}
                            className="p-1.5 rounded-full hover:bg-gray-800 text-green-400 transition-colors"
                        >
                            <Check size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* X Post Content */}
            <div className="p-4">
                {tweetData ? (
                    <div className="space-y-3">
                        {/* User Info */}
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {tweetData.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-white text-sm">{tweetData.username}</span>
                                    <span className="text-gray-400 text-sm">@{tweetData.handle}</span>
                                    <span className="text-gray-500 text-xs">·</span>
                                    <span className="text-gray-500 text-xs">{getTimeSince(tweetData.timestamp)}</span>
                                </div>
                            </div>
                        </div>

                        {/* X Post Text */}
                        <div className="text-white text-sm leading-relaxed">
                            {showFullPost || tweetData.text.length <= 150 ? (
                                tweetData.text
                            ) : (
                                <>
                                    {tweetData.text.slice(0, 150)}...
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullPost(true);
                                        }}
                                        className="text-sky-400 hover:text-sky-300 ml-1 font-medium"
                                    >
                                        Show more
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Tweet Images */}
                        {tweetData.images && tweetData.images.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden">
                                {tweetData.images.slice(0, 4).map((image, index) => (
                                    <img
                                        key={index}
                                        src={image}
                                        alt="Tweet image"
                                        className="w-full h-32 object-cover bg-gray-800"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Tweet Metrics */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-800/50">
                            <div className="flex items-center space-x-4 text-gray-400">
                                <div className="flex items-center space-x-1 hover:text-gray-300 transition-colors cursor-pointer">
                                    <MessageCircle size={16} />
                                    <span className="text-xs">{formatMetric(tweetData.metrics.replies)}</span>
                                </div>
                                <div className="flex items-center space-x-1 hover:text-green-400 transition-colors cursor-pointer">
                                    <Repeat2 size={16} />
                                    <span className="text-xs">{formatMetric(tweetData.metrics.retweets)}</span>
                                </div>
                                <div className="flex items-center space-x-1 hover:text-red-400 transition-colors cursor-pointer">
                                    <Heart size={16} />
                                    <span className="text-xs">{formatMetric(tweetData.metrics.likes)}</span>
                                </div>
                                {tweetData.metrics.views && (
                                    <div className="flex items-center space-x-1">
                                        <BarChart3 size={16} />
                                        <span className="text-xs">{formatMetric(tweetData.metrics.views)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                        <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">X post content not available</p>
                        <p className="text-xs mt-1">Click to view original</p>
                    </div>
                )}
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
                <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2 py-1 rounded-full text-xs font-medium"
                            >
                                {tag}
                            </span>
                        ))}
                        {tags.length > 3 && (
                            <span className="text-sky-400/60 text-xs px-2 py-1 font-medium">
                                +{tags.length - 3}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-500/5 border-t border-gray-500/10 flex items-center justify-between text-xs">
                <span className="text-gray-400">{new Date(createdAt).toLocaleDateString()}</span>
                <span className="text-sky-400/60">X Post</span>
            </div>
        </div>
    );
}
