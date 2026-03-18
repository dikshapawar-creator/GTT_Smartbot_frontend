'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    History,
    Clock,
    User,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    CalendarRange,
    MessageSquare,
    X,
    Loader2,
    Building2,
    Globe,
    Smartphone,
    ShieldCheck,
    ShieldAlert,
    Activity,
    Info,
    Monitor,
    Zap,
    Mail,
    Phone,
    Send
} from 'lucide-react';
import styles from '../live-chat/LiveChat.module.css';
import histStyles from './History.module.css';
import api from '@/config/api';
import { WS_BASE } from '@/config/api';
import { wsManager } from '@/lib/wsManager';
import { auth } from '@/lib/auth';
import { normalizeMessages, normalizeSessions, getSyncedNow } from '@/lib/time';

// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
    session_id: string;
    session_uuid: string;
    session_status: 'ACTIVE' | 'CLOSED';
    current_mode: 'BOT' | 'HUMAN';
    agent_name: string | null;
    is_locked: boolean;
    lead_name: string | null;
    lead_company: string | null;
    last_message_at: string | null;
    message_count: number;
    created_at: string | null;
    started_at_local: string | null;
    repeat_visitor: boolean;
    previous_session_count: number;

    // Enterprise Analytics
    lead_score: number;
    lead_status: string;
    spam_flag: boolean;
    language: string;
    duration_seconds: number;
    country: string | null;
    device_type: string | null;
    browser: string | null;
    initial_ip: string | null;
    lead_email?: string | null;
    lead_phone?: string | null;
    created_at_ist?: string;
}

interface Analytics {
    active_visitors: number;
    avg_lead_score: number;
    avg_duration: number;
    spam_visitors: number;
    agent_chats: number;
}

interface PaginatedHistory {
    total: number;
    page: number;
    page_size: number;
    items: Conversation[];
}

interface ChatMessage {
    id: number;
    session_id: string;
    message_type: 'user' | 'bot' | 'agent' | 'system';
    message_text: string;
    created_at_utc: string;
    created_at_ist?: string;
}

