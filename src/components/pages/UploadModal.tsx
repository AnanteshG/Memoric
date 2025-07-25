'use client';

import { useState } from 'react';
import { Upload, FileText, Link, AlertCircle, CheckCircle, Loader, Image as ImageIcon, MessageSquare, Youtube, Globe, ChevronDown } from 'lucide-react';

interface UploadModalProps {
    type?: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (data: any) => void;
}

export default function UploadModal({ type: initialType, isOpen, onClose, onSuccess }: UploadModalProps) {
    const [selectedType, setSelectedType] = useState(initialType || 'text');
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const contentTypes = [
        { id: 'text', label: 'Text Note', icon: FileText, description: 'Write notes and ideas' },
        { id: 'image', label: 'Image', icon: ImageIcon, description: 'Upload images with descriptions' },
        { id: 'tweet', label: 'X Post', icon: MessageSquare, description: 'Save X posts or threads' },
        { id: 'reddit', label: 'Reddit Post', icon: Globe, description: 'Save Reddit posts and discussions' },
        { id: 'youtube', label: 'YouTube Video', icon: Youtube, description: 'Save videos for later reference' },
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            let finalContent = content;
            let finalTitle = title;

            // Handle file upload for documents and images
            if (file && (selectedType === 'document' || selectedType === 'image')) {
                const formData = new FormData();
                formData.append('file', file);

                // Upload file first (you'd implement file upload endpoint)
                // For now, we'll use file name as content
                finalContent = file.name;
                finalTitle = finalTitle || file.name;
            }

            // Handle URL-based content
            if (url && (selectedType === 'tweet' || selectedType === 'reddit' || selectedType === 'youtube')) {
                finalContent = content || url;
                finalTitle = finalTitle || `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} content`;
            }

            const response = await fetch('/api/content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: selectedType,
                    content: finalContent,
                    title: finalTitle,
                    url: url || undefined,
                    metadata: {
                        fileName: file?.name,
                        fileSize: file?.size,
                        fileType: file?.type,
                    }
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
            }, 1500);

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

    const getTypeConfig = () => {
        switch (selectedType) {
            case 'document':
                return {
                    title: 'Upload Document',
                    description: 'Upload PDF, DOCX, or TXT files',
                    placeholder: 'Describe your document...',
                    showFile: true,
                    showUrl: false,
                    acceptedFiles: '.pdf,.doc,.docx,.txt'
                };
            case 'tweet':
                return {
                    title: 'Save Tweet',
                    description: 'Save X posts or threads',
                    placeholder: 'Paste tweet content or add notes...',
                    showFile: false,
                    showUrl: true,
                    urlPlaceholder: 'https://x.com/...'
                };
            case 'reddit':
                return {
                    title: 'Save Reddit Post',
                    description: 'Save Reddit posts and discussions',
                    placeholder: 'Add notes about this Reddit post...',
                    showFile: false,
                    showUrl: true,
                    urlPlaceholder: 'https://reddit.com/r/...'
                };
            case 'youtube':
                return {
                    title: 'Save YouTube Video',
                    description: 'Save videos for later reference',
                    placeholder: 'Add notes about this video...',
                    showFile: false,
                    showUrl: true,
                    urlPlaceholder: 'https://youtube.com/watch?v=...'
                };
            case 'image':
                return {
                    title: 'Upload Image',
                    description: 'Upload images with descriptions',
                    placeholder: 'Describe this image...',
                    showFile: true,
                    showUrl: false,
                    acceptedFiles: '.jpg,.jpeg,.png,.gif,.webp'
                };
            case 'text':
                return {
                    title: 'Create Note',
                    description: 'Write notes and ideas',
                    placeholder: 'Write your note here...',
                    showFile: false,
                    showUrl: false
                };
            default:
                return {
                    title: 'Add Content',
                    description: 'Add new content to your knowledge base',
                    placeholder: 'Enter content...',
                    showFile: false,
                    showUrl: false
                };
        }
    };

    const config = getTypeConfig();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900/95 border border-gray-700/50 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {success ? (
                    <div className="text-center py-8">
                        <CheckCircle size={64} className="text-green-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Content Saved Successfully!</h3>
                        <p className="text-gray-400">Your content has been processed and added to your knowledge base.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-white">{config.title}</h2>
                                <p className="text-gray-400 text-sm">{config.description}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-gray-400 hover:text-white transition-colors duration-200"
                                disabled={isLoading}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Content Type Dropdown */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Content Type
                                </label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white flex items-center justify-between hover:border-gray-500 transition-colors duration-200"
                                    >
                                        <div className="flex items-center space-x-2">
                                            {(() => {
                                                const currentType = contentTypes.find(t => t.id === selectedType);
                                                const IconComponent = currentType?.icon || FileText;
                                                return (
                                                    <>
                                                        <IconComponent size={16} className="text-purple-400" />
                                                        <span>{currentType?.label || 'Select Type'}</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showTypeDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showTypeDropdown && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                                            {contentTypes.map((type) => {
                                                const IconComponent = type.icon;
                                                return (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedType(type.id);
                                                            setShowTypeDropdown(false);
                                                            // Reset form when type changes
                                                            setContent('');
                                                            setTitle('');
                                                            setUrl('');
                                                            setFile(null);
                                                        }}
                                                        className={`w-full flex items-center space-x-3 px-3 py-3 text-left hover:bg-gray-700 transition-colors duration-200 ${selectedType === type.id ? 'bg-gray-700' : ''
                                                            }`}
                                                    >
                                                        <IconComponent size={16} className="text-purple-400" />
                                                        <div>
                                                            <div className="text-white font-medium">{type.label}</div>
                                                            <div className="text-gray-400 text-xs">{type.description}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedType !== 'tweet' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter a title..."
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-colors duration-200"
                                        disabled={isLoading}
                                    />
                                </div>
                            )}

                            {config.showUrl && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        URL
                                    </label>
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder={config.urlPlaceholder}
                                        className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-colors duration-200"
                                        disabled={isLoading}
                                        required={selectedType !== 'text'}
                                    />
                                </div>
                            )}

                            {config.showFile && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        File
                                    </label>
                                    <div className="border-2 border-dashed border-gray-600/50 rounded-lg p-6 text-center">
                                        <input
                                            type="file"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            accept={config.acceptedFiles}
                                            className="hidden"
                                            id="file-upload"
                                            disabled={isLoading}
                                        />
                                        <label htmlFor="file-upload" className="cursor-pointer">
                                            <Upload size={32} className="text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-400">
                                                {file ? file.name : 'Click to upload or drag and drop'}
                                            </p>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Content / Notes
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder={config.placeholder}
                                    rows={6}
                                    className="w-full bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-colors duration-200 resize-none"
                                    disabled={isLoading}
                                    required={selectedType === 'text' && !file}
                                />
                            </div>

                            {error && (
                                <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors duration-200"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading || (!content && !file && !url)}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                                >
                                    {isLoading && <Loader size={16} className="animate-spin" />}
                                    <span>{isLoading ? 'Processing...' : 'Save Content'}</span>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
