'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './Chatbot.module.css';
import dynamic from 'next/dynamic';
import {
    X,
    Send,
    LogOut
} from 'lucide-react';

const LeadForm = dynamic(() => import('./LeadForm'), {
    ssr: false,
    loading: () => <div className={styles.formWrap}>Loading form...</div>
});

import { WS_BASE } from '@/lib/config';
import { wsManager } from '@/lib/wsManager';
import api, { API_BASE } from '@/config/api';
import axios from 'axios';
import { formatToIST, getSyncedNow } from '@/lib/time';

// ── Generic Resilience Helpers ───────────────────────────────────────────
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        try { return crypto.randomUUID(); } catch { /* fallback */ }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

const safeStorage = {
    get: (key: string) => {
        try {
            if (typeof window !== 'undefined') {
                const value = localStorage.getItem(key);
                console.log(`[Storage] GET ${key}:`, value);
                return value;
            }
            return null;
        } catch { return null; }
    },
    set: (key: string, val: string) => {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(key, val);
                console.log(`[Storage] SET ${key}:`, val);
            }
        } catch { /* ignore */ }
    }
};

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
    created_at_ist?: string;
    message?: string; // History data from backend uses 'message'
    type?: string;
};

type TextMessage = BaseMessage & {
    type: 'text';
    content: string;
};

type CtaMessage = BaseMessage & {
    type: 'cta';
    label?: string;
    action?: string;
    ctas?: { label: string; action: string; icon?: string; type?: string }[];
};

type FormMessage = BaseMessage & {
    type: 'form';
    formType: 'demo';
    content?: string;
};

type Message = TextMessage | CtaMessage | FormMessage;

