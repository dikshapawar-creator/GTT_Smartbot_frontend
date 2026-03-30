'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    History,
    Clock,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    X,
    Loader2,
    Globe,
    Smartphone,
    Activity,
    Info,
    Monitor,
    Zap,
    Send,
    ArrowUp,
    Download,
    Check,
    Star,
    ShieldAlert,
    Ban,
    Eye,
    User
} from 'lucide-react';
import styles from '../live-chat/LiveChat.module.css';
import histStyles from './History.module.css';
import api from '@/config/api';
import { WS_BASE } from '@/config/api';
import { wsManager } from '@/lib/wsManager';
import { auth } from '@/lib/auth';
import { normalizeMessages, normalizeSessions, getSyncedNow, formatToIST } from '@/lib/time';
import {
    formatDuration,
    getDisplayName,
    getInitials,
    getAvatarGradient,
    getStatusBadgeClasses,
    getLeadScoreConfig
} from '@/lib/historyUtils';

// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
    session_id: string;
    session_uuid: string;
    session_status: string;
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
    os: string | null;
    initial_ip: string | null;
    lead_email?: string | null;
    lead_phone?: string | null;
    created_at_ist?: string;
    ended_at_utc?: string | null;
    assigned_agent_id?: number | null;
    assigned_agent_email?: string | null;
    assigned_agent_name?: string | null;
    agent_joined_at?: string | null;
    closed_by_agent_id?: number | null;
    closed_by_agent_email?: string | null;
    closed_by_agent_name?: string | null;
    agent_closed_at?: string | null;
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
    sender_user_id?: number | null;
    sender_name?: string | null;
    sender_email?: string | null;
    client_msg_id?: string | null;
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
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'closed'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Advanced Filters
    const [countryFilter, setCountryFilter] = useState('');
    const [deviceFilter, setDeviceFilter] = useState('');
    const [spamFilter, setSpamFilter] = useState<'all' | 'spam' | 'clean'>('all');

    // Real-Time Chat Overrides
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [sessionLiveMode, setSessionLiveMode] = useState(false);
    const [serverOffset, setServerOffset] = useState<number>(0);
    const [sendError, setSendError] = useState<string | null>(null);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        email: '',
        phone: '',
        company: ''
    });
    const [updating, setUpdating] = useState(false);

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
        } catch (err) {
            console.error("Sync failed", err);
        }
    };

    const fetchHistory = useCallback(async (pageNum = 1) => {
        setLoading(true);

        const params: Record<string, string | number | boolean> = {
            page: pageNum,
            page_size: PAGE_SIZE,
        };
        if (activeTab === 'active') params.status_filter = 'active';
        if (activeTab === 'closed') params.status_filter = 'ended';
        if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
        if (dateTo) params.date_to = new Date(dateTo + 'T23:59:59').toISOString();

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
    }, [activeTab, dateFrom, dateTo]);

    useEffect(() => {
        setPage(1);
        setSelectedSession(null);
        setMessages([]);
        fetchHistory(1);
        fetchAnalytics();
    }, [activeTab, dateFrom, dateTo, fetchHistory]);

    useEffect(() => {
        fetchHistory(page);
    }, [page, fetchHistory]);

    const connectWebSocket = useCallback((sessionId: string, token: string) => {
        const url = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=agent&token=${token}`;
        wsManager.connect(url, 'chat');
    }, []);

    useEffect(() => {
        if (!selectedSession || !sessionLiveMode) return;

        const unsubscribeMsg = wsManager.subscribe('message', (data: { purpose?: string; type?: string; message_text?: string; message?: string; created_at_utc?: string; sender?: string; id?: number; sender_name?: string; sender_email?: string; client_msg_id?: string }) => {
            if (data.purpose !== 'chat') return;

            if (data.type !== 'TYPING_EVENT') {
                const messageType = (data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : data.sender === 'agent' ? 'agent' : 'bot') as 'user' | 'system' | 'agent' | 'bot';
                const messageText = data.message_text || data.message || '';

                const newMsg = normalizeMessages({
                    id: data.id || Date.now(),
                    session_id: selectedSession.session_uuid,
                    message_type: messageType,
                    message_text: messageText,
                    sender_name: data.sender_name,
                    sender_email: data.sender_email,
                    client_msg_id: data.client_msg_id,
                    created_at_utc: data.created_at_utc || new Date(getSyncedNow(serverOffset)).toISOString()
                }) as ChatMessage;

                setMessages((prev) => {
                    // Check for duplicate by client_msg_id first
                    if (newMsg.client_msg_id) {
                        const existingIdx = prev.findIndex(m => m.client_msg_id === newMsg.client_msg_id);
                        if (existingIdx !== -1) {
                            const updated = [...prev];
                            updated[existingIdx] = newMsg; // Update optimistic message with server data
                            return updated;
                        }
                    }

                    // Fallback to fuzzy deduplication
                    const isDuplicate = prev.some(m =>
                        m.message_text === newMsg.message_text &&
                        m.message_type === newMsg.message_type &&
                        (m.id === newMsg.id || Math.abs(new Date(m.created_at_utc).getTime() - new Date(newMsg.created_at_utc).getTime()) < 3000)
                    );
                    if (isDuplicate) return prev;
                    return [...prev, newMsg];
                });
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
    }, [selectedSession, serverOffset, sessionLiveMode]);

    const handleViewSession = async (session: Conversation) => {
        if (selectedSession?.session_id === session.session_id) return;

        setMessages([]);
        setMessagesLoading(true);
        setError(null);
        setSessionLiveMode(false);

        try {
            const detailRes = await api.get(`/live-chat/detail/${session.session_uuid}`);
            setSelectedSession(detailRes.data);

            const res = await api.get(`/live-chat/messages/${session.session_uuid}?page=1&page_size=100`);
            setMessages(normalizeMessages(res.data.items || []));

        } catch (err: unknown) {
            const errorMsg = (err as { response?: { status?: number } })?.response?.status === 409
                ? 'Session is already being handled by another agent.'
                : err instanceof Error ? err.message : 'Failed to load session details';
            console.error("View session failed:", err);
            setError(errorMsg);
        } finally {
            setMessagesLoading(false);
        }
    };

    const handleResumeChat = async (session: Conversation) => {
        const isEnded = session.session_status?.toLowerCase() === 'ended' || session.session_status?.toLowerCase() === 'closed';
        if (isEnded) return;

        try {
            if (selectedSession?.session_id !== session.session_id) {
                await handleViewSession(session);
            }
            await api.post(`/live-chat/intervene/${session.session_uuid}`);
            setSessionLiveMode(true);
            const token = auth.getAccessToken();
            if (token) connectWebSocket(session.session_uuid, token);

            if (selectedSession) {
                const updated = { ...selectedSession, current_mode: 'HUMAN' as const, session_status: 'ACTIVE' };
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
        const status = wsManager.getStatus('chat');
        if (status !== 'OPEN') {
            if (status === 'CONNECTING') {
                setSendError('Still connecting to live chat... please wait a moment.');
            } else {
                setSendError('Not connected to live chat. Please try clicking Resume Chat again.');
            }
            return;
        }

        if (!newMessage.trim() || !selectedSession) return;

        const clientMsgId = `cl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        wsManager.send({ message: newMessage.trim(), client_msg_id: clientMsgId }, 'chat');

        const user = auth.getUser();
        const optimisticMsg = normalizeMessages({
            id: Date.now(),
            session_id: selectedSession.session_uuid,
            message_type: 'agent' as const,
            message_text: newMessage.trim(),
            sender_user_id: user?.id,
            sender_name: user?.full_name || user?.email || 'Agent',
            sender_email: user?.email,
            client_msg_id: clientMsgId,
            created_at_utc: new Date(getSyncedNow(serverOffset)).toISOString(),
        }) as ChatMessage;
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setSendError(null);
    };

    const handleSaveLead = async () => {
        if (!selectedSession) return;
        setUpdating(true);
        try {
            await api.post(`/live-chat/update-lead/${selectedSession.session_uuid}`, editData);
            setSelectedSession(prev => prev ? {
                ...prev,
                lead_name: editData.name,
                lead_email: editData.email,
                lead_phone: editData.phone,
                lead_company: editData.company
            } : null);
            fetchHistory(page);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update lead:', err);
            setError('Failed to update lead information');
        } finally {
            setUpdating(false);
        }
    };

    const handleEditToggle = () => {
        if (!selectedSession) return;
        if (!isEditing) {
            setEditData({
                name: selectedSession.lead_name || '',
                email: selectedSession.lead_email || '',
                phone: selectedSession.lead_phone || '',
                company: selectedSession.lead_company || ''
            });
        }
        setIsEditing(!isEditing);
    };

    useEffect(() => {
        const syncInterval = setInterval(syncServerTime, 120000);
        return () => clearInterval(syncInterval);
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const filteredItems = useMemo(() => {
        return (data?.items || [])
            .filter(c => {
                const isEnded = c.session_status?.toLowerCase() === 'ended' || c.session_status?.toLowerCase() === 'closed';
                if (activeTab === 'active') return !isEnded;
                if (activeTab === 'closed') return isEnded;
                return true;
            })
            .filter(c => {
                const matchesSearch = !searchTerm || [
                    getDisplayName(c),
                    c.lead_company,
                    c.session_id,
                    c.initial_ip,
                    c.session_uuid
                ].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));

                const matchesCountry = !countryFilter || c.country === countryFilter;
                const matchesDevice = !deviceFilter || c.device_type === deviceFilter;
                const matchesSpam = spamFilter === 'all' || (spamFilter === 'spam' ? c.spam_flag : !c.spam_flag);

                return matchesSearch && matchesCountry && matchesDevice && matchesSpam;
            })
            .filter((s, i, arr) => arr.findIndex(x => x.session_uuid === s.session_uuid) === i)
            .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }, [data?.items, activeTab, searchTerm, countryFilter, deviceFilter, spamFilter]);

    const getTabCount = (tab: 'all' | 'active' | 'closed') => {
        if (!data?.items) return 0;
        if (tab === 'all') return data.items.length;
        return data.items.filter(c => {
            const isEnded = c.session_status?.toLowerCase() === 'ended' || c.session_status?.toLowerCase() === 'closed';
            return tab === 'active' ? !isEnded : isEnded;
        }).length;
    };

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

    const clearFilters = () => {
        setActiveTab('all');
        setDateFrom('');
        setDateTo('');
        setSearchTerm('');
        setCountryFilter('');
        setDeviceFilter('');
        setSpamFilter('all');
    };

    const hasActiveFilters = activeTab !== 'all' || dateFrom || dateTo || searchTerm || countryFilter || deviceFilter || spamFilter !== 'all';

    return (
        <div className={histStyles.dashboardWrapper}>
            <div className={histStyles.heroSection}>
                <div className={histStyles.heroLeft}>
                    <div className={histStyles.pageTag}>
                        <History size={11} />
                        Conversation history
                    </div>
                    <h1 className={histStyles.heroTitle}>Conversation History</h1>
                    <p className={histStyles.heroSubtitle}>Review and analyze past visitor interactions and automated logs</p>
                </div>
                <div className={histStyles.heroStats}>
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#f9fafb' }}>{data?.total || 0}</span>
                        <span className={histStyles.heroStatLabel}>Total sessions</span>
                    </div>
                    <div className={histStyles.heroStatDivider} />
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#16a34a' }}>
                            {data?.items?.filter(s => s.lead_name).length || 0}
                        </span>
                        <span className={histStyles.heroStatLabel}>With leads</span>
                    </div>
                    <div className={histStyles.heroStatDivider} />
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: '#f59e0b' }}>
                            {formatDuration(analytics?.avg_duration || 0)}
                        </span>
                        <span className={histStyles.heroStatLabel}>Avg duration</span>
                    </div>
                    <div className={histStyles.heroStatDivider} />
                    <div className={histStyles.heroStat}>
                        <span className={histStyles.heroStatValue} style={{ color: analytics?.spam_visitors ? '#ef4444' : '#6b7280' }}>
                            {analytics?.spam_visitors || 0}
                        </span>
                        <span className={histStyles.heroStatLabel}>Spam</span>
                    </div>
                </div>
            </div>

            <div className={histStyles.container}>
                <div className={histStyles.listPanel}>
                    <div className={histStyles.filters}>
                        <div className={histStyles.filterRow}>
                            <div className={histStyles.searchWrap}>
                                <Search className={histStyles.searchIcon} size={14} />
                                <input
                                    type="text"
                                    placeholder="Search visitor, IP, session ID..."
                                    className={histStyles.searchInput}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className={histStyles.filtersGrid}>
                            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className={histStyles.filterSelect}>
                                <option value="">All countries</option>
                                <option value="India">India</option>
                                <option value="United States">USA</option>
                                <option value="United Kingdom">UK</option>
                            </select>
                            <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className={histStyles.filterSelect}>
                                <option value="">All devices</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Mobile">Mobile</option>
                                <option value="Tablet">Tablet</option>
                            </select>
                            <select value={spamFilter} onChange={e => setSpamFilter(e.target.value as 'all' | 'spam' | 'clean')} className={histStyles.filterSelect}>
                                <option value="all">All</option>
                                <option value="spam">Spam only</option>
                                <option value="clean">Clean only</option>
                            </select>
                        </div>
                        <div className={histStyles.dateRow}>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={histStyles.dateInput} />
                            <span className={histStyles.dateSep}>to</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={histStyles.dateInput} />
                        </div>
                    </div>

                    <div className={histStyles.tabBar}>
                        {(['all', 'active', 'closed'] as const).map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`${histStyles.tab} ${activeTab === t ? histStyles.tabActive : ''}`}>
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                <span className={histStyles.tabCount}>({getTabCount(t)})</span>
                            </button>
                        ))}
                    </div>

                    <div className={histStyles.sessionList}>
                        {loading ? (
                            <div className={histStyles.emptyState}>
                                <Loader2 size={24} className={histStyles.spin} />
                                Loading sessions...
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className={histStyles.emptyState}>
                                <History size={32} />
                                <p>No matches found</p>
                                {hasActiveFilters && (
                                    <button className={histStyles.clearBtn} onClick={clearFilters}>
                                        <X size={12} /> Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={histStyles.sessionCards}>
                                {filteredItems.map(conv => {
                                    const displayName = getDisplayName(conv);
                                    const isSelected = selectedSession?.session_id === conv.session_id;
                                    const isEnded = conv.session_status?.toLowerCase() === 'ended' || conv.session_status?.toLowerCase() === 'closed';
                                    const isActive = !isEnded;

                                    // Check if display name already contains the ID to avoid "double" header
                                    const showUuid = !displayName.includes(conv.session_uuid?.slice(-6).toUpperCase());

                                    return (
                                        <div
                                            key={conv.session_id}
                                            onClick={() => handleViewSession(conv)}
                                            className={`${histStyles.sessionCard} ${isSelected ? histStyles.sessionCardSelected : ''} ${isActive ? histStyles.sessionCardActive : ''}`}
                                        >
                                            <div className={histStyles.cardTop}>
                                                <div className={histStyles.cardIdentity}>
                                                    <div className={histStyles.avatar} style={{ background: getAvatarGradient(conv.session_uuid) }}>
                                                        {getInitials(displayName)}
                                                    </div>
                                                    <div>
                                                        <div className={histStyles.cardName}>{displayName}</div>
                                                        <div className={histStyles.cardSub}>{showUuid ? `#${conv.session_uuid?.slice(-6).toUpperCase()} · ` : ''}{conv.country || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                                <span className={`${histStyles.statusBadge} ${getStatusBadgeClasses(conv.session_status)}`}>
                                                    {isActive ? 'Active' : 'Closed'}
                                                </span>
                                            </div>

                                            {conv.assigned_agent_name && (
                                                <div className={styles.cardAgent} style={{ marginLeft: '30px', marginBottom: '8px', fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>
                                                    <MessageSquare size={10} /> {conv.assigned_agent_name}
                                                </div>
                                            )}

                                            <div className={histStyles.cardMeta}>
                                                <span><MessageSquare size={10} /> {conv.message_count} {conv.message_count === 1 ? 'msg' : 'msgs'}</span>
                                                <span className={histStyles.metaDot}>·</span>
                                                <span><Clock size={10} /> {formatDuration(conv.duration_seconds)}</span>
                                                <span className={histStyles.metaDot}>·</span>
                                                <span>{conv.browser}</span>
                                            </div>

                                            <div className={histStyles.cardActions}>
                                                {isActive ? (
                                                    <>
                                                        <button className={histStyles.btnPrimary} onClick={e => { e.stopPropagation(); handleResumeChat(conv); }}>
                                                            {conv.assigned_agent_name ? `Chat as ${conv.assigned_agent_name.split(' ')[0]}` : 'Resume Chat'}
                                                        </button>
                                                        <button className={histStyles.btnSecondary} onClick={e => { e.stopPropagation(); handleViewSession(conv); }}>View</button>
                                                    </>
                                                ) : conv.lead_name ? (
                                                    <>
                                                        <span className={histStyles.leadCapturedBadge}><Check size={10} /> Lead captured</span>
                                                        <button className={histStyles.btnSecondary} onClick={e => { e.stopPropagation(); handleViewSession(conv); }}>View transcript</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className={histStyles.btnSecondary} onClick={e => { e.stopPropagation(); handleViewSession(conv); }}>View transcript</button>
                                                        <button className={histStyles.btnDanger}>Spam</button>
                                                    </>
                                                )}
                                            </div>

                                            <div className={histStyles.cardFooter}>{formatToIST(conv.created_at || '')}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {data && data.total > PAGE_SIZE && (
                        <div className={histStyles.paginationBar} style={{ padding: '12px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button className={histStyles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft size={16} /></button>
                            <span style={{ fontSize: '12px' }}>Page {page} of {totalPages}</span>
                            <button className={histStyles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight size={16} /></button>
                        </div>
                    )}
                </div>

                <div className={styles.chatPanel} style={{ flex: 1 }}>
                    {selectedSession ? (
                        <>
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderInfo} style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 700 }}>{selectedSession.session_uuid.slice(-8).toUpperCase()}</h3>
                                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Globe size={14} /> {selectedSession.country}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {selectedSession.device_type === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                                                {selectedSession.browser}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Zap size={14} color="#f59e0b" /> Score: {selectedSession.lead_score}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.chatMessages} style={{ padding: '24px' }}>
                                {error ? (
                                    <div className={histStyles.panelLoader} style={{ color: '#ef4444' }}>
                                        <AlertCircle size={32} />
                                        <p>{error}</p>
                                        <button onClick={() => selectedSession && handleViewSession(selectedSession)} style={{ marginTop: '12px', fontSize: '12px', textDecoration: 'underline', cursor: 'pointer' }}>Try again</button>
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
                                        <div key={msg.id} className={`${styles.message} ${msg.message_type === 'agent' ? styles.messageAgent : msg.message_type === 'system' ? styles.messageSystem : msg.message_type === 'bot' ? styles.messageBot : styles.messageUser}`}>
                                            <div className={styles.msgLabel}>
                                                {msg.message_type === 'agent'
                                                    ? (msg.sender_name || msg.sender_email || 'Agent')
                                                    : msg.message_type === 'bot'
                                                        ? 'Bot Assistant'
                                                        : 'Visitor'}
                                            </div>
                                            <div className={styles.msgText}>{msg.message_text}</div>
                                            <div className={styles.msgTime}>{msg.created_at_ist}</div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {(() => {
                                const isEnded = selectedSession.session_status?.toLowerCase() === 'ended' || selectedSession.session_status?.toLowerCase() === 'closed';
                                if (!isEnded) {
                                    if (sessionLiveMode) {
                                        return (
                                            <div className={histStyles.bottomBarActive}>
                                                <div className={histStyles.bottomIcon}><ArrowUp size={13} color="#16a34a" /></div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className={histStyles.agentPill}>
                                                        <User size={12} />
                                                        {auth.getUser()?.full_name || auth.getUser()?.email || 'Agent'}
                                                    </div>
                                                    <div className={histStyles.bottomSub}>Active in chat</div>
                                                </div>
                                                <div className={histStyles.inputWrapper} style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '12px', minWidth: '200px' }} />
                                                    <button onClick={sendMessage} disabled={!newMessage.trim()} style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}><Send size={12} /> Send</button>
                                                </div>
                                                {sendError && (
                                                    <div style={{ position: 'absolute', top: '-25px', right: '10px', color: '#ef4444', fontSize: '11px', background: 'white', padding: '2px 8px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #fee2e2' }}>
                                                        {sendError}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    } else {
                                        return (
                                            <div className={histStyles.bottomBarActive}>
                                                <div className={histStyles.bottomIcon}><ArrowUp size={13} color="#16a34a" /></div>
                                                <div>
                                                    <div className={histStyles.bottomTitle}>This session is still active</div>
                                                    <div className={histStyles.bottomSub}>Visitor is online · click Resume Chat to connect as agent</div>
                                                </div>
                                                <button className={histStyles.resumeButton} onClick={() => handleResumeChat(selectedSession)}><ArrowUp size={11} /> Resume Chat</button>
                                            </div>
                                        );
                                    }
                                } else {
                                    return (
                                        <div className={histStyles.bottomBarClosed}>
                                            <div className={histStyles.bottomIcon}><X size={13} color="#9ca3af" /></div>
                                            <div>
                                                <div className={histStyles.bottomTitle}>This conversation has ended</div>
                                                <div className={histStyles.bottomSub}>
                                                    Ended {formatToIST(selectedSession.ended_at_utc || selectedSession.created_at || '')}
                                                    {selectedSession.closed_by_agent_name && ` by ${selectedSession.closed_by_agent_name}`}
                                                </div>
                                            </div>
                                            <button className={histStyles.btnSecondary}><Download size={11} /> Export transcript</button>
                                        </div>
                                    );
                                }
                            })()}
                        </>
                    ) : (
                        <div className={styles.chatEmpty}>
                            <Activity size={48} className={styles.emptyIcon} />
                            <h3>Lead Intelligence Dashboard</h3>
                            <p>Select a session to unlock visitor behavioral data and conversation logs.</p>
                        </div>
                    )}
                </div>

                <div className={histStyles.intelligencePanel}>
                    {!selectedSession ? (
                        <div className={histStyles.emptyState}>
                            <Info size={32} />
                            <p>Select a conversation to view lead intelligence</p>
                        </div>
                    ) : (
                        <>
                            <div className={histStyles.intelSection}>
                                <div className={histStyles.sectionHeader}>
                                    <span>Lead intelligence</span>
                                    <button className={histStyles.sectionAction}>History</button>
                                </div>
                                <div className={histStyles.scoreRow}>
                                    <div className={`${histStyles.scoreRing} ${getLeadScoreConfig(selectedSession.lead_score || 0).ring}`}>{selectedSession.lead_score || 0}</div>
                                    <div>
                                        <div className={histStyles.scoreLabel}>{getLeadScoreConfig(selectedSession.lead_score || 0).label}</div>
                                        <div className={histStyles.scoreSub}>Score at session end</div>
                                    </div>
                                </div>
                                <div className={histStyles.scoreBar}>
                                    <div className={histStyles.scoreBarLabel}>Engagement</div>
                                    <div className={histStyles.scoreBarTrack}><div className={histStyles.scoreBarFill} style={{ width: `${((selectedSession.lead_score || 0) / 10) * 100}%` }} /></div>
                                    <span className={histStyles.scoreBarValue}>{selectedSession.lead_score || 0}/10</span>
                                </div>
                                <div className={histStyles.scoreBar}>
                                    <div className={histStyles.scoreBarLabel}>Profile completeness</div>
                                    <div className={histStyles.scoreBarTrack}><div className={histStyles.scoreBarFill} style={{ width: `${(selectedSession.lead_name ? 8 : 3) / 10 * 100}%` }} /></div>
                                    <span className={histStyles.scoreBarValue}>{selectedSession.lead_name ? 8 : 3}/10</span>
                                </div>
                                <div className={histStyles.tagsRow}>
                                    {selectedSession.lead_status && <span className={histStyles.tag}>{selectedSession.lead_status}</span>}
                                    {selectedSession.country && <span className={histStyles.tag}>{selectedSession.country}</span>}
                                    {selectedSession.device_type && <span className={histStyles.tag}>{selectedSession.device_type}</span>}
                                </div>
                            </div>

                            <div className={histStyles.intelSection}>
                                <div className={histStyles.sectionHeader}>
                                    <span>Contact data</span>
                                    <button className={histStyles.sectionAction} onClick={handleEditToggle} disabled={updating}>{isEditing ? 'Cancel' : 'Edit'}</button>
                                </div>
                                {isEditing ? (
                                    <div className={histStyles.editForm}>
                                        <div className={histStyles.editGroup}>
                                            <label>Name</label>
                                            <input value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="Enter name" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Email</label>
                                            <input value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} placeholder="Enter email" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Phone</label>
                                            <input value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} placeholder="Enter phone" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Company</label>
                                            <input value={editData.company} onChange={e => setEditData({ ...editData, company: e.target.value })} placeholder="Enter company" />
                                        </div>
                                        <button className={histStyles.saveBtn} onClick={handleSaveLead} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</button>
                                    </div>
                                ) : (
                                    <>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Name</span>
                                            <span className={selectedSession.lead_name ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.lead_name || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Email</span>
                                            <span className={selectedSession.lead_email ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.lead_email || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Phone</span>
                                            <span className={selectedSession.lead_phone ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.lead_phone || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Company</span>
                                            <span className={selectedSession.lead_company ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.lead_company || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Country</span>
                                            <span className={selectedSession.country ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.country || 'Not provided'}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* SALES ACTIONS */}
                            <div className={histStyles.intelSection}>
                                <div className={histStyles.sectionHeader}>
                                    <span>Sales Actions</span>
                                </div>
                                <div className={histStyles.salesActions}>
                                    <div className={histStyles.actionGrid}>
                                        <button className={`${histStyles.actionBtn} ${histStyles.actionBtnPrimary}`} title="Mark as Priority">
                                            <Star size={20} className={histStyles.actionIcon} />
                                            <span className={histStyles.actionLabel}>Priority</span>
                                        </button>
                                        <button className={histStyles.actionBtn} onClick={() => alert('Marked as Spam')}>
                                            <ShieldAlert size={20} className={histStyles.actionIcon} />
                                            <span className={histStyles.actionLabel}>Spam</span>
                                        </button>
                                        <button className={histStyles.actionBtn} onClick={() => alert('Visitor Blocked')}>
                                            <Ban size={20} className={histStyles.actionIcon} />
                                            <span className={histStyles.actionLabel}>Block</span>
                                        </button>
                                        <button className={histStyles.actionBtn} onClick={() => alert('Opening Preview')}>
                                            <Eye size={20} className={histStyles.actionIcon} />
                                            <span className={histStyles.actionLabel}>Preview</span>
                                        </button>
                                    </div>
                                    <button className={histStyles.fullWidthAction} onClick={() => alert('Ending Chat...')}>
                                        <X size={16} /> End Chat
                                    </button>
                                    <button className={histStyles.secondaryAction} onClick={() => setSelectedSession(null)}>
                                        <Eye size={16} /> Close View
                                    </button>
                                </div>
                            </div>

                            {/* AGENT ATTRIBUTION */}
                            {selectedSession.assigned_agent_name && (
                                <div className={histStyles.intelSection} style={{ background: '#f0f9ff', borderLeft: '3px solid #0ea5e9', borderBottom: 'none' }}>
                                    <div className={histStyles.sectionHeader}>
                                        <span style={{ color: '#0369a1' }}>Current Handling Agent</span>
                                    </div>
                                    <button className={histStyles.agentPill} style={{ width: '100%', justifyContent: 'flex-start', padding: '10px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                                            {getInitials(selectedSession.assigned_agent_name)}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1', textAlign: 'left' }}>
                                            {selectedSession.assigned_agent_name}
                                            <div style={{ fontSize: '10px', fontWeight: 400, opacity: 0.8 }}>Active in session</div>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
