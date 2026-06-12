'use client';

import { useEffect, useState } from 'react';
import {
    Upload, FileText, AlertCircle, Loader, Link as LinkIcon,
    Image as ImageIcon, MessageSquare, Youtube, Globe, Github, X,
} from 'lucide-react';
import { detectContentTypeFromUrl, TYPE_LABELS, type DetectedType } from '@/lib/contentType';

// Downscale an image in the browser to a compact JPEG data URL so it can be
// stored inline (as the card thumbnail) without any storage bucket setup.
async function imageToDataUrl(file: File, maxDim = 900, quality = 0.82): Promise<string> {
    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new window.Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = objectUrl;
        });
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return objectUrl;
        ctx.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', quality);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

interface UploadModalProps {
    type?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (data: unknown) => void;
}

const MODES = [
    { id: 'link', label: 'Link', icon: LinkIcon, color: 'bg-brand-blue text-white' },
    { id: 'text', label: 'Note', icon: FileText, color: 'bg-brand-yellow' },
    { id: 'image', label: 'Image', icon: ImageIcon, color: 'bg-brand-green text-white' },
];

const MODE_CONFIG: Record<string, { heading: string; placeholder: string; showFile?: boolean; showUrl?: boolean; acceptedFiles?: string }> = {
    link: { heading: 'Pin a link', placeholder: 'Add your own notes (optional)…', showUrl: true },
    text: { heading: 'Write a note', placeholder: 'Write your note here…' },
    image: { heading: 'Pin an image', placeholder: 'Describe this image…', showFile: true, acceptedFiles: '.jpg,.jpeg,.png,.gif,.webp' },
};

const DETECTED_BADGE: Record<DetectedType, { icon: typeof Globe; className: string }> = {
    tweet: { icon: MessageSquare, className: 'bg-brand-blue text-white' },
    reddit: { icon: Globe, className: 'bg-brand-orange text-white' },
    youtube: { icon: Youtube, className: 'bg-brand-coral text-white' },
    github: { icon: Github, className: 'bg-ink text-white' },
    website: { icon: Globe, className: 'bg-brand-purple text-white' },
};