interface SessionInitData {
    session_token: string;
    message?: string;
    server_time_utc?: string;
    type?: string;
    ctas?: { label: string; action: string; icon?: string; type?: string }[];
    cta_label?: string;
    action?: string;
    conversation_status?: string;
}



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
    const [visitorUuid, setVisitorUuid] = useState<string | null>(null);
    const [serverOffset, setServerOffset] = useState<number>(0);

    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
    const messagesRef = useRef(messages);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // ── Inactivity Timer Removed (Backend handles this now) ──

    // ── Chat-specific API helper: sends session UUID as Bearer token ──
    const chatApi = useCallback((sessionUUID: string) => ({
        get: (url: string) => {
            const t0 = Date.now();
            return axios.get(`${API_BASE}${url}`, {
                withCredentials: true,
                headers: { 'Authorization': `Bearer ${sessionUUID}`, 'Content-Type': 'application/json' }
            }).then(res => ({ ...res, t0, t1: Date.now() }));
        },
        post: (url: string, data?: unknown) => {
            const t0 = Date.now();
            return axios.post(`${API_BASE}${url}`, data, {
                withCredentials: true,
                headers: { 'Authorization': `Bearer ${sessionUUID}`, 'Content-Type': 'application/json' }
            }).then(res => ({ ...res, t0, t1: Date.now() }));
        },
    }), []);

    const initSession = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let visitor_uuid = safeStorage.get("visitor_uuid");
            if (!visitor_uuid) {
                visitor_uuid = generateUUID();
                safeStorage.set("visitor_uuid", visitor_uuid);
                console.log('[Chatbot] Generated new visitor_uuid:', visitor_uuid);
            } else {
                console.log('[Chatbot] Using existing visitor_uuid:', visitor_uuid);
            }

            const res = await api.post('/chat/session/init', { visitor_uuid });
            const data = res.data as SessionInitData;
            setVisitorUuid(visitor_uuid);
            setIsInitialized(true);

            if (data.session_token) {
                setSessionToken(data.session_token);
                safeStorage.set('session_token', data.session_token);
                console.log('[Chatbot] Session initialized:', data.session_token);
            }
            if (data.conversation_status) {
                const normalizedStatus = data.conversation_status.toLowerCase() as ConversationStatus;
                setConversationStatus(normalizedStatus);
                if (normalizedStatus === 'waiting_for_agent') {
                    setStatusText('Waiting for Agent');
                } else if (normalizedStatus === 'human') {
                    setStatusText('Agent Connected');
                } else {
                    setStatusText('Online');
                }
            }

            if (data.server_time_utc) {
                const t1 = Date.now();
                const t0 = (res as { t0?: number }).t0 || t1;
                const serverTime = new Date(data.server_time_utc).getTime();
                const latency = (t1 - t0) / 2;
                setServerOffset((serverTime + latency) - t1);
            }

            // ── Restore History using session UUID as auth ────────────────
            const sessionUUID = data.session_token;
            const historyRes = await chatApi(sessionUUID).get('/chat/history');
            const history = historyRes.data;
            let finalMessages: Message[] = [];

            if (Array.isArray(history) && history.length > 0) {
                if (history[0].sessionId) setSessionToken(history[0].sessionId);
                if (history[0].conversation_status) {
                    const normalizedStatus = history[0].conversation_status.toLowerCase() as ConversationStatus;
                    setConversationStatus(normalizedStatus);
                    if (normalizedStatus === 'waiting_for_agent') setStatusText('Waiting for Agent');
                    else if (normalizedStatus === 'human') setStatusText('Agent Connected');
                    else setStatusText('Online');
                }

                finalMessages = (history as BaseMessage[]).filter(m => m && m.message).map((m, idx: number) => {
                    const base = {
                        id: `${Date.now()}-h-${idx}`,
                        role: (m.role || 'bot') as 'user' | 'bot' | 'agent' | 'system',
                        content: m.message || '',
                        created_at_ist: m.created_at_ist || formatToIST(new Date())
                    };
                    if (m.type === 'form') {
                        return { ...base, type: 'form', formType: 'demo' } as Message;
                    }
                    return { ...base, type: 'text' } as Message;
                });

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
                    const welcomeMsg: Message = {
                        id: Date.now().toString() + '-init',
                        role: 'bot',
                        type: 'text',
                        content: data.message,
                        created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
                    };

                    if (data.type === 'CTA' && data.ctas) {
                        finalMessages.push({
                            id: Date.now().toString() + '-init-cta',
                            role: 'bot',
                            type: 'cta',
                            ctas: data.ctas
                        } as Message);
                    } else if (data.type === 'CTA' && data.cta_label && data.action) {
                        finalMessages.push({
                            id: Date.now().toString() + '-init-cta',
                            role: 'bot',
                            type: 'cta',
                            label: data.cta_label,
                            action: data.action
                        } as Message);
                    } else {
                        finalMessages.push(welcomeMsg);
                    }
                }
            }

            setMessages(finalMessages);
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: unknown) {
            setError(toFriendlyError(err));
        } finally {
            setLoading(false);
        }
    }, [chatApi, serverOffset]);

    // ── NTP-Sync Handler ─────────────────────────────────────────────
    const syncServerTime = useCallback(async () => {
        if (!sessionToken) return;
        try {
            const t0 = Date.now();
            const res = await chatApi(sessionToken).get('/chat/history');
            const t1 = Date.now();
            const serverTime = res.data?.server_time_utc
                ? new Date(res.data.server_time_utc).getTime()
                : null;

            if (serverTime) {
                const latency = (t1 - t0) / 2;
                setServerOffset((serverTime + latency) - t1);
                console.log(`[ClockSync] Offset updated: ${serverTime - t1}ms (Latency: ${latency}ms)`);
            }
        } catch (err: unknown) {
            // If 401, session is stale — silently ignore (initSession will fix it)
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                console.warn('[ClockSync] Session expired, skipping sync');
                return;
            }
            console.warn('[ClockSync] Failed to re-sync server time', err);
        }
    }, [sessionToken, chatApi]);

    // Update status based on initialization
    useEffect(() => {
        if (!isInitialized) {
            setStatusText('Connecting...');
        }
    }, [isInitialized]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, open]);

    useEffect(() => {
        if (open && !isInitialized) {
            console.log('[Chatbot] Opening chatbot, initializing session...');
            initSession();
        }
    }, [open, isInitialized, initSession]);

    // ── Periodic and Visibility-based Re-sync ────────────────────────
    useEffect(() => {
        if (!isInitialized || !sessionToken) return;

        const interval = setInterval(syncServerTime, 120000); // 2 mins

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[ClockSync] Tab visible, triggering re-sync...');
                syncServerTime();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isInitialized, sessionToken, syncServerTime]);

    // ── WebSocket connect for live agent chat ────────────────────────
    const connectClientWebSocket = useCallback((sessionId: string) => {
        const url = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=client&token=${sessionId}`;
        wsManager.connect(url, 'chatbot');
    }, []);

    useEffect(() => {
        if (!isInitialized || !sessionToken) return;

        const unsubscribeSync = wsManager.subscribe('sync', (syncData) => {
            if (syncData.purpose === 'chatbot') {
                const { serverTime, t1 } = syncData;
                if (serverTime !== undefined && t1 !== undefined) {
                    setServerOffset(serverTime - t1);
                    console.log(`[ChatbotSync] Offset synchronized: ${serverTime - t1}ms`);
                }
            }
        });

        const unsubscribeMessage = wsManager.subscribe('message', (data) => {
            if (data.purpose !== 'chatbot') return;

            const type = data.type?.toLowerCase();
            if (type === 'typing' || data.type === 'TYPING_EVENT') {
                setIsAgentTyping(!!data.is_typing);
                if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
                if (data.is_typing) {
                    agentTypingTimeoutRef.current = setTimeout(() => setIsAgentTyping(false), 3000);
                }
                return;
            }

            if (!data.message && data.type !== 'system') return;

            const role = data.sender === 'agent' ? 'agent' : data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : 'bot';
            setMessages((prev) => [...prev, {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                role: role as 'agent' | 'user' | 'system' | 'bot',
                type: 'text',
                content: data.message || '',
                created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
            }]);

            if (data.type === 'system') {
                const msgText: string = data.message || '';
                if (msgText.includes('agent has joined') || (data.sender === 'system' && msgText.includes('joined'))) {
                    setConversationStatus('human');
                    setStatusText('Agent Connected');
                }
                if (data.mode === 'BOT' || msgText.includes('agent has left') || msgText.includes('assistant has resumed')) {
                    setConversationStatus('bot');
                    setStatusText('Online');
                }
            }
        });

        const unsubscribeOpen = wsManager.subscribe('open', (data) => {
            if (data.purpose === 'chatbot') {
                console.log('Chatbot WebSocket connected via Manager');
                setError(null);
            }
        });

        const unsubscribeError = wsManager.subscribe('error', (err) => {
            console.error('Chatbot WebSocket error via Manager:', err);
        });

        // Initial connect
        connectClientWebSocket(sessionToken);

        return () => {
            unsubscribeSync();
            unsubscribeMessage();
            unsubscribeOpen();
            unsubscribeError();
        };
    }, [isInitialized, sessionToken, connectClientWebSocket, serverOffset]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            if (agentTypingTimeoutRef.current) clearTimeout(agentTypingTimeoutRef.current);
        };
    }, []);

    const sendTypingStatus = (isTyping: boolean) => {
        if (isInitialized && wsManager.getStatus('chatbot') === 'OPEN') {
            wsManager.send({
                type: 'typing',
                is_typing: isTyping
            }, 'chatbot');
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
            content: text,
            created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');

        // ── WebSocket path: when agent is active ─────────────────
        if (conversationStatus !== 'bot' && wsManager.getStatus('chatbot') === 'OPEN') {
            console.log('[Chatbot] Sending message via WebSocket:', text);
            wsManager.send({ message: text }, 'chatbot');
            return;
        }

        // ── REST API path: normal bot mode ───────────────────────
        console.log('[Chatbot] Sending message via REST API:', text);
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

            if (data.server_time_utc) {
                const serverTime = new Date(data.server_time_utc).getTime();
                const localTime = Date.now();
                setServerOffset(serverTime - localTime);
            }

            const newBotMessages: Message[] = [];

            if (data.message) {
                newBotMessages.push({
                    id: Date.now().toString() + '-reply',
                    role: 'bot',
                    type: 'text',
                    content: data.message,
                    created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
                });
            }

            // Trigger Lead Form if backend flag is true
            if (data.show_lead_form) {
                newBotMessages.push({
                    id: Date.now().toString() + '-form',
                    role: 'bot',
                    type: 'form',
                    formType: 'demo',
                    created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
                });
            }

            if (data.type === 'CTA') {
                if (data.ctas) {
                    newBotMessages.push({
                        id: Date.now().toString() + '-ctas',
                        role: 'bot',
                        type: 'cta',
                        ctas: data.ctas
                    });
                } else if (data.cta_label && data.action) {
                    newBotMessages.push({
                        id: Date.now().toString() + '-cta',
                        role: 'bot',
                        type: 'cta',
                        label: data.cta_label,
                        action: data.action
                    });
                }
            }

            setMessages((prev) => [...prev, ...newBotMessages]);
            setTimeout(() => inputRef.current?.focus(), 50);
        } catch (err: unknown) {
            // ── Auto-Recovery: if 401, re-init session and retry once ────
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                console.warn('[Chatbot] Session expired (401), auto-recovering...');
                try {
                    // Clear stale token
                    safeStorage.set('session_token', '');
                    setIsInitialized(false);

                    // Re-initialize session
                    let visitor_uuid = safeStorage.get('visitor_uuid');
                    if (!visitor_uuid) {
                        visitor_uuid = generateUUID();
                        safeStorage.set('visitor_uuid', visitor_uuid);
                    }
                    const initRes = await api.post('/chat/session/init', { visitor_uuid });
                    const initData = initRes.data;

                    if (initData.session_token) {
                        setSessionToken(initData.session_token);
                        safeStorage.set('session_token', initData.session_token);
                        setIsInitialized(true);
                        console.log('[Chatbot] Session recovered:', initData.session_token);

                        // Retry the original message with new session
                        const retryRes = await chatApi(initData.session_token).post('/chat/message', { message: text });
                        const retryData = retryRes.data;

                        const retryMessages: Message[] = [];
                        if (retryData.message) {
                            retryMessages.push({ id: Date.now().toString() + '-retry', role: 'bot', type: 'text', content: retryData.message });
                        }
                        if (retryData.type === 'CTA' && retryData.cta_label && retryData.action) {
                            retryMessages.push({ id: Date.now().toString() + '-retry-cta', role: 'bot', type: 'cta', label: retryData.cta_label, action: retryData.action });
                        }
                        setMessages((prev) => [...prev, ...retryMessages]);
                    }
                } catch (retryErr) {
                    console.error('[Chatbot] Auto-recovery failed:', retryErr);
                    setError('Session expired. Please refresh the page.');
                }
            } else {
                setError(toFriendlyError(err));
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Talk to Sales: direct WhatsApp redirect ──────────────────────
    const handleTalkToSales = () => {
        window.open('https://wa.me/918527376675', '_blank');
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
        setMessages(prev => {
            // Keep the form message but add the success message
            return [...prev, {
                id: Date.now().toString(),
                role: 'bot',
                type: 'text',
                content: message
            }];
        });
        setStatusText('Waiting for Agent');
        setConversationStatus('waiting_for_agent');
    };

    const linkify = (text: string) => {
        if (!text) return text;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.messageLink}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const renderMessage = (msg: Message) => {
        switch (msg.type) {
            case 'text':
                if (!msg.content?.trim()) return null;
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
                            {linkify(msg.content)}
                            <div className={styles.msgTime}>{msg.created_at_ist}</div>
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
                            {msg.ctas ? (
                                <div className={styles.quickGrid} style={{ width: '100%', margin: 0, gap: '8px' }}>
                                    {msg.ctas.map((cta, i) => (
                                        <button
                                            key={i}
                                            className={styles.quickBtn}
                                            onClick={() => cta.action === 'HANDOFF' ? handleTalkToSales() : handleAction(cta.action)}
                                            style={{ margin: 0, width: '100%', justifyContent: 'center' }}
                                        >
                                            {cta.icon && <span className={styles.quickIcon}>{cta.icon}</span>}
                                            <span className={styles.quickLabel}>{cta.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <button
                                    className={styles.quickBtn}
                                    onClick={() => handleAction(msg.action || '')}
                                >
                                    {msg.label}
                                </button>
                            )}
                        </div>
                    </div>
                );
            case 'form': {
                let initialData = undefined;
                if (msg.content && msg.content.startsWith('{')) {
                    try {
                        initialData = JSON.parse(msg.content);
                    } catch (e) {
                        console.error('Failed to parse form data:', e);
                    }
                }
                return (
                    <div className={styles.formWrap}>
                        <LeadForm
                            onClose={() => { }}
                            onSubmitSuccess={handleFormSuccess}
                            initialData={initialData}
                            visitor_uuid={visitorUuid}
                        />
                    </div>
                );
            }
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
                                    {messages[0] && messages[0].type === 'text' ? (
                                        <p className={styles.welcomeLine1}>{(messages[0] as TextMessage).content}</p>
                                    ) : (
                                        <>
                                            <p className={styles.welcomeLine1}>Welcome to GTD Service.</p>
                                            <p className={styles.welcomeLine2}>Please let me know how I can assist you.</p>
                                        </>
                                    )}
                                </div>
                                {conversationStatus === 'bot' && (
                                    <div className={styles.quickGrid}>
                                        <button className={styles.quickBtn} onClick={() => handleAction('OPEN_LEAD_FORM')}>
                                            <span className={styles.quickIcon}>🚀</span>
                                            <span className={styles.quickLabel}>Book Demo</span>
                                        </button>
                                        <button className={styles.quickBtn} onClick={() => handleTalkToSales()}>
                                            <span className={styles.quickIcon}>💬</span>
                                            <span className={styles.quickLabel}>Connect To Data Expert</span>
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

