'use client';

import { Check, Edit, ExternalLink, Trash2, Heart, Repeat2, MessageCircle, BarChart3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TweetData {
    id: string;
    text: string;
    username: string;
    handle: string;
    avatar?: string | null;
    timestamp: string;
    metrics?: {
        likes?: number;
        retweets?: number;
        replies?: number;
        views?: number;
    };
    images?: string[];
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

function XLogo({ className = '' }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

export function XCard({
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
        <div className="group cursor-pointer bg-white" onClick={onClick}>
            {/* Header: title + actions */}
            <div className="flex items-center justify-between gap-2 border-b-2 border-ink/10 px-3.5 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <XLogo className="h-4 w-4 shrink-0 fill-ink" />
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
                            className="min-w-0 flex-1 border-2 border-ink bg-paper px-2 py-0.5 text-sm font-bold outline-none"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <h3 className="truncate text-sm font-extrabold">
                            {title || (tweetData?.text ? tweetData.text.slice(0, 50) + '…' : 'X post')}
                        </h3>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                    {!isEditing && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                className="p-1 text-ink/40 opacity-0 transition hover:text-ink group-hover:opacity-100"
                                title="Rename"
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
                                className="p-1 text-ink/40 opacity-0 transition hover:text-ink group-hover:opacity-100"
                                title="Open on X"
                            >
                                <ExternalLink size={14} />
                            </button>
                            {onDelete && (
                                <button
                                    onClick={handleDelete}
                                    className="p-1 text-ink/40 opacity-0 transition hover:text-brand-coral group-hover:opacity-100"
                                    title="Unpin"
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
                            className="p-1 text-brand-green transition hover:scale-110"
                            title="Save"
                        >
                            <Check size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* X Post Content */}
            <div className="px-3.5 py-3">
                {tweetData ? (
                    <div>
                        {/* User Info */}
                        <div className="flex items-center gap-2.5">
                            {tweetData.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={tweetData.avatar}
                                    alt={tweetData.username}
                                    className="h-10 w-10 shrink-0 rounded-full border-2 border-ink bg-paper object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand-blue text-sm font-black text-white">
                                    {(tweetData.username || 'X').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 leading-tight">
                                <p className="truncate text-[15px] font-extrabold">{tweetData.username}</p>
                                <p className="truncate text-[13px] text-ink/45">
                                    @{tweetData.handle} · {getTimeSince(tweetData.timestamp)}
                                </p>
                            </div>
                        </div>

                        {/* X Post Text */}
                        <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-snug">
                            {showFullPost || tweetData.text.length <= 180 ? (
                                tweetData.text
                            ) : (
                                <>
                                    {tweetData.text.slice(0, 180)}…
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullPost(true);
                                        }}
                                        className="ml-1 font-bold text-brand-blue hover:underline"
                                    >
                                        Show more
                                    </button>
                                </>
                            )}
                        </p>

                        {/* Tweet Images */}
                        {tweetData.images && tweetData.images.length > 0 && (
                            <div className={`mt-3 grid gap-1.5 ${tweetData.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {tweetData.images.slice(0, 4).map((image, index) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={index}
                                        src={image}
                                        alt="Post media"
                                        className="max-h-48 w-full border-2 border-ink bg-paper object-cover"
                                    />
                                ))}
                            </div>
                        )}

                        {/* Tweet Metrics */}
                        <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2.5 text-[12px] text-ink/45">
                            <span className="flex items-center gap-1">
                                <MessageCircle size={14} /> {formatMetric(tweetData.metrics?.replies ?? 0)}
                            </span>
                            <span className="flex items-center gap-1 text-brand-green">
                                <Repeat2 size={15} /> {formatMetric(tweetData.metrics?.retweets ?? 0)}
                            </span>
                            <span className="flex items-center gap-1 text-brand-coral">
                                <Heart size={14} fill="currentColor" /> {formatMetric(tweetData.metrics?.likes ?? 0)}
                            </span>
                            {!!tweetData.metrics?.views && (
                                <span className="flex items-center gap-1">
                                    <BarChart3 size={14} /> {formatMetric(tweetData.metrics.views)}
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-ink/40">
                        <XLogo className="mx-auto mb-2 h-7 w-7 fill-ink/25" />
                        <p className="text-sm font-bold">X post content not available</p>
                        <p className="mt-1 text-xs">Click to view the original</p>
                    </div>
                )}
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
                <div className="px-3.5 pb-3">
                    <div className="flex flex-wrap gap-1.5">
                        {tags.slice(0, 3).map((tag, index) => (
                            <span
                                key={index}
                                className="border-2 border-ink bg-paper px-1.5 py-0.5 text-[11px] font-bold"
                            >
                                #{tag}
                            </span>
                        ))}
                        {tags.length > 3 && (
                            <span className="px-1 py-0.5 text-[11px] font-bold text-ink/40">
                                +{tags.length - 3}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t-2 border-ink/10 bg-paper px-3.5 py-2 text-[11px] font-bold text-ink/40">
                <span>{new Date(createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1">
                    <XLogo className="h-3 w-3 fill-ink/40" /> post
                </span>
            </div>
        </div>
    );
}
