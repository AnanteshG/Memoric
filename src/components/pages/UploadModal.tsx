'use client';

import { useState } from 'react';
import {
    Upload, FileText, AlertCircle, Loader,
    Image as ImageIcon, MessageSquare, Youtube, Globe, X,
} from 'lucide-react';

interface UploadModalProps {
    type?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (data: unknown) => void;
}

const CONTENT_TYPES = [
    { id: 'text', label: 'Note', icon: FileText, color: 'bg-brand-yellow' },
    { id: 'tweet', label: 'X post', icon: MessageSquare, color: 'bg-brand-blue text-white' },
    { id: 'reddit', label: 'Reddit', icon: Globe, color: 'bg-brand-orange text-white' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-brand-coral text-white' },
    { id: 'image', label: 'Image', icon: ImageIcon, color: 'bg-brand-green text-white' },
];

const TYPE_CONFIG: Record<string, { heading: string; placeholder: string; showFile?: boolean; showUrl?: boolean; urlPlaceholder?: string; acceptedFiles?: string }> = {
    text: { heading: 'Write a note', placeholder: 'Write your note here…' },
    tweet: { heading: 'Pin an X post', placeholder: 'Add your own notes (optional)…', showUrl: true, urlPlaceholder: 'https://x.com/…' },
    reddit: { heading: 'Pin a Reddit post', placeholder: 'Add your own notes (optional)…', showUrl: true, urlPlaceholder: 'https://reddit.com/r/…' },
    youtube: { heading: 'Pin a YouTube video', placeholder: 'Add your own notes (optional)…', showUrl: true, urlPlaceholder: 'https://youtube.com/watch?v=…' },
    image: { heading: 'Pin an image', placeholder: 'Describe this image…', showFile: true, acceptedFiles: '.jpg,.jpeg,.png,.gif,.webp' },
};

export default function UploadModal({ type: initialType, isOpen, onClose, onSuccess }: UploadModalProps) {
    const [selectedType, setSelectedType] = useState(initialType || 'text');
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const config = TYPE_CONFIG[selectedType] ?? TYPE_CONFIG.text;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let finalContent = content;
            let finalTitle = title;

            if (file && selectedType === 'image') {
                finalContent = finalContent || file.name;
                finalTitle = finalTitle || file.name;
            }

            if (url && (selectedType === 'tweet' || selectedType === 'reddit' || selectedType === 'youtube')) {
                finalContent = content || url;
            }

            const response = await fetch('/api/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedType,
                    content: finalContent,
                    title: finalTitle,
                    url: url || undefined,
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

    const switchType = (id: string) => {
        setSelectedType(id);
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

                        {/* Type chips */}
                        <div className="mb-5 flex flex-wrap gap-2">
                            {CONTENT_TYPES.map((t) => {
                                const Icon = t.icon;
                                const active = selectedType === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => switchType(t.id)}
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
                            {selectedType !== 'tweet' && (
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

                            {config.showUrl && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide">Link</label>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder={config.urlPlaceholder}
                                        className="w-full border-[3px] border-ink bg-white px-3 py-2 font-medium shadow-hard-sm outline-none placeholder:text-ink/35 focus:-translate-y-0.5 focus:shadow-hard transition"
                                        disabled={isLoading}
                                        required={selectedType !== 'text'}
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
                                            <Upload size={28} className="mx-auto mb-2 text-ink/50" />
                                            <p className="font-medium text-ink/60">
                                                {file ? file.name : 'Click to upload or drag and drop'}
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-extrabold uppercase tracking-wide">
                                    {selectedType === 'text' ? 'Note' : 'Notes'}
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={config.placeholder}
                                    rows={5}
                                    className="w-full resize-none border-[3px] border-ink bg-white px-3 py-2 font-medium shadow-hard-sm outline-none placeholder:text-ink/35 focus:-translate-y-0.5 focus:shadow-hard transition"
                                    disabled={isLoading}
                                    required={selectedType === 'text' && !file}
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
                                    disabled={isLoading || (!content && !file && !url)}
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
