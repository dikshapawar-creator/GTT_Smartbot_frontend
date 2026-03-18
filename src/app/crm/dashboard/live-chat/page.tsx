'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    MessageCircle,
    Send,
    X,
    RefreshCw,
    Clock,
    User,
    Headphones,
    CheckCircle2,
    ShieldAlert,
    Star,
    Ban,
    Monitor,
    Zap,
    Users,
    Activity,
    Shield
} from 'lucide-react';
import styles from './LiveChat.module.css';
import { WS_BASE } from '@/lib/config';
import { wsManager } from '@/lib/wsManager';
import api from '@/config/api';
import { auth } from '@/lib/auth';
import { formatToIST, normalizeMessages, normalizeSessions, getSyncedNow } from '@/lib/time';


// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
    session_id: number;
    session_uuid: string; // Primary identifier for API calls
    session_status: 'ACTIVE' | 'CLOSED';
    current_mode: 'BOT' | 'HUMAN';
    agent_name: string | null;
    is_locked: boolean;
    lead_name: string | null;
    lead_company: string | null;
    lead_email: string | null;
    lead_phone: string | null;
    lead_score: number;
    lead_status: string;
    spam_flag: boolean;
    last_message_at: string | null;
    message_count: number;
    created_at: string | null;
    repeat_visitor: boolean;
    previous_session_count: number;
    initial_ip: string | null;
    country: string | null;
    city: string | null;
    browser: string | null;
    os: string | null;
    device_type: string | null;
    created_at_ist?: string;
    last_message_ist?: string;
}




interface ChatMessage {
    id: number;
    session_id: string;
    message_type: 'user' | 'bot' | 'agent' | 'system';
    message_text: string;
    created_at_utc: string;
    created_at_ist?: string;
}

interface Analytics {
    active_visitors: number;
    avg_lead_score: number;
    spam_visitors: number;
    agent_chats: number;
}

// ── Component ────────────────────────────────────────────────────────────

