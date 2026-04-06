'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import styles from './Chatbot.module.css';
import dynamic from 'next/dynamic';
import {
    X,
    Send,
    LogOut,
    Bot,
    Menu
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

declare global {
    interface Window {
        GTT_CHATBOT_CONFIG?: {
            apiKey?: string;
            api_key?: string;
            api_Key?: string;
            tenantId?: string | number;
            tenant_id?: string | number;
            tenantKey?: string;
            tenant_key?: string;
        };
        CHATBOT_CONFIG?: {
            apiKey?: string;
            api_key?: string;
            api_Key?: string;
            tenantId?: string | number;
            tenant_id?: string | number;
            tenantKey?: string;
            tenant_key?: string;
        };
    }
}

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

const getIframeKey = () => {
    if (typeof window === 'undefined') return '';
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('key') || params.get('tenant_key') || params.get('tenantKey') || '';
    } catch {
        return '';
    }
};

type ConversationStatus = 'bot' | 'waiting_for_agent' | 'human' | 'closed';

type BaseMessage = {
    id: string;
    role: 'bot' | 'user' | 'agent' | 'system';
    created_at_ist?: string;
    message?: string; // History data from backend uses 'message'
    type?: string;
    is_read?: boolean;
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



export default function Chatbot({ tenantIdProp, tenantKeyProp }: { tenantIdProp?: number; tenantKeyProp?: string }) {
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
    const [quickMenuOpen, setQuickMenuOpen] = useState(false);

    // ── Dynamic Branding (fetched from database) ─────────────────────
    const [botName, setBotName] = useState('AI Assistant');
    const [botLogo, setBotLogo] = useState('');
    const [fabTooltip, setFabTooltip] = useState('Support');
    const [welcomeText, setWelcomeText] = useState('How can we help today?');

    const [isAgentTyping, setIsAgentTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const agentTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesRef = useRef(messages);
    const quickMenuRef = useRef<HTMLDivElement>(null);
    const quickMenuBtnRef = useRef<HTMLButtonElement>(null);
    const isSendingRef = useRef(false);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Close quick menu on click outside
    useEffect(() => {
        if (!quickMenuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            const isMenu = quickMenuRef.current && quickMenuRef.current.contains(e.target as Node);
            const isBtn = quickMenuBtnRef.current && quickMenuBtnRef.current.contains(e.target as Node);
            if (!isMenu && !isBtn) {
                setQuickMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [quickMenuOpen]);

    // ── Inactivity Timer Removed (Backend handles this now) ──

    // ── Chat-specific API helper: sends session UUID as Bearer token ──
    const chatApi = useCallback((sessionUUID: string) => {
        const globalConfig = window.GTT_CHATBOT_CONFIG || window.CHATBOT_CONFIG;
        const apiKey = tenantKeyProp || getIframeKey() || globalConfig?.tenantKey || globalConfig?.tenant_key || globalConfig?.apiKey || globalConfig?.api_key || globalConfig?.api_Key || 'key_local_1';

        const appendKey = (url: string) => {
            if (!apiKey) return url;
            return url.includes('?') ? `${url}&key=${apiKey}` : `${url}?key=${apiKey}`;
        };

        return {
            get: (url: string) => {
                const t0 = Date.now();
                return axios.get(`${API_BASE}${appendKey(url)}`, {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${sessionUUID}`,
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey // Kept for legacy compatibility
                    }
                }).then(res => ({ ...res, t0, t1: Date.now() }));
            },
            post: (url: string, data?: unknown) => {
                const t0 = Date.now();
                return axios.post(`${API_BASE}${appendKey(url)}`, data, {
                    withCredentials: true,
                    headers: {
                        'Authorization': `Bearer ${sessionUUID}`,
                        'Content-Type': 'application/json',
                        'x-api-key': apiKey // Kept for legacy compatibility
                    }
                }).then(res => ({ ...res, t0, t1: Date.now() }));
            },
        };
    }, [tenantKeyProp]);

    // ── Fetch Branding Config on mount or tenantId change ───────────
    useEffect(() => {
        // Priority: Prop > Global Config > Default(1)
        const globalConfig = window.GTT_CHATBOT_CONFIG || window.CHATBOT_CONFIG;
        const targetTid = tenantIdProp || Number(globalConfig?.tenantId || globalConfig?.tenant_id) || undefined;
        const targetKey = tenantKeyProp || globalConfig?.tenantKey || globalConfig?.tenant_key;

        // Sync to global config if props are provided (for the axios interceptor)
        if (tenantIdProp || tenantKeyProp) {
            window.GTT_CHATBOT_CONFIG = {
                ...globalConfig,
                tenantId: targetTid,
                tenantKey: targetKey
            };
        }

        const fetchBranding = async () => {
            try {
                // Pass tenant_id or tenant-key to get specific branding
                const res = await api.get('/bot-config', {
                    params: { tenant_id: targetTid },
                    headers: targetKey ? { 'tenant-key': targetKey } : {}
                });
                const cfg = res.data;
                if (cfg.chatbot_name) setBotName(cfg.chatbot_name);
                if (cfg.chatbot_logo_url) {
                    const logoUrl = cfg.chatbot_logo_url.startsWith('/static/')
                        ? `${API_BASE}${cfg.chatbot_logo_url}`
                        : cfg.chatbot_logo_url;
                    setBotLogo(logoUrl);
                }
                if (cfg.fab_tooltip) setFabTooltip(cfg.fab_tooltip);
                if (cfg.welcome_text) setWelcomeText(cfg.welcome_text);
            } catch (err) {
                console.warn('[Chatbot] Failed to fetch branding config', err);
            }
        };
        fetchBranding();
    }, [tenantIdProp, tenantKeyProp]);

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

            const globalConfig = window.GTT_CHATBOT_CONFIG || window.CHATBOT_CONFIG;
            const tKey = tenantKeyProp || getIframeKey() || globalConfig?.tenantKey || globalConfig?.tenant_key || globalConfig?.apiKey || globalConfig?.api_key || globalConfig?.api_Key || 'key_local_1';
            const initUrl = tKey ? `/chat/session/init?key=${tKey}` : '/chat/session/init';
            const res = await api.post(initUrl, { visitor_uuid });
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
                if (data.message?.includes("Welcome back") || data.message?.includes("trade operations")) {
                    finalMessages.push({
                        id: Date.now().toString() + '-sep',
                        role: 'system',
                        type: 'text',
                        content: '----- Previous Conversation -----'
                    });
                }
            }

            // Always push the init CTAs so the user has the buttons at the bottom.
            // (The welcome text itself is fetched from the /history call, so we don't push welcomeMsg text explicitly here)
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
            } else if (finalMessages.length === 0 && data.message) {
                // Fallback for brand new sessions if history fetch failed
                finalMessages.push({
                    id: Date.now().toString() + '-init',
                    role: 'bot',
                    type: 'text',
                    content: data.message,
                    created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
                });
            }

            setMessages(finalMessages);
            setTimeout(() => inputRef.current?.focus(), 100);
        } catch (err: unknown) {
            setError(toFriendlyError(err));
        } finally {
            setLoading(false);
        }
    }, [chatApi, serverOffset, tenantKeyProp]);

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

    // ── Auto-popup logic ─────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if we've already tried to auto-open in this specific mount
        let hasTriggered = false;

        const hasShownInSession = sessionStorage.getItem('chatbot_auto_popup_session_shown');
        if (hasShownInSession === 'true') {
            console.log('[Chatbot] Auto-popup already shown in this session.');
            return;
        }

        const timer = setTimeout(() => {
            if (hasTriggered) return;

            setOpen(prevOpen => {
                if (prevOpen) {
                    console.log('[Chatbot] Already open (manual).');
                    return prevOpen;
                }

                console.log('[Chatbot] 🚀 Triggering auto-popup (session: first time)...');
                hasTriggered = true;
                sessionStorage.setItem('chatbot_auto_popup_session_shown', 'true');

                // Signal shell to resize iframe
                try {
                    window.parent.postMessage({ type: 'gtt-widget-resize', open: true }, '*');
                } catch (err) {
                    console.warn('[Chatbot] Resize postMessage failed', err);
                }

                return true;
            });
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

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

    // ── Handle sending READ status to server ──────────────────────────
    useEffect(() => {
        if (!open || !isInitialized || !sessionToken || wsManager.getStatus('chatbot') !== 'OPEN') return;

        // Find messages from agent or bot that are not marked as read
        const unreadMessages = messages.filter(m => (m.role === 'agent' || m.role === 'bot') && !m.is_read);

        if (unreadMessages.length > 0) {
            console.log(`[Chatbot] Sending READ status for ${unreadMessages.length} messages`);

            // Mark them locally as read first for immediate UI update
            setMessages(prev => prev.map(m =>
                (m.role === 'agent' || m.role === 'bot') ? { ...m, is_read: true } : m
            ));

            // Send to server
            wsManager.send({
                type: 'MESSAGE_READ',
                session_id: sessionToken,
                last_msg_id: unreadMessages[unreadMessages.length - 1].id
            }, 'chatbot');
        }
    }, [open, messages, isInitialized, sessionToken]);

    // ── WebSocket connect for live agent chat ────────────────────────
    const connectClientWebSocket = useCallback((sessionId: string) => {
        const globalConfig = window.GTT_CHATBOT_CONFIG || window.CHATBOT_CONFIG;
        const apiKey = tenantKeyProp || getIframeKey() || globalConfig?.tenantKey || globalConfig?.tenant_key || globalConfig?.apiKey || globalConfig?.api_key || globalConfig?.api_Key || 'key_local_1';

        const url = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=client&token=${sessionId}&key=${apiKey}`;
        wsManager.connect(url, 'chatbot');
    }, [tenantKeyProp]);

    useEffect(() => {
        if (!isInitialized || !sessionToken) return;

        const unsubscribeStatus = wsManager.subscribe('statusChange', (data) => {
            if (data.purpose === 'chatbot') {
                console.log(`[ChatbotWS] Status changed to: ${data.state}`);
            }
        });

        const unsubscribeError = wsManager.subscribe('error', (data) => {
            if (data.purpose === 'chatbot') {
                console.error('[ChatbotWS] connection error:', data.error);
            }
        });

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

            if (!data.message && data.type !== 'system' && data.type !== 'CHAT_ENDED') return;

            // 🔴 Agent closed the session — reset widget to allow new conversation
            if (data.type === 'CHAT_ENDED') {
                setConversationStatus('bot');
                setStatusText('Online');
                // Add a system message informing the user
                setMessages(prev => [...prev, {
                    id: `${Date.now()}-ended`,
                    role: 'system' as const,
                    type: 'text' as const,
                    content: data.message || 'This conversation was closed by an agent. Send a message to start a new chat.',
                    created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
                }]);
                // Clear the stored session token so next message starts a fresh session
                try { localStorage.removeItem('session_token'); } catch { /* ignore */ }
                setSessionToken('');
                setIsInitialized(false);
                return;
            }

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


        // Initial connect
        connectClientWebSocket(sessionToken);

        return () => {
            unsubscribeStatus();
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
        if (!text.trim() || !isInitialized || loading || isSendingRef.current) return;
        isSendingRef.current = true;

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
            isSendingRef.current = false;
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
                    const globalConfig = window.GTT_CHATBOT_CONFIG || window.CHATBOT_CONFIG;
                    const tKey = tenantKeyProp || getIframeKey() || globalConfig?.tenantKey || globalConfig?.tenant_key || globalConfig?.apiKey || globalConfig?.api_key || globalConfig?.api_Key || 'key_local_1';
                    const initUrl = tKey ? `/chat/session/init?key=${tKey}` : '/chat/session/init';
                    const initRes = await api.post(initUrl, { visitor_uuid });
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
            isSendingRef.current = false;
        }
    };

    // ── Talk to Sales: direct WhatsApp redirect ──────────────────────
    const handleTalkToSales = () => {
        window.open('https://wa.me/918527376675', '_blank');
    };

    const handleEndChat = async () => {
        setLoading(true);
        try {
            const globalConfig = window.GTT_CHATBOT_CONFIG || window.CHATBOT_CONFIG;
            const tKey = tenantKeyProp || getIframeKey() || globalConfig?.tenantKey || globalConfig?.tenant_key || globalConfig?.apiKey || globalConfig?.api_key || globalConfig?.api_Key || 'key_local_1';
            const endUrl = tKey ? `/chat/session/end?key=${tKey}` : '/chat/session/end';
            await api.post(endUrl);
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
        setStatusText('Enquiry Submitted');
        setConversationStatus('waiting_for_agent');
    };

    const linkify = (text: string) => {
        if (!text) return text;

        // Smart text cleaning - fix UTF-16 encoding and character spacing issues
        let cleanText = text;

        // First, fix UTF-16 encoding issues (null bytes between characters)
        if (cleanText.includes('\x00') || cleanText.includes('\u0000')) {
            cleanText = cleanText.replace(/\x00/g, '').replace(/\u0000/g, '');
        }

        // Check for specific problematic patterns that need fixing
        const hasSpacedCharacters = /\b[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]/.test(cleanText);

        if (hasSpacedCharacters) {
            // Only fix specific spaced words, not all text
            cleanText = cleanText
                // Fix common spaced words
                .replace(/\bH\s+e\s+l\s+l\s+o\s*(?=\s*[!?.,])/gi, 'Hello')
                .replace(/\bH\s+e\s+l\s+l\s+o\b/gi, 'Hello')
                .replace(/\bH\s+o\s+w\b/gi, 'How')
                .replace(/\bc\s+a\s+n\b/gi, 'can')
                .replace(/\bI\s+h\s+e\s+l\s+p\b/gi, 'I help')
                .replace(/\bh\s+e\s+l\s+p\b/gi, 'help')
                .replace(/\by\s+o\s+u\b/gi, 'you')
                .replace(/\bt\s+o\s+d\s+a\s+y\b/gi, 'today')
                .replace(/\bW\s+e\s+l\s+c\s+o\s+m\s+e\b/gi, 'Welcome')
                .replace(/\bw\s+i\s+t\s+h\b/gi, 'with')
                .replace(/\ba\s+s\s+s\s+i\s+s\s+t\b/gi, 'assist')
                // Clean up any excessive whitespace but preserve normal word spacing
                .replace(/\s{2,}/g, ' ')
                .trim();
        } else {
            // Normal text - only clean excessive whitespace, preserve normal spacing
            cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
        }

        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

        // First, handle markdown links [text](url)
        let parts: (string | React.ReactNode)[] = [cleanText];

        // Process markdown links
        let newParts: (string | React.ReactNode)[] = [];
        parts.forEach(part => {
            if (typeof part !== 'string') {
                newParts.push(part);
                return;
            }

            let lastIndex = 0;
            let match;
            while ((match = markdownLinkRegex.exec(part)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    newParts.push(part.substring(lastIndex, match.index));
                }

                const linkText = match[1];
                const linkUrl = match[2];

                newParts.push(
                    <a
                        key={`md-${match.index}`}
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.messageLink}
                    >
                        {linkText}
                    </a>
                );
                lastIndex = markdownLinkRegex.lastIndex;
            }
            if (lastIndex < part.length) {
                newParts.push(part.substring(lastIndex));
            }
        });
        parts = newParts;

        // Then, handle plain URLs in remaining string parts
        newParts = [];
        parts.forEach(part => {
            if (typeof part !== 'string') {
                newParts.push(part);
                return;
            }

            const subParts = part.split(urlRegex);
            subParts.forEach((subPart, i) => {
                if (subPart.match(urlRegex)) {
                    newParts.push(
                        <a
                            key={`url-${i}`}
                            href={subPart}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.messageLink}
                        >
                            {subPart}
                        </a>
                    );
                } else if (subPart) {
                    newParts.push(subPart);
                }
            });
        });

        return newParts;
    };

    const renderMessage = (msg: Message) => {
        switch (msg.type) {
            case 'text':
                if (!msg.content?.trim()) return null;
                return (
                    <div className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : styles.messageRowBot}`}>
                        {msg.role !== 'user' && (
                            <div className={styles.botAvatar}>
                                {botLogo ? (
                                    <NextImage
                                        src={botLogo}
                                        alt={botName}
                                        width={22}
                                        height={22}
                                        unoptimized={true}
                                        className="object-contain rounded-full shadow-sm"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/10" />
                                )}
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
                            {msg.role === 'agent' && <div className={styles.agentLabel}>Jessica</div>}
                            {linkify(msg.content)}
                            <div className={styles.msgTime}>
                                {msg.created_at_ist}
                                {msg.role === 'user' && (
                                    <span className={styles.readTick}>
                                        {msg.is_read ? (
                                            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 5.5L4.5 9L11 1" stroke="#34B7F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M5.5 5.5L9 9L15.5 1" stroke="#34B7F1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : (
                                            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1 5.5L4.5 9L10 1" stroke="#8696a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'cta':
                return (
                    <div className={styles.messageRow}>
                        <div className={styles.botAvatar}>
                            {botLogo ? (
                                <NextImage
                                    src={botLogo}
                                    alt={botName}
                                    width={22}
                                    height={22}
                                    unoptimized={true}
                                    className="object-contain rounded-full shadow-sm"
                                />
                            ) : (
                                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                    <Bot size={14} className="text-white/40" />
                                </div>
                            )}
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
                    <div className={styles.fabTooltip}>{fabTooltip}</div>
                    <button
                        className={styles.fab}
                        onClick={() => {
                            setOpen(true);
                            window.parent.postMessage({ type: 'gtt-widget-resize', open: true }, '*');
                        }}
                        aria-label={`Open ${botName}`}
                    >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                            {botLogo ? (
                                <NextImage
                                    src={botLogo}
                                    alt={botName}
                                    width={40}
                                    height={40}
                                    unoptimized={true}
                                    className="object-contain rounded-full shadow-sm"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-white/20 animate-pulse" />
                            )}
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
                                {botLogo ? (
                                    <NextImage
                                        src={botLogo}
                                        alt={botName}
                                        width={40}
                                        height={40}
                                        unoptimized={true}
                                        className="object-contain rounded-full bg-white/10"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/10 flex items-center justify-center rounded-full">
                                        <Bot size={24} className="text-white/40" />
                                    </div>
                                )}
                            </div>
                            <div className={styles.headerInfo}>
                                <div className={styles.headerTitle}>{botName}</div>
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
                                {botLogo ? (
                                    <NextImage
                                        src={botLogo}
                                        alt={botName}
                                        width={22}
                                        height={22}
                                        unoptimized={true}
                                        className="object-contain rounded-full shadow-sm"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                        <Bot size={14} className="text-white/40" />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '80%' }}>
                                <div className={styles.welcomeBubble} style={{ maxWidth: '100%' }}>
                                    {messages[0] && messages[0].type === 'text' ? (
                                        <p className={styles.welcomeLine1}>{(messages[0] as TextMessage).content}</p>
                                    ) : (
                                        <>
                                            <p className={styles.welcomeLine1}>{welcomeText}</p>
                                            <p className={styles.welcomeLine2}>Please let me know how I can assist you.</p>
                                        </>
                                    )}
                                </div>
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
                                    {botLogo ? (
                                        <NextImage
                                            src={botLogo}
                                            alt={botName}
                                            width={22}
                                            height={22}
                                            unoptimized={true}
                                            className="object-contain rounded-full shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                            <Bot size={14} className="text-white/40" />
                                        </div>
                                    )}
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
                                    {botLogo ? (
                                        <NextImage
                                            src={botLogo}
                                            alt={botName}
                                            width={22}
                                            height={22}
                                            unoptimized={true}
                                            className="object-contain rounded-full shadow-sm"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                                            <Bot size={14} className="text-white/40" />
                                        </div>
                                    )}
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

                    <div className={styles.footer}>
                        {quickMenuOpen && (
                            <div className={styles.quickMenuOverlay} ref={quickMenuRef}>
                                <button className={styles.quickMenuItem} onClick={() => { handleAction('OPEN_LEAD_FORM'); setQuickMenuOpen(false); }}>
                                    <span className={styles.quickMenuIcon}>🚀</span>
                                    <span className={styles.quickMenuLabel}>Book Demo</span>
                                </button>
                                <button className={styles.quickMenuItem} onClick={() => { handleTalkToSales(); setQuickMenuOpen(false); }}>
                                    <span className={styles.quickMenuIcon}>💬</span>
                                    <span className={styles.quickMenuLabel}>Connect to Data Expert</span>
                                </button>
                            </div>
                        )}
                        <div className={styles.inputWrap}>
                            <button
                                className={styles.quickMenuBtn}
                                ref={quickMenuBtnRef}
                                onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                                aria-label="Quick Actions"
                            >
                                <Menu size={20} />
                            </button>
                            <input
                                ref={inputRef}
                                className={styles.chatInput}
                                type="text"
                                placeholder={
                                    statusText === 'Enquiry Submitted' || conversationStatus === 'waiting_for_agent'
                                        ? 'Ask more or wait for agent...'
                                        : 'Type your message...'
                                }
                                value={input}
                                disabled={!isInitialized || loading}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !loading && input.trim() && isInitialized) {
                                        sendMessage(input);
                                    }
                                }}
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

