'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './Chatbot.module.css';
import dynamic from 'next/dynamic';
import {
    Maximize,
    X,
    Send,
    LogOut
} from 'lucide-react';

const LeadForm = dynamic(() => import('./LeadForm'), {
    ssr: false,
    loading: () => <div className={styles.formWrap}>Loading form...</div>
});

import { WS_BASE } from '@/lib/config';
import api, { API_BASE } from '@/config/api';
import axios from 'axios';

// ── Enterprise Error Helper ───────────────────────────────────────────────
// NEVER expose raw server errors (SQL, stack traces) to the user.
// Always return a short, friendly message regardless of what the server sent.
function toFriendlyError(err: unknown): string {
    if (axios.isAxiosError(err)) {
        // Use the backend's own friendly message if it set one (our new format)
        const serverMsg = err.response?.data?.message;
        if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 120) {
            return serverMsg;
        }
        // Network-level error (no response received)
        if (!err.response) return 'Unable to connect. Please check your connection.';
        // HTTP error without a clean message — generic
        return 'Something went wrong. Please try again.';
    }
    return 'Unable to connect to support.';
}

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

    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // ── Chat-specific API helper: sends session UUID as Bearer token ──
    const chatApi = useCallback((sessionUUID: string) => ({
        get: (url: string) => axios.get(`${API_BASE}${url}`, {
            withCredentials: true,
            headers: { 'Authorization': `Bearer ${sessionUUID}`, 'Content-Type': 'application/json' }
        }),
        post: (url: string, data?: unknown) => axios.post(`${API_BASE}${url}`, data, {
            withCredentials: true,
            headers: { 'Authorization': `Bearer ${sessionUUID}`, 'Content-Type': 'application/json' }
        }),
    }), []);

    const initSession = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let visitor_uuid = localStorage.getItem("visitor_uuid");
            if (!visitor_uuid) {
                visitor_uuid = crypto.randomUUID();
                localStorage.setItem("visitor_uuid", visitor_uuid);
            }

            const res = await api.post('/chat/session/init', { visitor_uuid });
            const data = res.data;
            setIsInitialized(true);

            if (data.session_token) setSessionToken(data.session_token);
            if (data.conversation_status) {
                const normalizedStatus = data.conversation_status.toLowerCase() as ConversationStatus;
                setConversationStatus(normalizedStatus);
                if (normalizedStatus === 'waiting_for_agent') {
                    setStatusText('Waiting for Agent');
                } else if (normalizedStatus === 'human') {
                    setStatusText('Agent Connected');
                }
            }

            // ── Restore History using session UUID as auth ────────────────
            const sessionUUID = data.session_token;
            const historyRes = await chatApi(sessionUUID).get('/chat/history');
            const history = historyRes.data;
            let finalMessages: Message[] = [];

            if (history && history.length > 0) {
                if (history[0].sessionId) setSessionToken(history[0].sessionId);
                if (history[0].conversation_status) {
                    const normalizedStatus = history[0].conversation_status.toLowerCase() as ConversationStatus;
                    setConversationStatus(normalizedStatus);
                    if (normalizedStatus === 'waiting_for_agent') setStatusText('Waiting for Agent');
                    else if (normalizedStatus === 'human') setStatusText('Agent Connected');
                }

                finalMessages = history.map((m: { role?: string; message: string }, idx: number) => ({
                    id: `${Date.now()}-h-${idx}`,
                    role: (m.role || 'bot') as 'bot' | 'user' | 'agent' | 'system',
                    type: 'text',
                    content: m.message
                }));

                // Visual separator for returning visitor history
                if (data.message === "Welcome back 👋 How can I help today?") {
                    finalMessages.push({
                        id: Date.now().toString() + '-sep',
                        role: 'system',
                        type: 'text',
                        content: '----- Previous Conversation -----'
                    });
                }
            }

            // Always push the init message if it's a brand new session or a returning visitor
            if (finalMessages.length === 0 || data.message === "Welcome back 👋 How can I help today?") {
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
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: unknown) {
            setError(toFriendlyError(err));
        } finally {
            setLoading(false);
        }
    }, [chatApi]);

    // Update status based on initialization
    useEffect(() => {
        if (isInitialized && statusText !== 'Demo Submitted') {
            setStatusText('Online');
        } else if (!isInitialized) {
            setStatusText('Connecting...');
        }
    }, [isInitialized, statusText]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, open]);

    useEffect(() => {
        if (open && !isInitialized) {
            initSession();
        }
    }, [open, isInitialized, initSession]);

    // ── WebSocket connect for live agent chat ────────────────────────
    const connectClientWebSocket = (sessionId: string) => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const ws = new WebSocket(
            `${WS_BASE}/ws/chat/${sessionId}?role=client&token=${sessionId}`
        );

        ws.onopen = () => console.log('Client WebSocket connected');

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'typing') {
                    setIsAgentTyping(data.is_typing);
                    if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
                    if (data.is_typing) {
                        agentTypingTimeoutRef.current = setTimeout(() => setIsAgentTyping(false), 3000);
                    }
                    return;
                }

                const role = data.sender === 'agent' ? 'agent' : data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : 'bot';
                setMessages((prev) => [...prev, {
                    id: Date.now().toString() + '-ws',
                    role: role as 'agent' | 'user' | 'system' | 'bot',
                    type: 'text',
                    content: data.message,
                }]);

                if (data.type === 'system' && (data.message.includes('agent has joined') || (data.sender === 'system' && data.message.includes('joined')))) {
                    setConversationStatus('human');
                    setStatusText('Agent Connected');
                }

                if (data.type === 'system' && (data.mode === 'BOT' || data.message.includes('agent has left') || data.message.includes('assistant has resumed'))) {
                    setConversationStatus('bot');
                    setStatusText('Online');
                }
            } catch {
                console.error('Failed to parse WS message');
            }
        };

        ws.onclose = () => console.log('Client WebSocket disconnected');
        ws.onerror = (err) => console.error('Client WebSocket error:', err);

        wsRef.current = ws;
    };

    // ── WebSocket Reactive Sync ─────────────────────────────────────
    useEffect(() => {
        // Connect to WS immediately to listen for agent joins/messages
        if (isInitialized && !wsRef.current && sessionToken) {
            connectClientWebSocket(sessionToken);
        }

        return () => {
            if (wsRef.current && !isInitialized) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isInitialized, sessionToken]);

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
        };
    }, []);

    const sendTypingStatus = (isTyping: boolean) => {
        if (isInitialized && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                is_typing: isTyping
            }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        sendTypingStatus(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 2000);
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || !isInitialized) return;

        sendTypingStatus(false);
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
            const res = await chatApi(sessionToken!).post('/chat/message', { message: text });
            const data = res.data;

            if (data.conversation_status) {
                const normalizedStatus = data.conversation_status.toLowerCase() as ConversationStatus;
                if (normalizedStatus !== conversationStatus) {
                    setConversationStatus(normalizedStatus);
                }
            }

            const newBotMessages: Message[] = [];

            if (data.message) {
                newBotMessages.push({
                    id: Date.now().toString() + '-reply',
                    role: 'bot',
                    type: 'text',
                    content: data.message
                });
            }

            // Trigger Lead Form if backend flag is true
            if (data.show_lead_form) {
                newBotMessages.push({
                    id: Date.now().toString() + '-form',
                    role: 'bot',
                    type: 'form',
                    formType: 'demo'
                });
            }

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
            setTimeout(() => inputRef.current?.focus(), 50);
        } catch (err: unknown) {
            setError(toFriendlyError(err));
        } finally {
            setLoading(false);
        }
    };

    // ── Talk to Sales: dedicated handler to avoid confusing bot API response ──
    const handleTalkToSales = async () => {
        if (!isInitialized) return;

        // 1. Show the user's message in chat
        const userMsg: Message = {
            id: Date.now().toString() + '-u',
            role: 'user',
            type: 'text',
            content: 'Talk to Sales'
        };
        setMessages((prev) => [...prev, userMsg]);

        // 2. Immediately show a friendly connecting message — no waiting for API
        const botMsg: Message = {
            id: Date.now().toString() + '-b',
            role: 'bot',
            type: 'text',
            content: "Great! I'm connecting you with our sales team right away. Please hold on a moment — an agent will be with you shortly."
        };
        setMessages((prev) => [...prev, botMsg]);
        setConversationStatus('waiting_for_agent');
        setStatusText('Waiting for Agent');

        // 3. Notify backend silently (ignore its response text to avoid duplicate/confusing messages)
        try {
            await chatApi(sessionToken!).post('/chat/message', { message: 'Talk to Sales' });
        } catch (err) {
            console.error('Failed to register talk-to-sales with backend:', err);
        }
    };

    const handleEndChat = async () => {
        setLoading(true);
        try {
            await api.post('/chat/session/end');
        } catch (err) {
            console.error('Failed to end session cleanly:', err);
        } finally {
            setMessages([]);
            setIsInitialized(false);
            setOpen(false);
            setLoading(false);
            window.parent.postMessage({ type: 'gtt-widget-resize', open: false }, '*');
        }
    };

    const handleClose = () => {
        setOpen(false);
        window.parent.postMessage({ type: 'gtt-widget-resize', open: false }, '*');
    };

    const handleAction = (action: string) => {
        if (action === 'OPEN_LEAD_FORM') {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'bot',
                type: 'form',
                formType: 'demo'
            }]);
        }
    };

    const handleFormSuccess = (message: string) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'bot',
            type: 'text',
            content: message
        }]);
        setStatusText('Waiting for Agent');
        setConversationStatus('waiting_for_agent');
    };

    const renderMessage = (msg: Message) => {
        switch (msg.type) {
            case 'text':
                if (!msg.content.trim()) return null;
                return (
                    <div className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot}`}>
                        {msg.role !== 'user' && (
                            <div className={styles.botAvatar}>
                                <Image src="/logo.png" alt="GTD" width={18} height={18} className="object-contain inverted-logo" />
                            </div>
                        )}
                        <div className={`${styles.bubble} ${msg.role === 'user'
                            ? styles.bubbleUser
                            : msg.role === 'agent'
                                ? styles.bubbleAgent
                                : msg.role === 'system'
                                    ? styles.bubbleSystem
                                    : styles.bubbleBot
                            }`}>
                            {msg.role === 'agent' && <div className={styles.agentLabel}>Sales Agent</div>}
                            {msg.content}
                        </div>
                    </div>
                );
            case 'cta':
                return (
                    <div className={styles.messageRow}>
                        <div className={styles.botAvatar}>
                            <Image src="/logo.png" alt="GTD" width={18} height={18} className="object-contain inverted-logo" />
                        </div>
                        <div className={styles.ctaWrap}>
                            <button
                                className={styles.ctaBtn}
                                onClick={() => handleAction(msg.action)}
                            >
                                {msg.label}
                            </button>
                        </div>
                    </div>
                );
            case 'form':
                return (
                    <div className={styles.formWrap}>
                        <LeadForm
                            onClose={() => { }}
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
            {/* ── FAB ─────────────────────────────────────────────────── */}
            {!open && (
                <div className={styles.fabWrapper}>
                    <div className={styles.fabTooltip}>Trade Support</div>
                    <button
                        className={styles.fab}
                        onClick={() => {
                            setOpen(true);
                            window.parent.postMessage({ type: 'gtt-widget-resize', open: true }, '*');
                        }}
                        aria-label="Open GTD Support"
                    >
                        <div className="relative w-8 h-8">
                            <Image
                                src="/logo.png"
                                alt="GTD Logo"
                                fill
                                className="object-contain inverted-logo"
                            />
                        </div>
                    </button>
                </div>
            )}

            {/* ── Chat Panel ───────────────────────────────────────────── */}
            {open && (
                <div className={styles.panel}>

                    {/* HEADER */}
                    <div className={styles.header}>
                        <div className={styles.headerLeft}>
                            <div className={styles.headerAvatar}>
                                <Image
                                    src="/logo.png"
                                    alt="GTD Support"
                                    width={36}
                                    height={36}
                                    className="object-contain"
                                />
                            </div>
                            <div className={styles.headerInfo}>
                                <div className={styles.headerTitle}>GTD Support</div>
                                <div className={styles.headerStatus}>
                                    <span className={styles.statusDot}></span>
                                    <span className={styles.statusLabel}>{statusText}</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.headerRight}>
                            <button
                                className={styles.headerIconBtn}
                                onClick={handleEndChat}
                                title="End Chat"
                                aria-label="End Chat"
                            >
                                <LogOut size={16} />
                            </button>
                            <button
                                className={styles.closeBtn}
                                onClick={handleClose}
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* BODY — scrollable messages */}
                    <div className={styles.body}>

                        {/* Welcome bubble — always shown at top */}
                        <div className={styles.welcomeRow}>
                            <div className={styles.botAvatar}>
                                <Image src="/logo.png" alt="GTD" width={18} height={18} className="object-contain inverted-logo" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '80%' }}>
                                <div className={styles.welcomeBubble} style={{ maxWidth: '100%' }}>
                                    <p className={styles.welcomeLine1}>Welcome to GTD Service.</p>
                                    <p className={styles.welcomeLine2}>Please let me know how I can assist you.</p>
                                </div>
                                {messages.length <= 1 && conversationStatus === 'bot' && (
                                    <div className={styles.quickGrid}>
                                        <button className={styles.quickBtn} onClick={() => handleAction('OPEN_LEAD_FORM')}>
                                            <span className={styles.quickIcon}>🚀</span>
                                            <span className={styles.quickLabel}>Request Demo</span>
                                        </button>
                                        <button className={styles.quickBtn} onClick={() => handleTalkToSales()}>
                                            <span className={styles.quickIcon}>💬</span>
                                            <span className={styles.quickLabel}>Talk to Sales</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        {messages.slice(1).map((msg) => (
                            <div key={msg.id}>
                                {renderMessage(msg)}
                            </div>
                        ))}

                        {/* Agent Typing indicator */}
                        {isAgentTyping && (
                            <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                                <div className={styles.botAvatar}>
                                    <Image src="/logo.png" alt="GTD" width={18} height={18} className="object-contain inverted-logo" />
                                </div>
                                <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                                    <div className={styles.typing}>
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Typing indicator (General fallback) */}
                        {loading && !error && (
                            <div className={`${styles.messageRow} ${styles.messageRowBot}`}>
                                <div className={styles.botAvatar}>
                                    <Image src="/logo.png" alt="GTD" width={18} height={18} className="object-contain inverted-logo" />
                                </div>
                                <div className={`${styles.bubble} ${styles.bubbleBot}`}>
                                    <div className={styles.typing}>
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error — always show a safe, generic message, never raw server errors */}
                        {error && (
                            <div className={styles.errorBanner}>
                                <span>{error}</span>
                                {!isInitialized && (
                                    <button className={styles.retryBtn} onClick={() => { setError(null); initSession(); }}>
                                        Try Again
                                    </button>
                                )}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* FOOTER */}
                    <div className={styles.footer}>
                        <div className={styles.inputWrap}>
                            <input
                                ref={inputRef}
                                className={styles.chatInput}
                                type="text"
                                placeholder={
                                    statusText === 'Demo Submitted'
                                        ? 'Thank you!'
                                        : 'Type your message...'
                                }
                                value={input}
                                disabled={!isInitialized || loading || statusText === 'Demo Submitted'}
                                onChange={handleInputChange}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim() || !isInitialized || loading}
                                aria-label="Send"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
