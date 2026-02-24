'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './Chatbot.module.css';
import LeadForm from './LeadForm';

import { API_BASE } from '@/lib/config';

type ConversationStatus = 'bot' | 'waiting_for_agent' | 'human' | 'closed';

type BaseMessage = {
    id: string;
    role: 'bot' | 'user' | 'agent' | 'system';
};

type TextMessage = BaseMessage & {
    type: 'text';
    content: string;
};

type CtaMessage = BaseMessage & {
    type: 'cta';
    label: string;
    action: string;
};

type FormMessage = BaseMessage & {
    type: 'form';
    formType: 'demo';
};

type Message = TextMessage | CtaMessage | FormMessage;

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('Online');
    const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('bot');
    const [sessionToken, setSessionToken] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, open]);

    useEffect(() => {
        if (open && !isInitialized) {
            initSession();
        }
    }, [open, isInitialized]);

    // Update status based on initialization
    useEffect(() => {
        if (isInitialized && statusText !== 'Demo Submitted') {
            setStatusText('Online');
        } else if (!isInitialized) {
            setStatusText('Connecting...');
        }
    }, [isInitialized, statusText]);

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

            // Track conversation status from backend
            if (data.conversation_status) {
                if (data.session_token) setSessionToken(data.session_token);
                if (data.conversation_status) {
                    setConversationStatus(data.conversation_status);
                }
                if (data.conversation_status === 'waiting_for_agent') {
                    setStatusText('Waiting for Agent');
                    // WS connection is now handled by reactive useEffect
                } else if (data.conversation_status === 'human') {
                    setStatusText('Agent Connected');
                    // WS connection is now handled by reactive useEffect
                }
            }

            // ── Restore History ──────────────────────────────────────────
            const historyRes = await fetch(`${API_BASE}/chat/history`, {
                credentials: 'include',
            });

            let finalMessages: Message[] = [];

            if (historyRes.ok) {
                const history = await historyRes.json();
                if (history.length > 0) {
                    // Extract token and status from the first message
                    if (history[0].sessionId) setSessionToken(history[0].sessionId);
                    if (history[0].conversation_status) {
                        setConversationStatus(history[0].conversation_status);
                        if (history[0].conversation_status === 'waiting_for_agent') setStatusText('Waiting for Agent');
                        else if (history[0].conversation_status === 'human') setStatusText('Agent Connected');
                    }

                    finalMessages = history.map((m: { role?: string; message: string; sessionId?: string; conversation_status?: ConversationStatus }, idx: number) => ({
                        id: `${Date.now()}-h-${idx}`,
                        role: (m.role || 'bot') as 'bot' | 'user' | 'agent' | 'system',
                        type: 'text',
                        content: m.message
                    }));
                }
            }

            // ── Fallback to initial message if no history ───────────────
            if (finalMessages.length === 0) {
                if (data.message) {
                    finalMessages.push({
                        id: Date.now().toString() + '-text',
                        role: 'bot',
                        type: 'text',
                        content: data.message
                    });
                }

                if (data.type === 'CTA' && data.cta_label && data.action) {
                    finalMessages.push({
                        id: Date.now().toString() + '-cta',
                        role: 'bot',
                        type: 'cta',
                        label: data.cta_label,
                        action: data.action
                    });
                }
            }

            setMessages(finalMessages);
            // Auto-focus after init
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Unable to connect to support.');
        } finally {
            setLoading(false);
        }
    };

    // ── WebSocket connect for live agent chat ────────────────────────
    const connectClientWebSocket = (sessionId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const wsBase = API_BASE.replace(/^http/, 'ws');
        const ws = new WebSocket(
            `${wsBase}/ws/chat/${sessionId}?role=client&token=${sessionId}`
        );

        ws.onopen = () => console.log('Client WebSocket connected');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const role = data.sender === 'agent' ? 'agent' : data.sender === 'system' ? 'system' : 'bot';
                setMessages((prev) => [...prev, {
                    id: Date.now().toString() + '-ws',
                    role: role as 'agent' | 'system' | 'bot',
                    type: 'text',
                    content: data.message,
                }]);

                if (data.type === 'system' && data.message.includes('agent has joined')) {
                    setConversationStatus('human');
                    setStatusText('Agent Connected');
                }
            } catch {
                console.error('Failed to parse WS message');
            }
        };

        ws.onclose = () => console.log('Client WebSocket disconnected');
        ws.onerror = (err) => console.error('Client WebSocket error:', err);

        wsRef.current = ws;
    };

    // ── Cleanup WebSocket on unmount ───────────────────────────────
    // ── WebSocket Reactive Sync ─────────────────────────────────────
    useEffect(() => {
        if (conversationStatus !== 'bot' && isInitialized && !wsRef.current && sessionToken) {
            connectClientWebSocket(sessionToken);
        }

        return () => {
            if (wsRef.current && (conversationStatus === 'bot' || !isInitialized)) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [conversationStatus, isInitialized, sessionToken]);

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    const sendMessage = async (text: string) => {
        if (!text.trim() || !isInitialized) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            type: 'text',
            content: text
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        // ── WebSocket path: when agent is active ─────────────────
        if (conversationStatus !== 'bot' && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ message: text }));
            return;
        }

        // ── REST API path: normal bot mode ───────────────────────
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

            // Track status changes from API response
            if (data.conversation_status && data.conversation_status !== conversationStatus) {
                setConversationStatus(data.conversation_status);
            }

            const newBotMessages: Message[] = [];

            // Push text response
            if (data.message) {
                newBotMessages.push({
                    id: Date.now().toString() + '-reply',
                    role: 'bot',
                    type: 'text',
                    content: data.message
                });
            }

            // Push CTA if present
            if (data.type === 'CTA' && data.cta_label && data.action) {
                newBotMessages.push({
                    id: Date.now().toString() + '-cta-reply',
                    role: 'bot',
                    type: 'cta',
                    label: data.cta_label,
                    action: data.action
                });
            }

            setMessages((prev) => [...prev, ...newBotMessages]);
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
            // Push form message to chat instead of modal
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'bot',
                type: 'form',
                formType: 'demo'
            }]);
        }
    };

    const handleFormSuccess = (message: string) => {
        // Add success message from bot
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'bot',
            type: 'text',
            content: message
        }]);
        setStatusText('Waiting for Agent');
        setConversationStatus('waiting_for_agent');
        // WebSocket will auto-connect via reactive useEffect
    };

    const renderMessage = (msg: Message) => {
        switch (msg.type) {
            case 'text':
                return (
                    <div className={`${styles.message} ${msg.role === 'user'
                        ? styles.userMessage
                        : msg.role === 'agent'
                            ? styles.agentMessage
                            : msg.role === 'system'
                                ? styles.liveSystemMessage
                                : styles.assistantMessage
                        }`}>
                        {msg.role === 'agent' && (
                            <div className={styles.agentLabel}>Sales Agent</div>
                        )}
                        {msg.role === 'system' && (
                            <div className={styles.systemLabel}>System</div>
                        )}
                        <div className={styles.msgBubble}>
                            {msg.content}
                        </div>
                    </div>
                );
            case 'cta':
                return (
                    <div className={`${styles.message} ${styles.assistantMessage}`}>
                        <div className={styles.ctaCard}>
                            <button
                                className={styles.ctaCardButton}
                                onClick={() => handleAction(msg.action)}
                            >
                                {msg.label}
                            </button>
                        </div>
                    </div>
                );
            case 'form':
                return (
                    <div className={`${styles.message} ${styles.assistantMessage}`} style={{ width: '100%', maxWidth: '100%' }}>
                        <LeadForm
                            apiBase={API_BASE}
                            onClose={() => { }} // No close needed for inline
                            onSubmitSuccess={handleFormSuccess}
                        />
                    </div>
                );
            default:
                return null;
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
                    aria-label="Open GTD Support"
                >
                    {open ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <div className="relative w-8 h-8">
                            <Image
                                src="/logo.png"
                                alt="GTD Logo"
                                fill
                                className="object-contain inverted-logo"
                            />
                        </div>
                    )}
                </button>
            </div>

            {/* Chat Panel — fixed 380x520, never resizes */}
            {open && (
                <div className={styles.panel}>
                    {/* Header */}
                    <div className={styles.panelHeader}>
                        <div className={styles.headerLeft}>
                            <Image
                                src="/logo.png"
                                alt="GTD Support"
                                width={90}
                                height={28}
                                className="object-contain inverted-logo"
                            />
                            <div>
                                <div className={styles.headerTitle}>GTD Support</div>
                                <div className={styles.headerStatus}>
                                    <span className={`${styles.statusDot} ${statusText === 'Demo Submitted' ? styles.statusDotGreen : ''}`}></span>
                                    {statusText}
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
                        {messages.map((msg) => (
                            <div key={msg.id} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                                {renderMessage(msg)}
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
                            placeholder={statusText === 'Demo Submitted' ? 'Thank you! We will contact you soon.' : (isInitialized ? 'Type your message...' : 'Initializing...')}
                            value={input}
                            disabled={!isInitialized || loading || statusText === 'Demo Submitted'}
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
        </>
    );
}
