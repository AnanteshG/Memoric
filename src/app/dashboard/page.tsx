'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
    FileText,
    Twitter,
    Youtube,
    Link,
    MessageSquare,
    Upload,
    Plus,
    Search,
    Filter
} from 'lucide-react';

export default function Dashboard() {
    const { user } = useUser();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('all');

    const contentTypes = [
        { id: 'all', label: 'All Content', icon: FileText },
        { id: 'documents', label: 'Documents', icon: FileText },
        { id: 'tweets', label: 'X Posts', icon: Twitter },
        { id: 'youtube', label: 'YouTube', icon: Youtube },
        { id: 'links', label: 'Web Links', icon: Link },
        { id: 'notes', label: 'Notes', icon: MessageSquare },
    ];

    const addOptions = [
        { id: 'document', label: 'Upload Document', icon: FileText, color: 'bg-blue-500' },
        { id: 'tweet', label: 'Add X Post', icon: Twitter, color: 'bg-blue-400' },
        { id: 'youtube', label: 'YouTube Link', icon: Youtube, color: 'bg-red-500' },
        { id: 'link', label: 'Web Link', icon: Link, color: 'bg-green-500' },
        { id: 'note', label: 'Add Note', icon: MessageSquare, color: 'bg-purple-500' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <nav className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                        >
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"></div>
                            <span className="text-xl font-bold">Memoric</span>
                        </button>
                        <span className="text-gray-400">|</span>
                        <h1 className="text-xl font-semibold text-gray-900">My Space</h1>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600">Welcome, {user?.firstName}!</span>
                        <UserButton />
                    </div>
                </div>
            </nav>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
                    <div className="space-y-2">
                        {contentTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                                <button
                                    key={type.id}
                                    onClick={() => setActiveTab(type.id)}
                                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${activeTab === type.id
                                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span>{type.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8">
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Quick Add</h3>
                        <div className="space-y-2">
                            {addOptions.map((option) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.id}
                                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-600 hover:bg-gray-50`}
                                    >
                                        <div className={`w-6 h-6 ${option.color} rounded flex items-center justify-center`}>
                                            <Icon size={14} className="text-white" />
                                        </div>
                                        <span className="text-sm">{option.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {contentTypes.find(t => t.id === activeTab)?.label}
                            </h2>
                            <p className="text-gray-600 mt-1">Manage your stored content and chat with your data</p>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search content..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                                <Filter size={18} />
                                <span>Filter</span>
                            </button>
                            <button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                <Plus size={18} />
                                <span>Add Content</span>
                            </button>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="bg-white rounded-lg border border-gray-200 p-8">
                        <div className="text-center">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Upload size={32} className="text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No content yet</h3>
                            <p className="text-gray-600 mb-6">
                                Start building your knowledge base by adding documents, notes, links, and more.
                            </p>
                            <button className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 mx-auto">
                                <Plus size={18} />
                                <span>Add Your First Content</span>
                            </button>
                        </div>
                    </div>

                    {/* Chat Section */}
                    <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Chat with Your Data</h3>
                        <div className="flex space-x-3">
                            <input
                                type="text"
                                placeholder="Ask anything about your stored content..."
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                            <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                                Ask AI
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                            Add some content first to start chatting with your data
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
