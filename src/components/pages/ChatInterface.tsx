'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react';

interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sources?: Array<{
        title: string;
        type: string;
        id: string;
    }>;
}interface ChatInterfaceProps {
    isOpen: boolean;
    onClose: () => void;
    isMinimized: boolean;
    onToggleMinimize: () => void;
}

export default function ChatInterface({ isOpen, onClose, isMinimized, onToggleMinimize }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            type: 'assistant',
            content: 'Hello! I\'m your AI assistant. I can help you search through your knowledge base and answer questions about your stored content. What would you like to know?',
            timestamp: new Date().toISOString()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: inputMessage,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputMessage
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: data.answer,
                timestamp: new Date().toISOString(),
                sources: data.sources || []
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'Sorry, I encountered an error while processing your request. Please try again.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
            }`}>
            <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/50 rounded-2xl shadow-2xl flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2">
                            <MessageSquare size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">AI Assistant</h3>
                            <p className="text-gray-400 text-xs">Ask about your content</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={onToggleMinimize}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                        >
                            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-all duration-200"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {!isMinimized && (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex items-start space-x-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    {message.type === 'assistant' && (
                                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2 flex-shrink-0">
                                            <Bot size={16} className="text-white" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[280px] rounded-2xl p-3 ${message.type === 'user'
                                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                            : 'bg-gray-800/50 text-gray-100 border border-gray-700/50'
                                            }`}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                                        {message.sources && message.sources.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-gray-600/30">
                                                <p className="text-xs text-gray-400 mb-1">Sources:</p>
                                                <div className="space-y-1">
                                                    {message.sources.map((source, index) => (
                                                        <div
                                                            key={index}
                                                            className="text-xs bg-gray-700/30 rounded px-2 py-1 border border-gray-600/30"
                                                        >
                                                            <span className="text-purple-400">{source.type}</span>: {source.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-xs opacity-60 mt-2">
                                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>

                                    {message.type === 'user' && (
                                        <div className="bg-gray-700 rounded-full p-2 flex-shrink-0">
                                            <User size={16} className="text-white" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex items-start space-x-3">
                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-2 flex-shrink-0">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-3">
                                        <div className="flex items-center space-x-2">
                                            <Loader size={16} className="animate-spin text-purple-400" />
                                            <p className="text-sm text-gray-400">Thinking...</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-700/50">
                            <div className="flex items-center space-x-3">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputMessage}
                                    onChange={(e) => setInputMessage(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask about your content..."
                                    className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded-xl px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/50 transition-colors duration-200 text-sm"
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!inputMessage.trim() || isLoading}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-2 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
