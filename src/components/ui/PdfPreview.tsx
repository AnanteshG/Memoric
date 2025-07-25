'use client';

import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface PdfPreviewProps {
    url: string;
    title?: string;
    onClick?: () => void;
    className?: string;
}

export default function PdfPreview({
    url,
    title = "PDF Document",
    onClick,
    className = ""
}: PdfPreviewProps) {
    const [isClient, setIsClient] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadMethod, setLoadMethod] = useState<'direct' | 'google'>('direct');

    useEffect(() => {
        setIsClient(true);
    }, []);

    const getPdfViewerUrl = () => {
        if (loadMethod === 'google') {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
        }
        return `${url}#view=FitH&pagemode=none&scrollbar=0&toolbar=0&navpanes=0&page=1`;
    };

    const handlePdfError = () => {
        if (loadMethod === 'direct') {
            setLoadMethod('google');
        } else {
            setError('Failed to load PDF preview');
        }
    };

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            window.open(url, '_blank');
        }
    };

    if (!isClient) {
        return (
            <div
                className={`relative w-full h-32 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}
            >
                <FileText size={32} className="text-gray-400" />
            </div>
        );
    }

    return (
        <div
            className={`relative w-full h-32 rounded-lg overflow-hidden cursor-pointer group transition-all duration-200 hover:scale-[1.02] hover:shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}
            onClick={handleClick}
        >
            {url ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 relative">
                    {/* PDF Embed Preview */}
                    <iframe
                        key={loadMethod} // Force reload when method changes
                        src={getPdfViewerUrl()}
                        className="w-full h-full border-0 pointer-events-none"
                        onError={handlePdfError}
                        onLoad={() => setError(null)}
                        title="PDF Preview"
                    />

                    {/* Loading overlay */}
                    <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center opacity-0 animate-pulse">
                        <div className="flex flex-col items-center space-y-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
                            <span className="text-xs text-gray-500">Loading PDF...</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-500/10 via-blue-600/15 to-indigo-700/20">
                    <div className="bg-cyan-500/10 p-3 rounded-xl mb-2 group-hover:bg-cyan-500/20 transition-colors duration-200">
                        <FileText size={32} className="text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <span className="text-sm font-medium text-center px-2 text-cyan-600 dark:text-cyan-400">{title}</span>
                    <span className="text-xs opacity-70 mt-1 text-cyan-600 dark:text-cyan-400">Click to view</span>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-50 dark:bg-cyan-900/20">
                    <FileText size={32} className="text-cyan-500 mb-2" />
                    <span className="text-xs text-cyan-600 dark:text-cyan-400 text-center px-2">{error}</span>
                </div>
            )}

            {/* PDF File Type Badge */}
            <div className="absolute top-2 right-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs px-2 py-1 rounded-md font-medium shadow-lg z-10">
                PDF
            </div>

            {/* Hover overlay with external link icon */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center z-10">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                    <ExternalLink size={16} className="text-gray-700 dark:text-gray-300" />
                </div>
            </div>
        </div>
    );
}