export default function UploadModal({ type: initialType, isOpen, onClose, onSuccess }: UploadModalProps) {
    const [mode, setMode] = useState(initialType === 'text' || initialType === 'image' ? initialType : 'link');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Live preview of the chosen image; revoked when it changes or unmounts.
    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    if (!isOpen) return null;

    const config = MODE_CONFIG[mode] ?? MODE_CONFIG.link;
    const detected = mode === 'link' && url.trim() ? detectContentTypeFromUrl(url) : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (mode === 'link' && !detected) {
                throw new Error('Paste a valid link (https://…)');
            }

            let finalContent = content;
            let finalTitle = title;
            let imageData: string | undefined;

            if (file && mode === 'image') {
                finalContent = finalContent || file.name;
                finalTitle = finalTitle || file.name;
                imageData = await imageToDataUrl(file);
            }

            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // The server re-detects from the URL; this is just a hint.
                    type: mode === 'link' ? detected : mode,
                    content: finalContent,
                    title: finalTitle,
                    url: mode === 'link' ? url : undefined,
                    imageData,
                    metadata: {
                        fileName: file?.name,
                        fileSize: file?.size,
                        fileType: file?.type,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save content');
            }

            const result = await response.json();
            setSuccess(true);

            setTimeout(() => {
                onSuccess?.(result.data);
                handleClose();
            }, 1200);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setContent('');
        setTitle('');
        setUrl('');
        setFile(null);
        setError('');
        setSuccess(false);
        onClose();
    };

    const switchMode = (id: string) => {
        setMode(id);
        setContent('');
        setTitle('');
        setUrl('');
        setFile(null);
        setError('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
            <div className="pin relative max-h-[90vh] w-full max-w-xl overflow-y-auto border-[3px] border-ink bg-paper p-6 shadow-hard-lg">
                {success ? (
                    <div className="flex flex-col items-center py-10 text-center">
                        <div className="rotate-[-2deg] border-[3px] border-ink bg-brand-green p-5 text-white shadow-hard">
                            <p className="font-hand text-4xl">pinned! 📌</p>
                        </div>
                        <p className="mt-5 font-medium text-ink/60">Added to your board and tagged automatically.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-extrabold tracking-tight">{config.heading}</h2>
                                <p className="font-hand text-xl text-ink/50">it gets summarized + tagged for you</p>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="border-2 border-ink bg-white p-1.5 shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-brand-coral hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Mode chips */}
                        <div className="mb-5 flex flex-wrap gap-2">
                            {MODES.map((t) => {
                                const Icon = t.icon;
                                const active = mode === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => switchMode(t.id)}
                                        disabled={isLoading}
                                        className={`flex items-center gap-1.5 border-2 border-ink px-3 py-1.5 text-sm font-bold transition hover:-translate-y-0.5 ${
                                            active ? `${t.color} shadow-hard-sm -translate-y-0.5` : 'bg-white'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {config.showUrl && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide">Link</label>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="Paste any link — X, Reddit, YouTube, GitHub, articles…"
                                        className="w-full border-[3px] border-ink bg-white px-3 py-2 font-medium shadow-hard-sm outline-none placeholder:text-ink/35 focus:-translate-y-0.5 focus:shadow-hard transition"
                                        disabled={isLoading}
                                        required
                                        autoFocus
                                    />
                                    {detected && (
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="font-hand text-lg text-ink/50">detected:</span>
                                            {(() => {
                                                const badge = DETECTED_BADGE[detected];
                                                const Icon = badge.icon;
                                                return (
                                                    <span className={`flex items-center gap-1.5 border-2 border-ink px-2 py-0.5 text-xs font-extrabold shadow-hard-sm ${badge.className}`}>
                                                        <Icon size={12} /> {TYPE_LABELS[detected]}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {mode !== 'link' && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Give it a title…"
                                        className="w-full border-[3px] border-ink bg-white px-3 py-2 font-medium shadow-hard-sm outline-none placeholder:text-ink/35 focus:-translate-y-0.5 focus:shadow-hard transition"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            {config.showFile && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide">File</label>
                                    <div className="border-[3px] border-dashed border-ink/50 bg-white p-6 text-center">
                                        <input
                                            type="file"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            accept={config.acceptedFiles}
                                            className="hidden"
                                            id="file-upload"
                                            disabled={isLoading}
                                        />
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            {previewUrl ? (
                                                <>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={previewUrl}
                                                        alt="Preview"
                                                        className="mx-auto mb-2 max-h-52 w-auto border-2 border-ink object-contain shadow-hard-sm"
                                                    />
                                                    <p className="truncate font-medium text-ink/60">{file?.name}</p>
                                                    <p className="font-hand text-lg text-ink/40">click to change</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={28} className="mx-auto mb-2 text-ink/50" />
                                                    <p className="font-medium text-ink/60">Click to upload or drag and drop</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide">
                                    {mode === 'text' ? 'Note' : 'Notes (optional)'}
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={config.placeholder}
                                    rows={mode === 'link' ? 3 : 5}
                                    className="w-full resize-none border-[3px] border-ink bg-white px-3 py-2 font-medium shadow-hard-sm outline-none placeholder:text-ink/35 focus:-translate-y-0.5 focus:shadow-hard transition"
                                    disabled={isLoading}
                                    required={mode === 'text' && !file}
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 border-2 border-ink bg-brand-coral px-3 py-2 text-sm font-bold text-white shadow-hard-sm">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={isLoading}
                                    className="font-bold text-ink/50 underline-offset-4 hover:underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || (mode === 'link' ? !detected : !content && !file)}
                                    className="flex items-center gap-2 border-[3px] border-ink bg-brand-coral px-6 py-2.5 font-extrabold text-white shadow-hard transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-40"
                                >
                                    {isLoading && <Loader size={16} className="animate-spin" />}
                                    {isLoading ? 'Pinning…' : '📌 Pin it'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
