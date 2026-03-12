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
import api from '@/config/api';
import { auth } from '@/lib/auth';


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
}




interface ChatMessage {
    id: number;
    session_id: string;
    message_type: 'user' | 'bot' | 'agent' | 'system';
    message_text: string;
    created_at_utc: string;
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
    const wsRef = useRef<WebSocket | null>(null);
    const dashboardWsRef = useRef<WebSocket | null>(null);
    const [typingSessions, setTypingSessions] = useState<Record<string, boolean>>({});
    const [liveDurations, setLiveDurations] = useState<Record<string, number>>({});
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

    const selectedSession = useMemo(() =>
        conversations.find(c => c.session_uuid === selectedSessionId) || null
        , [conversations, selectedSessionId]);

    // ── IST Timezone Helper ──────────────────────────────────────────────

    const formatIST = (dateStr: string | null) => {
        if (!dateStr) return '—';
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }).format(date);
        } catch {
            return '—';
        }
    };

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
            const res = await api.get('/live-chat/conversations');
            setConversations(res.data || []);
            setError(null);
            fetchAnalytics();
        } catch (err: unknown) {
            console.error('LiveChat: Failed to fetch conversations', err);
            setError('Failed to load conversations');

            const errorMessage = err instanceof Error ? err.message : String(err);

            // If 401 Unauthorized, stop polling to prevent terminal spam
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

    // ── Poll for conversations ───────────────────────────────────────────

    // ── Live Session Duration Counter ──────────────────────────────
    useEffect(() => {
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

        durationIntervalRef.current = setInterval(() => {
            setLiveDurations(prev => {
                const next = { ...prev };
                conversations.forEach(conv => { // Changed from data?.items to conversations
                    if (conv.session_status === 'ACTIVE') {
                        // Calculate duration from created_at if not already tracked
                        if (!next[conv.session_uuid] && conv.created_at) {
                            const startTime = new Date(conv.created_at).getTime();
                            next[conv.session_uuid] = Math.floor((Date.now() - startTime) / 1000);
                        } else if (next[conv.session_uuid]) {
                            next[conv.session_uuid]++;
                        }
                    }
                });
                return next;
            });
        }, 1000);

        return () => {
            if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        };
    }, [conversations]); // Dependency changed to conversations

    useEffect(() => {
        fetchConversations();
        pollRef.current = setInterval(fetchConversations, 10000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchConversations]);

    // ── Fetch message history ────────────────────────────────────────────

    // ── WebSocket Typing Listener ──────────────────────────────────
    const handleTypingEvent = useCallback((sessionId: string, isTyping: boolean) => {
        setTypingSessions(prev => ({ ...prev, [sessionId]: isTyping }));
    }, []);

    // ── Lazy load messages when a session is clicked ────────────────
    const fetchMessages = useCallback(
        async (sessionId: string) => {
            const token = getToken();
            if (!token) return;

            try {
                const res = await api.get(`/live-chat/messages/${sessionId}?page=1&page_size=100`);
                setMessages(res.data.items || []);
                setError(null); // Clear previous errors on success
            } catch {
                setError('Failed to load messages');
            }
        },
        [getToken],
    );

    // ── Sales Actions ────────────────────────────────────────────────────

    const togglePriority = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/toggle-priority/${sessionId}`);
            // WebSocket will update the UI
        } catch (err) { console.error("Toggle priority failed", err); }
    };

    const toggleSpam = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/toggle-spam/${sessionId}`);
        } catch (err) { console.error("Toggle spam failed", err); }
    };

    const blockVisitor = async (sessionId: string) => {
        if (!confirm("Are you sure you want to block this visitor? This will close their session immediately.")) return;
        try {
            await api.post(`/live-chat/block-visitor/${sessionId}`);
            setSelectedSessionId(null);
        } catch (err) { console.error("Block failed", err); }
    };

    // ── Conversation Life Cycle ───────────────────────────────────────────

    const intervene = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/intervene/${sessionId}`);
            setSelectedSessionId(sessionId);
            await fetchMessages(sessionId);
            const token = getToken();
            if (token) connectWebSocket(sessionId, token);
            fetchConversations(); // Refresh list to show agent name
        } catch (e: unknown) {
            const errorMsg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Intervene failed';
            setError(errorMsg);
        }
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

    // ── Open existing connected conversation ─────────────────────────────

    const openChat = async (sessionId: string) => {
        setSelectedSessionId(sessionId);
        await fetchMessages(sessionId);
        const token = getToken();
        if (token) connectWebSocket(sessionId, token);
    };

    // ── WebSocket connection ─────────────────────────────────────────────


    // ── Dashboard WebSocket: Real-time List Updates ──────────────────────
    const connectDashboardWS = useCallback((token: string) => {
        if (dashboardWsRef.current) return;

        const ws = new WebSocket(`${WS_BASE}/ws/dashboard?token=${token}`);

        ws.onopen = () => console.log('Dashboard WS Connected');
        ws.onmessage = (event) => {
            try {
                const { type, data } = JSON.parse(event.data);
                console.log('Dashboard WS Event:', type, data);

                if (type === 'NEW_CONVERSATION') {
                    setConversations(prev => {
                        const exists = prev.find(c => c.session_uuid === data.session_uuid);
                        if (exists) return prev;
                        return [data, ...prev];
                    });
                } else if (type === 'SESSION_UPDATED') {
                    setConversations(prev => prev.map(c =>
                        c.session_uuid === data.session_uuid ? { ...c, ...data } : c
                    ));
                    // If the selected session was updated, we might want more logic here
                } else if (type === 'NEW_MESSAGE') {
                    setConversations(prev => prev.map(c => {
                        if (c.session_uuid === data.session_id) {
                            return {
                                ...c,
                                message_count: c.message_count + 1,
                                last_message_at: data.timestamp
                            };
                        }
                        return c;
                    }).sort((a, b) => {
                        const timeA = new Date(a.last_message_at || 0).getTime();
                        const timeB = new Date(b.last_message_at || 0).getTime();
                        return timeB - timeA;
                    }));
                }
            } catch (err) {
                console.error('Failed to parse dashboard message', err);
            }
        };

        ws.onclose = () => {
            console.log('Dashboard WS Closed');
            dashboardWsRef.current = null;
        };

        dashboardWsRef.current = ws;
    }, []);

    useEffect(() => {
        const token = getToken();
        if (token && !dashboardWsRef.current) {
            connectDashboardWS(token);
        }
        return () => {
            if (dashboardWsRef.current) {
                dashboardWsRef.current.close();
                dashboardWsRef.current = null;
            }
        };
    }, [getToken, connectDashboardWS]);

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
                // The SESSION_UPDATED broadcast will handle updating the UI for everyone
            } catch (err) {
                console.error("Failed to auto-update lead info", err);
            }
        }
    }, []);

    const connectWebSocket = useCallback((sessionId: string, token: string) => {
        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Secure per-session chat WebSocket
        const ws = new WebSocket(
            `${WS_BASE}/ws/chat/${sessionId}?role=agent&token=${token}`,
        );

        ws.onopen = () => {
            console.log('Agent WebSocket connected for session:', sessionId);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'TYPING_EVENT') {
                    handleTypingEvent(data.session_id, data.is_typing);
                    // Clear any existing timeout for this session
                    if (typingTimeoutRef.current[data.session_id]) {
                        clearTimeout(typingTimeoutRef.current[data.session_id]);
                    }
                    // Set a timeout to clear typing status after a short period
                    if (data.is_typing) {
                        typingTimeoutRef.current[data.session_id] = setTimeout(() => {
                            handleTypingEvent(data.session_id, false);
                        }, 3000); // Clear typing status after 3 seconds
                    }
                    return;
                }

                const newMsg: ChatMessage = {
                    id: Date.now(),
                    session_id: sessionId,
                    message_type: data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : 'bot',
                    message_text: data.message,
                    created_at_utc: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, newMsg]);

                // Auto-extract contact info from user messages
                if (data.sender === 'user') {
                    extractContactInfo(data.message, sessionId);
                }
            } catch {
                console.error('Failed to parse WS message');
            }
        };

        ws.onclose = () => {
            console.log('Agent WebSocket disconnected');
        };

        ws.onerror = (err) => {
            console.error('Agent WebSocket error:', err);
        };

        wsRef.current = ws;
    }, [handleTypingEvent, extractContactInfo]);

    // ── Send message ────────────────────────────────────────────────────

    const sendTypingStatus = (isTyping: boolean) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                is_typing: isTyping
            }));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        sendTypingStatus(true);

        const sid = selectedSessionId || '';
        if (typingTimeoutRef.current[sid]) clearTimeout(typingTimeoutRef.current[sid]);
        typingTimeoutRef.current[sid] = setTimeout(() => sendTypingStatus(false), 2000);
    };

    const sendMessage = () => {
        if (!wsRef.current || !newMessage.trim()) return;

        sendTypingStatus(false);
        wsRef.current.send(JSON.stringify({ message: newMessage.trim() }));

        // Optimistic local append
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                session_id: selectedSessionId || '',
                message_type: 'agent',
                message_text: newMessage.trim(),
                created_at_utc: new Date().toISOString(),
            },
        ]);
        setNewMessage('');
    };

    // ── Auto-scroll ──────────────────────────────────────────────────────

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Cleanup ──────────────────────────────────────────────────────────

    useEffect(() => {
        const currentTypingTimeouts = typingTimeoutRef.current;
        return () => {
            if (wsRef.current) wsRef.current.close();
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
                                        <span>{formatIST(conv.last_message_at)}</span>
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
                                        <span><Clock size={12} /> IST: {formatIST(selectedSession?.created_at || null)}</span>
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
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`${styles.message} ${msg.message_type === 'agent' ? styles.messageAgent :
                                        msg.message_type === 'bot' ? styles.messageBot : styles.messageUser
                                        }`}>
                                        <div className={styles.msgMeta}>
                                            <span className={styles.msgLabel}>{msg.message_type}</span>
                                            <span className={styles.msgTime}>{formatIST(msg.created_at_utc)}</span>
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
                                    if (wsRef.current) wsRef.current.close();
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
