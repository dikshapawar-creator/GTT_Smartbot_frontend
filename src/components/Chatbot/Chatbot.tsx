'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Chatbot.module.css';
import LeadForm from './LeadForm';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type Message = {
    role: 'user' | 'assistant';
    text: string;
    type?: 'MESSAGE' | 'CTA';
    cta_label?: string;
    action?: string;
};

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showLeadForm, setShowLeadForm] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open && !isInitialized) {
            initSession();
        }
    }, [open, isInitialized]);

    const initSession = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/chat/session/init`, {
                method: 'POST',
                headers: { 'accept': 'application/json' },
                credentials: 'include',
            });

            if (!res.ok) {
                if (res.status === 429) throw new Error('Rate limit exceeded. Please try again later.');
                throw new Error('Failed to initialize session.');
            }

            const data = await res.json();
            setIsInitialized(true);
            if (data.message) {
                setMessages([{
                    role: 'assistant',
                    text: data.message,
                    type: data.type || 'MESSAGE',
                    cta_label: data.cta_label,
                    action: data.action
                }]);
            }
            // Auto-focus after init
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to connect to support.');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || !isInitialized) return;

        const userMsg: Message = { role: 'user', text };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/chat/message`, {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ message: text }),
            });

            if (!res.ok) {
                if (res.status === 401) {
                    setIsInitialized(false);
                    throw new Error('Session expired. Please restart the chat.');
                }
                if (res.status === 429) throw new Error('Rate limit exceeded. Please slow down.');
                throw new Error('Service unavailable. Please retry.');
            }

            const data = await res.json();
            setMessages((prev) => [...prev, {
                role: 'assistant',
                text: data.message,
                type: data.type || 'MESSAGE',
                cta_label: data.cta_label,
                action: data.action
            }]);
            // Keep focus on input
            setTimeout(() => inputRef.current?.focus(), 50);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndChat = async () => {
        setLoading(true);
        try {
            await fetch(`${API_BASE}/chat/session/end`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (err) {
            console.error('Failed to end session cleanly:', err);
        } finally {
            setMessages([]);
            setIsInitialized(false);
            setOpen(false);
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleAction = (action: string) => {
        if (action === 'OPEN_LEAD_FORM') {
            setShowLeadForm(true);
        }
    };

    return (
        <>
            {/* FAB */}
            <div className={styles.fabWrapper}>
                {!open && <div className={styles.tooltip}>Trade Support</div>}
                <button
                    className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
                    onClick={() => open ? handleClose() : setOpen(true)}
                    aria-label="Open Trade Support"
                >
                    {open ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Chat Panel — fixed 380x520, never resizes */}
            {open && (
                <div className={styles.panel}>
                    {/* Header */}
                    <div className={styles.panelHeader}>
                        <div className={styles.headerLeft}>
                            <div className={styles.headerIcon}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <div className={styles.headerTitle}>Trade Support</div>
                                <div className={styles.headerStatus}>
                                    <span className={styles.statusDot}></span>
                                    {isInitialized ? 'Online' : 'Connecting...'}
                                </div>
                            </div>
                        </div>
                        <div className={styles.headerActions}>
                            {isInitialized && (
                                <button
                                    className={styles.endChatBtn}
                                    onClick={handleEndChat}
                                    title="End Conversation"
                                >
                                    End Chat
                                </button>
                            )}
                            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages — scrollable only */}
                    <div className={styles.messages}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
                                <div className={styles.msgBubble}>
                                    {msg.text}
                                    {msg.type === 'CTA' && msg.cta_label && (
                                        <button
                                            className={styles.ctaBtn}
                                            onClick={() => msg.action && handleAction(msg.action)}
                                        >
                                            {msg.cta_label}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && !error && (
                            <div className={`${styles.message} ${styles.assistantMessage}`}>
                                <div className={styles.msgBubble}>
                                    <div className={styles.typing}>
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className={styles.errorBanner}>
                                <div className={styles.errorText}>{error}</div>
                                {!isInitialized && (
                                    <button className={styles.retryBtn} onClick={initSession}>
                                        Retry Connection
                                    </button>
                                )}
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input — fixed footer */}
                    <div className={styles.inputArea}>
                        <input
                            ref={inputRef}
                            className={styles.chatInput}
                            type="text"
                            placeholder={isInitialized ? 'Type your message...' : 'Initializing...'}
                            value={input}
                            disabled={!isInitialized || loading}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || !isInitialized || loading}
                            aria-label="Send"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {showLeadForm && (
                <LeadForm
                    apiBase={API_BASE}
                    onClose={() => setShowLeadForm(false)}
                    onSubmitSuccess={(message) => {
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            text: message,
                            type: 'MESSAGE'
                        }]);
                    }}
                />
            )}
        </>
    );
}