export default function LiveChatPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<Analytics>({
        active_visitors: 0,
        avg_lead_score: 0,
        spam_visitors: 0,
        agent_chats: 0
    });
    const [filter, setFilter] = useState('ALL');

    const pollRef = useRef<NodeJS.Timeout | null>(null);
    const [typingSessions, setTypingSessions] = useState<Record<string, boolean>>({});
    const [serverOffset, setServerOffset] = useState<number>(0);
    const [liveDurations, setLiveDurations] = useState<Record<string, number>>({});
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const selectedSession = useMemo(() =>
        conversations.find(c => c.session_uuid === selectedSessionId) || null
        , [conversations, selectedSessionId]);

    // ── IST Timezone Helper ──────────────────────────────────────────────


    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    // ── Get auth token ────────────────────────────────────────────────────

    const getToken = useCallback((): string | null => {
        return auth.getAccessToken() || null;
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await api.get('/live-chat/analytics');
            setAnalytics(res.data);
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        }
    }, []);

    const fetchConversations = useCallback(async () => {
        const token = getToken();
        if (!token) {
            console.warn('LiveChat: No token found, stopping polling.');
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
            return;
        }

        try {
            const t0 = Date.now();
            const res = await api.get('/live-chat/conversations');
            const t1 = Date.now();
            const data = res.data || [];

            if (data.length > 0 && data[0].server_time_utc) {
                const serverTime = new Date(data[0].server_time_utc).getTime();
                const latency = (t1 - t0) / 2;
                const newOffset = (serverTime + latency) - t1;
                setServerOffset(newOffset);
                localStorage.setItem('gtt_server_offset', String(newOffset));
            }
            setConversations(normalizeSessions(data));
            setError(null);
            fetchAnalytics();
        } catch (err: unknown) {
            console.error('LiveChat: Failed to fetch conversations', err);
            setError('Failed to load conversations');

            const errorMessage = err instanceof Error ? err.message : String(err);

            if (errorMessage === 'Could not validate credentials' || errorMessage.includes('Unauthorized')) {
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
            }
        } finally {
            setLoading(false);
        }
    }, [getToken, fetchAnalytics]);

    // ── NTP Re-sync Handler ──────────────────────────────────────────
    const syncServerTime = useCallback(async () => {
        try {
            const t0 = Date.now();
            const res = await api.get('/live-chat/conversations');
            const t1 = Date.now();
            const data = res.data || [];
            if (data.length > 0 && data[0].server_time_utc) {
                const serverTime = new Date(data[0].server_time_utc).getTime();
                const latency = (t1 - t0) / 2;
                const newOffset = (serverTime + latency) - t1;
                setServerOffset(newOffset);
                localStorage.setItem('gtt_server_offset', String(newOffset));
            }
        } catch (err) { console.warn("[ClockSync] Dashboard re-sync failed", err); }
    }, []);


    const extractContactInfo = useCallback(async (text: string, sessionId: string) => {
        const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
        const phoneRegex = /(\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9})/g;

        const emailMatch = text.match(emailRegex);
        const phoneMatch = text.match(phoneRegex);

        if (emailMatch || phoneMatch) {
            const updateData: Record<string, string> = {};
            if (emailMatch) updateData.email = emailMatch[0];
            if (phoneMatch) updateData.phone = phoneMatch[0];

            try {
                await api.post(`/live-chat/update-lead/${sessionId}`, updateData);
            } catch (err) {
                console.error("Failed to auto-update lead info", err);
            }
        }
    }, []);

    const fetchMessages = useCallback(
        async (sessionId: string) => {
            const token = getToken();
            if (!token) return;

            try {
                const res = await api.get(`/live-chat/messages/${sessionId}?page=1&page_size=100`);
                setMessages(normalizeMessages(res.data.items || []));
                setError(null);
            } catch {
                setError('Failed to load messages');
            }
        },
        [getToken],
    );

    const connectDashboardWS = useCallback((token: string) => {
        const url = `${WS_BASE}/live-chat/ws/dashboard?token=${token}`;
        wsManager.connect(url, 'dashboard');
    }, []);

    const connectWebSocket = useCallback((sessionId: string, token: string) => {
        const url = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=agent&token=${token}`;
        wsManager.connect(url, 'chat');
    }, []);

    const intervene = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/intervene/${sessionId}`);
            setSelectedSessionId(sessionId);
            await fetchMessages(sessionId);
            const token = getToken();
            if (token) connectWebSocket(sessionId, token);
            fetchConversations();
        } catch (e: unknown) {
            const errorMsg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Intervene failed';
            setError(errorMsg);
        }
    };

    const openChat = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'undefined') {
            console.error('Invalid session ID provided to openChat:', sessionId);
            return;
        }

        setSelectedSessionId(sessionId);
        localStorage.setItem('gtt_last_selected_session', sessionId);
        await fetchMessages(sessionId);
        const token = getToken();
        if (token) connectWebSocket(sessionId, token);
    }, [fetchMessages, connectWebSocket, getToken]);



    useEffect(() => {
        const token = getToken();
        if (!token) return;

        const unsubscribeSync = wsManager.subscribe('sync', (data: { purpose?: string; serverTime?: number; t1?: number }) => {
            if ((data.purpose === 'dashboard' || data.purpose === 'chat') && data.serverTime !== undefined && data.t1 !== undefined) {
                const { serverTime, t1 } = data;
                setServerOffset(serverTime - t1);
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const unsubscribeMsg = wsManager.subscribe('message', (data: any) => {
            // 1. Dashboard Events
            if (data.purpose === 'dashboard') {
                if (data.type === 'NEW_CONVERSATION' || data.type === 'SESSION_UPDATED') {
                    setConversations(prev => {
                        const target = data.type === 'NEW_CONVERSATION' ? data.data : data.data || data;
                        const normalized = normalizeSessions(target);
                        const idx = prev.findIndex(c => c.session_uuid === normalized.session_uuid);
                        if (idx !== -1) {
                            const newArr = [...prev];
                            newArr[idx] = { ...newArr[idx], ...normalized };
                            return newArr;
                        }
                        return [normalized, ...prev];
                    });
                }
                return;
            }

            // 2. Chat Events (per session)
            if (data.purpose !== 'chat') return;

            if (data.type === 'TYPING_EVENT' && data.session_id) {
                const sid = data.session_id;
                setTypingSessions(prev => ({ ...prev, [sid]: data.is_typing || false }));
                if (typingTimeoutRef.current[sid]) clearTimeout(typingTimeoutRef.current[sid]);
                if (data.is_typing) {
                    typingTimeoutRef.current[sid] = setTimeout(() => {
                        setTypingSessions(prev => ({ ...prev, [sid]: false }));
                    }, 3000);
                }
                return;
            }

            if ((data.message_text || data.message) && data.session_id) {
                const message_text = data.message_text || data.message || '';
                const normalizedMsg = normalizeMessages({
                    id: data.id || Date.now(),
                    session_id: data.session_id,
                    message_type: (data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : 'bot') as 'user' | 'system' | 'bot' | 'agent',
                    message_text: message_text,
                    created_at_utc: data.created_at_utc || new Date(getSyncedNow(serverOffset)).toISOString()
                }) as ChatMessage;
                setMessages(prev => {
                    if (prev.find(m => m.id === normalizedMsg.id)) return prev;
                    return [...prev, normalizedMsg];
                });

                if (data.sender === 'user' && selectedSessionId) {
                    extractContactInfo(message_text, selectedSessionId);
                }
            }
        });

        const unsubscribeOpen = wsManager.subscribe('open', (data: { purpose?: string }) => {
            console.log(`[WS][${data.purpose}] Connected`);
            setError(null);
        });

        const unsubscribeError = wsManager.subscribe('error', (data: { purpose?: string; error?: unknown }) => {
            console.error(`[WS][${data.purpose}] Error:`, data.error);
        });

        // Maintain Dashboard connection if no active chat
        if (!selectedSessionId) {
            connectDashboardWS(token);
        } else {
            connectWebSocket(selectedSessionId, token);
        }

        return () => {
            unsubscribeSync();
            unsubscribeMsg();
            unsubscribeOpen();
            unsubscribeError();
        };
    }, [selectedSessionId, getToken, connectDashboardWS, connectWebSocket, serverOffset, extractContactInfo]);

    const sendMessage = () => {
        if (!newMessage.trim() || !selectedSessionId) return;
        const token = getToken();
        if (!token) return;

        const optimisticMsg: ChatMessage = {
            id: Date.now(),
            session_id: selectedSessionId,
            message_type: 'agent',
            message_text: newMessage,
            created_at_utc: new Date(getSyncedNow(serverOffset)).toISOString(),
            created_at_ist: formatToIST(new Date(getSyncedNow(serverOffset)))
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');

        if (wsManager.getStatus('chat') === 'OPEN') {
            wsManager.send({ message: newMessage }, 'chat');
        } else {
            // Fallback to REST? (Optional, but WS is preferred)
            api.post(`/live-chat/message/${selectedSessionId}`, { message: newMessage }).catch(err => {
                console.error("REST fallback failed", err);
            });
        }
    };

    const sendTypingStatus = (isTyping: boolean) => {
        if (selectedSessionId && wsManager.getStatus('chat') === 'OPEN') {
            wsManager.send({
                type: 'typing',
                is_typing: isTyping
            }, 'chat');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        sendTypingStatus(true);

        const sid = selectedSessionId || '';
        if (typingTimeoutRef.current[sid]) clearTimeout(typingTimeoutRef.current[sid]);
        typingTimeoutRef.current[sid] = setTimeout(() => sendTypingStatus(false), 2000);
    };

    const togglePriority = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/toggle-priority/${sessionId}`);
            fetchConversations();
        } catch (err) { console.error("Toggle priority failed", err); }
    };

    const toggleSpam = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/toggle-spam/${sessionId}`);
            fetchConversations();
        } catch (err) { console.error("Toggle spam failed", err); }
    };

    const blockVisitor = async (sessionId: string) => {
        if (!confirm("Are you sure you want to block this visitor? This will close their session immediately.")) return;
        try {
            await api.post(`/live-chat/block-visitor/${sessionId}`);
            setSelectedSessionId(null);
            fetchConversations();
        } catch (err) { console.error("Block failed", err); }
    };

    const closeConversation = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/close/${sessionId}`);
            setSelectedSessionId(null);
            setMessages([]);
            fetchConversations();
        } catch (err) {
            console.error("Close failed", err);
            setError("Failed to close conversation");
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

        durationIntervalRef.current = setInterval(() => {
            const syncedNow = Date.now() + serverOffset;
            setLiveDurations(prev => {
                const next = { ...prev };
                conversations.forEach(conv => {
                    if (conv.session_status === 'ACTIVE' && conv.created_at) {
                        const startTime = new Date(conv.created_at).getTime();
                        next[conv.session_uuid] = Math.max(0, Math.floor((syncedNow - startTime) / 1000));
                    }
                });
                return next;
            });
        }, 1000);

        return () => {
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        };
    }, [conversations, serverOffset]);

    useEffect(() => {
        const savedOffset = localStorage.getItem('gtt_server_offset');
        if (savedOffset) setServerOffset(Number(savedOffset));

        fetchConversations();
        pollRef.current = setInterval(fetchConversations, 10000);

        const syncInterval = setInterval(syncServerTime, 120000); // 2m re-sync

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') syncServerTime();
        };

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'gtt_server_offset' && e.newValue) {
                setServerOffset(Number(e.newValue));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('storage', handleStorageChange);

        const savedSessionId = localStorage.getItem('gtt_last_selected_session');
        if (savedSessionId) {
            setSelectedSessionId(savedSessionId);
            setTimeout(() => {
                openChat(savedSessionId);
            }, 500);
        }

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
            clearInterval(syncInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [fetchConversations, openChat, syncServerTime]);


    useEffect(() => {
        const currentTypingTimeouts = typingTimeoutRef.current;
        return () => {
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
            Object.values(currentTypingTimeouts).forEach(clearTimeout);
        };
    }, []);

    // ── Render Helpers ───────────────────────────────────────────────────

    const filteredConversations = useMemo(() => {
        if (filter === 'ALL') return conversations;
        if (filter === 'ACTIVE') return conversations.filter(c => c.session_status === 'ACTIVE');
        if (filter === 'PRIORITY') return conversations.filter(c => c.lead_status === 'PRIORITY');
        if (filter === 'SPAM') return conversations.filter(c => c.spam_flag);
        return conversations;
    }, [conversations, filter]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return styles.scoreHot;
        if (score >= 50) return styles.scoreWarm;
        return styles.scoreCold;
    };



    return (
        <div className={styles.dashboardWrapper}>
            {/* Hero Section */}
            <div className={styles.heroSection}>
                <div className={styles.heroLeft}>
                    <h1 className={styles.heroTitle}>
                        <Activity size={22} style={{ color: '#6366f1' }} />
                        Live Conversations
                    </h1>
                    <p className={styles.heroSubtitle}>Monitor and manage real-time visitor sessions across your platform</p>
                </div>
                <div className={styles.heroStats}>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#10b981' }}>{analytics.active_visitors}</span>
                        <span className={styles.heroStatLabel}>Active Now</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#6366f1' }}>{analytics.agent_chats}</span>
                        <span className={styles.heroStatLabel}>Agent Chats</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#f59e0b' }}>{analytics.spam_visitors}</span>
                        <span className={styles.heroStatLabel}>Spam</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#3b82f6' }}>{Math.round(analytics.avg_lead_score)}</span>
                        <span className={styles.heroStatLabel}>Avg Score</span>
                    </div>
                </div>
            </div>

            <div className={styles.container}>
                {/* 2. Left Panel: Visitor Queue */}
                <div className={styles.listPanel}>
                    <div className={styles.listHeader}>
                        <div className={styles.listHeaderTop}>
                            <h2 className={styles.listTitle}><Users size={20} /> Visitor Queue</h2>
                            <button className={styles.refreshBtn} onClick={fetchConversations}><RefreshCw size={14} /></button>
                        </div>
                        <div className={styles.filterBar}>
                            <select className={styles.filterSelect} value={filter} onChange={(e) => setFilter(e.target.value)}>
                                <option value="ALL">All Chats</option>
                                <option value="ACTIVE">Active Now</option>
                                <option value="PRIORITY">Priority</option>
                                <option value="SPAM">Spam</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.errorBanner}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className={styles.emptyState}>Loading conversations...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className={styles.emptyState}>
                            <MessageCircle size={32} className={styles.emptyIcon} />
                            <p>No active conversations</p>
                            <span>Conversations will appear here when customers submit a demo request.</span>
                        </div>
                    ) : (
                        <div className={styles.conversationList}>
                            {filteredConversations.map((conv) => (
                                <div
                                    key={conv.session_id}
                                    className={`${styles.conversationCard} ${selectedSessionId === conv.session_uuid ? styles.cardActive : ''}`}
                                    onClick={() => openChat(conv.session_uuid)}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardInfo}>
                                            <div className={styles.cardName}>
                                                <User size={14} />
                                                <span>{conv.lead_name || 'Anonymous User'}</span>
                                                {conv.lead_status === 'PRIORITY' && <Star size={12} className={styles.cardPriority} fill="currentColor" />}
                                                {conv.spam_flag && <span className={styles.cardSpam}>Spam</span>}
                                            </div>
                                        </div>
                                        <div className={`${styles.statusBadge} ${conv.session_status === 'ACTIVE' ? styles.scoreWarm : styles.scoreCold}`}>
                                            {conv.session_status}
                                        </div>
                                    </div>
                                    <div className={styles.cardMeta}>
                                        <span>{conv.message_count} msgs • {conv.country || 'Unknown'}</span>
                                        <span>{conv.last_message_ist}</span>
                                    </div>
                                    {conv.session_status === 'ACTIVE' && conv.current_mode === 'BOT' && (
                                        <button
                                            className={styles.cardTakeoverBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                intervene(conv.session_uuid);
                                            }}
                                        >
                                            <Headphones size={12} /> Takeover
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Center Panel: Chat Window */}
                <div className={styles.chatPanel}>
                    {selectedSessionId && selectedSession ? (
                        <>
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderInfo}>
                                    <span className={styles.chatHeaderTitle}>{selectedSession?.lead_name || 'Anonymous User'}</span>
                                    <div className={styles.chatHeaderMeta}>
                                        <span><Clock size={11} /> {formatDuration(liveDurations[selectedSessionId] || 0)}</span>
                                        {typingSessions[selectedSessionId] && <span className={styles.typingBadge}>Typing...</span>}
                                        <span><Clock size={12} /> IST: {selectedSession?.created_at_ist}</span>
                                    </div>
                                </div>
                                <div className={styles.chatHeaderActions}>
                                    {selectedSession?.current_mode === 'HUMAN' && (
                                        <button className={styles.closeChatBtn} onClick={() => closeConversation(selectedSessionId)}>
                                            <CheckCircle2 size={14} /> Close Chat
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.chatMessages}>
                                {messages
                                    .filter(msg => msg.message_text && msg.message_text.trim() !== '')
                                    .map((msg) => (
                                        <div key={msg.id} className={`${styles.message} ${msg.message_type === 'agent' ? styles.messageAgent :
                                            msg.message_type === 'bot' ? styles.messageBot : styles.messageUser
                                            }`}>
                                            <div className={styles.msgMeta}>
                                                <span className={styles.msgLabel}>{msg.message_type}</span>
                                                <span className={styles.msgTime}>{msg.created_at_ist}</span>
                                            </div>
                                            <div className={styles.msgText}>{msg.message_text}</div>
                                        </div>
                                    ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className={styles.chatInputArea}>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        className={styles.chatInput}
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder="Enter your message..."
                                    />
                                    <button className={styles.sendBtn} onClick={sendMessage} disabled={!newMessage.trim()}><Send size={16} /></button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className={styles.chatEmptyMinimal}>
                            <div className={styles.chatEmptyDot} />
                            <span>Select a visitor to start chatting</span>
                        </div>
                    )}
                </div>

                {/* 4. Right Panel: Visitor Intelligence */}
                {selectedSession && (
                    <div className={styles.intelPanel}>
                        <div className={styles.panelSection}>
                            <h3 className={styles.panelTitle}><Zap size={14} /> Lead Insights</h3>
                            <div className={`${styles.scoreCircle} ${getScoreColor(selectedSession.lead_score)}`}>
                                {Math.round(selectedSession.lead_score)}
                            </div>
                            <div className={styles.intelGroup}>
                                <span className={styles.intelLabel}>Lead Status</span>
                                <span className={styles.intelValue}>{selectedSession.lead_status || 'Unknown'}</span>
                            </div>
                        </div>

                        <div className={styles.panelSection}>
                            <h3 className={styles.panelTitle}><User size={14} /> Contact Data</h3>
                            <div className={styles.intelGroup}>
                                <span className={styles.intelLabel}>Email</span>
                                <span className={styles.intelValue}>{selectedSession.lead_email || 'Not provided'}</span>
                            </div>
                            <div className={styles.intelGroup}>
                                <span className={styles.intelLabel}>Phone</span>
                                <span className={styles.intelValue}>{selectedSession.lead_phone || 'Not provided'}</span>
                            </div>
                            <div className={styles.intelGroup}>
                                <span className={styles.intelLabel}>Company</span>
                                <span className={styles.intelValue}>{selectedSession.lead_company || 'Not provided'}</span>
                            </div>
                        </div>

                        <div className={styles.panelSection}>
                            <h3 className={styles.panelTitle}><Monitor size={14} /> Tech Stack</h3>
                            <div className={styles.intelGroup}>
                                <span className={styles.intelLabel}>Browser / OS</span>
                                <span className={styles.intelValue}>{selectedSession.browser} / {selectedSession.os}</span>
                            </div>
                            <div className={styles.intelGroup}>
                                <span className={styles.intelLabel}>IP Address</span>
                                <span className={styles.intelValue}>{selectedSession.initial_ip}</span>
                            </div>
                        </div>

                        <div className={styles.panelSection} style={{ borderBottom: 'none' }}>
                            <h3 className={styles.panelTitle}><Shield size={14} /> Sales Actions</h3>
                            <div className={styles.actionGrid}>
                                <button
                                    className={`${styles.actionBtn} ${selectedSession.lead_status === 'PRIORITY' ? styles.actionActive : ''}`}
                                    onClick={() => togglePriority(selectedSession.session_uuid)}
                                >
                                    <Star size={16} /> <span>Priority</span>
                                </button>
                                <button
                                    className={`${styles.actionBtn} ${selectedSession.spam_flag ? styles.actionActive : ''} ${styles.actionSpam}`}
                                    onClick={() => toggleSpam(selectedSession.session_uuid)}
                                >
                                    <ShieldAlert size={16} /> <span>Spam</span>
                                </button>
                                <button className={styles.actionBtn} onClick={() => blockVisitor(selectedSession.session_uuid)}>
                                    <Ban size={16} /> <span>Block</span>
                                </button>
                                <button className={`${styles.actionBtn} ${styles.actionSpam}`} onClick={() => closeConversation(selectedSession.session_uuid)}>
                                    <Clock size={16} /> <span>End Chat</span>
                                </button>
                                <button className={styles.actionBtn} onClick={() => {
                                    setSelectedSessionId(null);
                                    setMessages([]);
                                }}>
                                    <X size={16} /> <span>Close View</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