// ── Component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function HistoryPage() {
    const [data, setData] = useState<PaginatedHistory | null>(null);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [selectedSession, setSelectedSession] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Advanced Filters
    const [countryFilter, setCountryFilter] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('');
    const [minScore, setMinScore] = useState<number | ''>('');
    const [spamFilter, setSpamFilter] = useState<'ALL' | 'SPAM' | 'CLEAN'>('ALL');

    // Real-Time Chat Overrides
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [sessionLiveMode, setSessionLiveMode] = useState(false);
    const [serverOffset, setServerOffset] = useState<number>(0);

    const fetchAnalytics = async () => {
        try {
            const res = await api.get('/live-chat/analytics');
            setAnalytics(res.data);
        } catch (err) {
            console.error("Failed to fetch analytics", err);
        }
    };

    const syncServerTime = async () => {
        try {
            const res = await api.get('/live-chat/server-time');
            const t1 = Date.now();
            const serverTime = new Date(res.data.server_time_utc).getTime();
            setServerOffset(serverTime - t1);
        } catch (err) { console.error("Sync failed", err); }
    };

    const fetchHistory = useCallback(async (pageNum = 1) => {
        setLoading(true);

        const params: Record<string, string | number | boolean> = {
            page: pageNum,
            page_size: PAGE_SIZE,
        };
        if (statusFilter !== 'ALL') params.status_filter = statusFilter;
        if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
        if (dateTo) params.date_to = new Date(dateTo + 'T23:59:59').toISOString();

        // Note: Real enterprise backend would handle these filters server-side.
        // For now we apply them client-side or assume backend expansion.

        try {
            const res = await api.get('/live-chat/history', { params });
            const normalizedItems = normalizeSessions(res.data.items || []);
            setData({
                ...res.data,
                items: normalizedItems
            });
            setError(null);
        } catch {
            setError('Failed to load conversation history');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateFrom, dateTo]);

    // Initial load + filter re-fetch
    useEffect(() => {
        setPage(1);
        setSelectedSession(null);
        setMessages([]);
        fetchHistory(1);
        fetchAnalytics();
    }, [statusFilter, dateFrom, dateTo, fetchHistory]);

    // Pagination change
    useEffect(() => {
        fetchHistory(page);
    }, [page, fetchHistory]);

    // Lazy load messages when a session is clicked
    const openSession = async (conv: Conversation) => {
        if (selectedSession?.session_id === conv.session_id) return;

        setMessages([]);
        setMessagesLoading(true);
        setError(null);
        try {
            // Fetch full details (PII) using UUID for SQL Server robustness
            const detailRes = await api.get(`/live-chat/detail/${conv.session_uuid}`);
            setSelectedSession(detailRes.data);

            const res = await api.get(`/live-chat/messages/${conv.session_uuid}?page=1&page_size=100`);
            setMessages(normalizeMessages(res.data.items || []));

            // AUTO-RESUME IF ALREADY HUMAN
            if (detailRes.data.current_mode === 'HUMAN') {
                const token = auth.getAccessToken();
                setSessionLiveMode(true);
                if (token) connectWebSocket(conv.session_uuid, token);
            } else {
                setSessionLiveMode(false);
            }
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { status?: number } })?.response?.status === 409
                ? 'Session is already being handled by another agent.'
                : err instanceof Error ? err.message : 'Failed to load session details';
            console.error("Open session failed:", err);
            setError(errorMsg);
        } finally {
            setMessagesLoading(false);
        }
    };

    // ── Real-Time Logic (Resume from History) ────────────────────────────

    const connectWebSocket = useCallback((sessionId: string, token: string) => {
        const url = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=agent&token=${token}`;
        wsManager.connect(url, 'chat');
    }, []);

    useEffect(() => {
        if (!selectedSession || !sessionLiveMode) return;

        const unsubscribeMsg = wsManager.subscribe('message', (data: { purpose?: string; type?: string; message_text?: string; message?: string; created_at_utc?: string; sender?: string }) => {
            if (data.purpose !== 'chat') return;

            if (data.type !== 'TYPING_EVENT') {
                const messageType = (data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : data.sender === 'agent' ? 'agent' : 'bot') as 'user' | 'system' | 'agent' | 'bot';
                const messageText = data.message_text || data.message || '';

                const newMsg = normalizeMessages({
                    id: Date.now(),
                    session_id: selectedSession.session_uuid,
                    message_type: messageType,
                    message_text: messageText,
                    created_at_utc: data.created_at_utc || new Date(getSyncedNow(serverOffset)).toISOString()
                }) as ChatMessage;
                setMessages((prev) => [...prev, newMsg]);
            }
        });

        const unsubscribeSync = wsManager.subscribe('sync', (data: { purpose?: string; serverTime?: number; t1?: number }) => {
            if (data.purpose === 'chat' && data.serverTime !== undefined && data.t1 !== undefined) {
                setServerOffset(data.serverTime - data.t1);
            }
        });

        return () => {
            unsubscribeMsg();
            unsubscribeSync();
        };
    }, [selectedSession, sessionLiveMode, serverOffset]);

    const resumeChat = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/intervene/${sessionId}`);
            setSessionLiveMode(true);
            const token = auth.getAccessToken();
            if (token) connectWebSocket(sessionId, token);

            // Mark visually active
            if (selectedSession) {
                const updated = { ...selectedSession, current_mode: 'HUMAN', session_status: 'ACTIVE' };
                setSelectedSession((normalizeSessions([updated]) as Conversation[])[0]);
            }
            setError(null);
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { status?: number } })?.response?.status === 409
                ? 'Conflict: This chat is already active with another agent.'
                : 'Failed to resume chat';
            console.error('Failed to resume chat:', err);
            setError(errorMsg);
        }
    };

    const sendMessage = () => {
        if (wsManager.getStatus('chat') !== 'OPEN' || !newMessage.trim() || !selectedSession) return;

        wsManager.send({ message: newMessage.trim() }, 'chat');
        const optimisticMsg = normalizeMessages({
            id: Date.now(),
            session_id: selectedSession.session_uuid,
            message_type: 'agent' as const,
            message_text: newMessage.trim(),
            created_at_utc: new Date(getSyncedNow(serverOffset)).toISOString(),
        }) as ChatMessage;
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
    };


    useEffect(() => {
        const syncInterval = setInterval(syncServerTime, 120000);
        return () => {
            clearInterval(syncInterval);
        };
    }, []);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Client-side search & advanced filter
    const filteredItems = (data?.items || []).filter(c => {
        const matchesSearch = !searchTerm || [
            c.lead_name,
            c.lead_company,
            c.session_id,
            c.initial_ip
        ].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCountry = !countryFilter || c.country === countryFilter;
        const matchesDevice = !deviceFilter || c.device_type === deviceFilter;
        const matchesScore = minScore === '' || c.lead_score >= minScore;
        const matchesSpam = spamFilter === 'ALL' || (spamFilter === 'SPAM' ? c.spam_flag : !c.spam_flag);

        return matchesSearch && matchesCountry && matchesDevice && matchesScore && matchesSpam;
    });

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;


    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return histStyles.scoreHigh;
        if (score >= 50) return histStyles.scoreMedium;
        return histStyles.scoreLow;
    };

    const clearFilters = () => {
        setStatusFilter('ALL');
        setDateFrom('');
        setDateTo('');
        setSearchTerm('');
        setCountryFilter('');
        setDeviceFilter('');
        setMinScore('');
        setSpamFilter('ALL');
    };

    const hasActiveFilters = statusFilter !== 'ALL' || dateFrom || dateTo || searchTerm || countryFilter || deviceFilter || minScore !== '' || spamFilter !== 'ALL';


    return (
        <div className={histStyles.dashboardWrapper}>
            {/* Hero Section */}
            <div className={histStyles.heroSection}>
                <div className={histStyles.heroLeft}>
                    <h1 className={histStyles.heroTitle}>
                        <History size={22} style={{ color: '#6366f1' }} />
                        Conversation History
                    </h1>
                    <p className={histStyles.heroSubtitle}>Review and analyze past visitor interactions and automated logs</p>
                </div>
                <div className={histStyles.heroStats}>
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#10b981' }}>{analytics?.active_visitors || 0}</span>
                        <span className={histStyles.heroStatLabel}>Total Active</span>
                    </div>
                    <div className={histStyles.heroStatDivider} />
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#6366f1' }}>{analytics?.avg_lead_score || 0}</span>
                        <span className={histStyles.heroStatLabel}>Avg Score</span>
                    </div>
                    <div className={histStyles.heroStatDivider} />
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#f59e0b' }}>{formatDuration(analytics?.avg_duration || 0)}</span>
                        <span className={histStyles.heroStatLabel}>Avg Duration</span>
                    </div>
                    <div className={histStyles.heroStatDivider} />
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#ef4444' }}>{analytics?.spam_visitors || 0}</span>
                        <span className={histStyles.heroStatLabel}>Spam</span>
                    </div>
                </div>
            </div>

            <div className={histStyles.container}>
                {/* ── Archive List Panel ─────────────────────────────────── */}
                <div className={histStyles.listPanel}>

                    {/* Filter Bar */}
                    <div className={histStyles.filterBar}>
                        <div className={histStyles.searchRow}>
                            <div className={histStyles.searchWrap}>
                                <Search size={15} className={histStyles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Search leads, IP, or session..."
                                    className={histStyles.searchInput}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={histStyles.filtersGrid}>
                            <select
                                className={histStyles.filterSelect}
                                value={countryFilter}
                                onChange={e => setCountryFilter(e.target.value)}
                            >
                                <option value="">All Countries</option>
                                <option value="India">India</option>
                                <option value="United States">USA</option>
                                <option value="United Kingdom">UK</option>
                            </select>
                            <select
                                className={histStyles.filterSelect}
                                value={deviceFilter}
                                onChange={e => setDeviceFilter(e.target.value)}
                            >
                                <option value="">All Devices</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Mobile">Mobile</option>
                            </select>
                            <select
                                className={histStyles.filterSelect}
                                value={minScore === '' ? '' : minScore.toString()}
                                onChange={e => setMinScore(e.target.value === '' ? '' : Number(e.target.value))}
                            >
                                <option value="">All Scores</option>
                                <option value="80">Hot (80+)</option>
                                <option value="50">Warm (50+)</option>
                                <option value="0">Cold (0+)</option>
                            </select>
                            <select
                                className={histStyles.filterSelect}
                                value={spamFilter}
                                onChange={e => setSpamFilter(e.target.value as 'ALL' | 'SPAM' | 'CLEAN')}
                            >
                                <option value="ALL">Spam: All</option>
                                <option value="CLEAN">Clean Only</option>
                                <option value="SPAM">Spam Only</option>
                            </select>
                        </div>

                        <div className={histStyles.dateRow}>
                            <CalendarRange size={16} className={histStyles.calIcon} />
                            <input
                                type="date"
                                className={histStyles.dateInput}
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                            />
                            <span style={{ color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 600 }}>to</span>
                            <input
                                type="date"
                                className={histStyles.dateInput}
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className={histStyles.statusToggle} style={{ display: 'flex', gap: '4px' }}>
                                {(['ACTIVE', 'CLOSED'] as const).map(s => (
                                    <button
                                        key={s}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '12px',
                                            borderRadius: '6px',
                                            border: '1px solid var(--color-border)',
                                            background: statusFilter === s ? 'var(--color-accent)' : 'var(--color-bg)',
                                            color: statusFilter === s ? '#fff' : 'var(--color-text-primary)',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                        onClick={() => setStatusFilter(statusFilter === s ? 'ALL' : s)}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            {hasActiveFilters && (
                                <button className={histStyles.clearBtn} onClick={clearFilters}>
                                    <X size={12} /> Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div className={styles.emptyState}>
                                <Loader2 size={24} className={histStyles.spin} />
                                Loading sessions...
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className={styles.emptyState}>
                                <History size={32} className={styles.emptyIcon} />
                                <p>No matches found</p>
                            </div>
                        ) : (
                            <div className={styles.conversationList}>
                                {filteredItems.map(conv => (
                                    <div
                                        key={conv.session_id}
                                        onClick={() => openSession(conv)}
                                        className={`${styles.conversationCard} ${histStyles.archiveCard} ${selectedSession?.session_id === conv.session_id ? styles.cardActive : ''}`}
                                    >
                                        <div className={styles.cardHeader}>
                                            <div className={styles.cardInfo}>
                                                <div className={styles.cardName}>
                                                    <User size={13} />
                                                    {conv.lead_name || 'Anonymous Visitor'}
                                                </div>
                                                {conv.lead_company && (
                                                    <div className={styles.cardCompany}>
                                                        <Building2 size={11} /> {conv.lead_company}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={getScoreColor(conv.lead_score)} style={{ fontSize: '18px' }}>
                                                {conv.lead_score >= 80 ? '🔥' : conv.lead_score >= 50 ? '⚡' : '❄️'}
                                            </div>
                                        </div>

                                        <div className={histStyles.cardScoreRow}>
                                            <div className={`${histStyles.scoreBadge} ${getScoreColor(conv.lead_score)}`}>
                                                Score: {conv.lead_score}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                                                {conv.country || 'Unknown Location'}
                                            </div>
                                        </div>

                                        <div className={histStyles.cardMetrics}>
                                            <span><MessageSquare size={11} /> {conv.message_count}</span>
                                            <span><Clock size={11} /> {formatDuration(conv.duration_seconds)}</span>
                                            <span>
                                                {conv.device_type === 'Mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {data && data.total > PAGE_SIZE && (
                        <div className={histStyles.paginationBar} style={{ padding: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className={histStyles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={16} /></button>
                            <span style={{ fontSize: '12px' }}>Page {page} of {totalPages}</span>
                            <button className={histStyles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight size={16} /></button>
                        </div>
                    )}
                </div>

                {/* ── Message Viewer Panel (Center) ───────────────────────── */}
                <div className={styles.chatPanel} style={{ flex: 1 }}>
                    {selectedSession ? (
                        <>
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderInfo} style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700 }}>
                                            Session Log — {selectedSession.session_id.slice(0, 8).toUpperCase()}
                                        </h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Globe size={14} /> {selectedSession.country}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {selectedSession.device_type === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                                                {selectedSession.browser}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Zap size={14} color="#f59e0b" /> Score: {selectedSession.lead_score}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.chatMessages} style={{ padding: '24px' }}>
                                {error ? (
                                    <div className={histStyles.panelLoader} style={{ color: '#ef4444' }}>
                                        <AlertCircle size={32} />
                                        <p>{error}</p>
                                        <button
                                            onClick={() => selectedSession && openSession(selectedSession)}
                                            style={{ marginTop: '12px', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}
                                        >
                                            Try again
                                        </button>
                                    </div>
                                ) : messagesLoading ? (
                                    <div className={histStyles.panelLoader} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                                        <Loader2 size={28} className={histStyles.spin} />
                                        <p>Decrypting conversation history...</p>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className={histStyles.panelLoader} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
                                        <MessageSquare size={28} />
                                        <p>No messages recorded.</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`${styles.message} ${msg.message_type === 'agent' ? styles.messageAgent
                                                : msg.message_type === 'system' ? styles.messageSystem
                                                    : msg.message_type === 'bot' ? styles.messageBot
                                                        : styles.messageUser
                                                }`}
                                        >
                                            <div className={styles.msgLabel}>
                                                {msg.message_type === 'agent' ? 'Agent'
                                                    : msg.message_type === 'bot' ? 'Bot Assistant'
                                                        : 'Visitor'}
                                            </div>
                                            <div className={styles.msgText}>{msg.message_text}</div>
                                            <div className={styles.msgTime}>
                                                {msg.created_at_ist}
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* ── Chat Input / Intervention Area ── */}
                            {sessionLiveMode ? (
                                <div className={styles.chatInputArea} style={{ borderTop: '1px solid var(--color-border)', padding: '16px', background: 'var(--color-bg-elevated)', borderRadius: '0 0 12px 12px' }}>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            type="text"
                                            className={styles.chatInput}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Type a message to resume conversation..."
                                        />
                                        <button
                                            className={styles.sendBtn}
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim()}
                                            style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        >
                                            <Send size={16} /> Send
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', display: 'flex', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => resumeChat(selectedSession.session_uuid)}
                                        style={{ background: 'linear-gradient(135deg, var(--color-primary), #0056b3)', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    >
                                        <MessageSquare size={16} />
                                        Resume Chat
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.chatEmpty}>
                            <Activity size={48} className={styles.emptyIcon} />
                            <h3>Lead Intelligence Dashboard</h3>
                            <p>Select a session to unlock visitor behavioral data and conversation logs.</p>
                        </div>
                    )}
                </div>

                {/* ── Lead Intelligence Panel (Right Sidebar) ───────────── */}
                <div className={histStyles.intelligencePanel}>
                    <div className={histStyles.panelHeader}>
                        <div className={histStyles.panelTitle}>
                            <ShieldCheck size={16} /> Lead Intelligence
                        </div>
                    </div>

                    <div className={histStyles.panelContent}>
                        {selectedSession ? (
                            <>
                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Visitor ID</span>
                                    <span className={histStyles.intelValue}>
                                        {selectedSession.lead_name || 'Anonymous'}
                                    </span>
                                </div>

                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Company</span>
                                    <span className={histStyles.intelValue}>
                                        <Building2 size={13} /> {selectedSession.lead_company || 'N/A'}
                                    </span>
                                </div>

                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Contact Info</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <span className={histStyles.intelValue}>
                                            <Mail size={13} /> {selectedSession.lead_email || 'Not Provided'}
                                        </span>
                                        <span className={histStyles.intelValue}>
                                            <Phone size={13} /> {selectedSession.lead_phone || 'Not Provided'}
                                        </span>
                                    </div>
                                </div>

                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Lead Quality</span>
                                    <div className={histStyles.intelValue}>
                                        <span className={`${histStyles.scoreBadge} ${getScoreColor(selectedSession.lead_score)}`}>
                                            {selectedSession.lead_score} — {selectedSession.lead_status}
                                        </span>
                                    </div>
                                </div>

                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Security Audit Scan</span>
                                    <div className={histStyles.intelValue}>
                                        {selectedSession.spam_flag ? (
                                            <span className={histStyles.spamTag}>
                                                <ShieldAlert size={12} /> SPAM DETECTED
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--color-success)', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <ShieldCheck size={14} /> VERIFIED VISITOR
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Session Details</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Language:</span>
                                            <span style={{ fontWeight: 500 }}>{selectedSession.language === 'en' ? '🇺🇸 English' : selectedSession.language}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>IP Address:</span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{selectedSession.initial_ip}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Started At (IST):</span>
                                            <span style={{ fontWeight: 500 }}>
                                                {selectedSession.created_at_ist}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={histStyles.intelGroup}>
                                    <span className={histStyles.intelLabel}>Interest Profile</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-bg)', fontSize: '10px', border: '1px solid var(--color-border)' }}>
                                            Returning Visitor
                                        </span>
                                        <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'var(--color-bg)', fontSize: '10px', border: '1px solid var(--color-border)' }}>
                                            High Interest
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                <Info size={32} />
                                <p style={{ fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>Pick a session to see detailed lead scoring and visitor intelligence.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
