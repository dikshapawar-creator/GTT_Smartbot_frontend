'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    History,
    RefreshCw,
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    Search,
    ChevronLeft,
    ChevronRight,
    CalendarRange,
    MessageSquare,
    X,
    Loader2,
    Building2,
} from 'lucide-react';
import styles from '../live-chat/LiveChat.module.css';
import histStyles from './History.module.css';
import api from '@/config/api';

// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
    session_id: string;
    session_status: 'ACTIVE' | 'CLOSED';
    current_mode: 'BOT' | 'HUMAN';
    agent_name: string | null;
    is_locked: boolean;
    lead_name: string | null;
    lead_company: string | null;
    last_message_at: string | null;
    message_count: number;
    created_at: string | null;
    repeat_visitor: boolean;
    previous_session_count: number;
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
}

// ── Component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

export default function HistoryPage() {
    const [data, setData] = useState<PaginatedHistory | null>(null);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
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

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchHistory = useCallback(async (pageNum = 1) => {
        setLoading(true);

        const params: Record<string, string | number> = {
            page: pageNum,
            page_size: PAGE_SIZE,
        };
        if (statusFilter !== 'ALL') params.status_filter = statusFilter;
        if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
        if (dateTo) params.date_to = new Date(dateTo + 'T23:59:59').toISOString();

        try {
            const res = await api.get('/live-chat/history', { params });
            setData(res.data);
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
    }, [statusFilter, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Pagination change
    useEffect(() => {
        fetchHistory(page);
    }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

    // Lazy load messages when a session is clicked
    const openSession = async (sessionId: string) => {
        if (selectedSession === sessionId) return;
        setSelectedSession(sessionId);
        setMessages([]);
        setMessagesLoading(true);
        try {
            const res = await api.get(`/live-chat/messages/${sessionId}?page=1&page_size=100`);
            setMessages(res.data.items || []);
        } catch {
            setError('Failed to load messages');
        } finally {
            setMessagesLoading(false);
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Client-side search filter (applied on top of server pagination)
    const filteredItems = (data?.items || []).filter(c => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
            c.lead_name?.toLowerCase().includes(s) ||
            c.lead_company?.toLowerCase().includes(s) ||
            c.session_id.toLowerCase().includes(s)
        );
    });

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

    const formatDate = (utc: string | null) => {
        if (!utc) return '—';
        return new Date(utc).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const clearFilters = () => {
        setStatusFilter('ALL');
        setDateFrom('');
        setDateTo('');
        setSearchTerm('');
    };

    const hasActiveFilters = statusFilter !== 'ALL' || dateFrom || dateTo || searchTerm;

    return (
        <div className={styles.container}>
            {/* ── Archive List Panel ─────────────────────────────────── */}
            <div className={styles.listPanel}>
                {/* Header */}
                <div className={styles.listHeader}>
                    <h2 className={styles.listTitle}>
                        <History size={20} />
                        Conversation Archive
                        {data && (
                            <span className={histStyles.totalBadge}>{data.total.toLocaleString()}</span>
                        )}
                    </h2>
                    <button className={styles.refreshBtn} onClick={() => fetchHistory(page)} title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                </div>

                {/* Search */}
                <div className={histStyles.searchRow}>
                    <div className={histStyles.searchWrap}>
                        <Search size={15} className={histStyles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search by name or company..."
                            className={histStyles.searchInput}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className={histStyles.filterBar}>
                    {/* Status Toggle */}
                    <div className={histStyles.statusToggle}>
                        {(['ALL', 'ACTIVE', 'CLOSED'] as const).map(s => (
                            <button
                                key={s}
                                className={`${histStyles.toggleBtn} ${statusFilter === s ? histStyles.toggleActive : ''}`}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === 'ALL' ? 'All' : s === 'ACTIVE' ? '🟢 Active' : '✅ Closed'}
                            </button>
                        ))}
                    </div>

                    {/* Date Range */}
                    <div className={histStyles.dateRow}>
                        <CalendarRange size={14} className={histStyles.calIcon} />
                        <input
                            type="date"
                            className={histStyles.dateInput}
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            title="From date"
                        />
                        <span className={histStyles.dateSep}>–</span>
                        <input
                            type="date"
                            className={histStyles.dateInput}
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            title="To date"
                        />
                    </div>

                    {hasActiveFilters && (
                        <button className={histStyles.clearBtn} onClick={clearFilters} title="Clear filters">
                            <X size={13} /> Clear
                        </button>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className={styles.errorBanner}>
                        <AlertCircle size={14} /> {error}
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className={styles.emptyState}>
                        <Loader2 size={24} className={histStyles.spin} />
                        Loading archive...
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className={styles.emptyState}>
                        <History size={32} className={styles.emptyIcon} />
                        <p>No sessions found</p>
                        <span>Adjust your filters or date range.</span>
                    </div>
                ) : (
                    <div className={styles.conversationList}>
                        {filteredItems.map(conv => (
                            <div
                                key={conv.session_id}
                                onClick={() => openSession(conv.session_id)}
                                className={`${styles.conversationCard} ${histStyles.archiveCard} ${selectedSession === conv.session_id ? styles.cardActive : ''}`}
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
                                    {conv.session_status === 'CLOSED' ? (
                                        <span className={styles.badgeClosed}>
                                            <CheckCircle2 size={11} /> Closed
                                        </span>
                                    ) : (
                                        <span className={styles.badgeConnected}>
                                            <RefreshCw size={11} /> Active
                                        </span>
                                    )}
                                </div>
                                <div className={styles.cardMeta}>
                                    <span><MessageSquare size={11} /> {conv.message_count} msgs</span>
                                    <span><Clock size={11} /> {formatDate(conv.last_message_at)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {data && data.total > PAGE_SIZE && (
                    <div className={histStyles.paginationBar}>
                        <button
                            className={histStyles.pageBtn}
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className={histStyles.pageInfo}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className={histStyles.pageBtn}
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Message Viewer Panel ───────────────────────────────── */}
            <div className={styles.chatPanel}>
                {selectedSession ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.chatHeaderInfo}>
                                <History size={17} />
                                <span>Session Log — {selectedSession.slice(0, 8).toUpperCase()}</span>
                            </div>
                            <button
                                className={styles.chatCloseBtn}
                                onClick={() => { setSelectedSession(null); setMessages([]); }}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className={styles.chatMessages}>
                            {messagesLoading ? (
                                <div className={histStyles.panelLoader}>
                                    <Loader2 size={28} className={histStyles.spin} />
                                    <p>Loading messages…</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className={histStyles.panelLoader}>
                                    <MessageSquare size={28} />
                                    <p>No messages in this session.</p>
                                </div>
                            ) : messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={`${styles.message} ${msg.message_type === 'agent' ? styles.messageAgent
                                        : msg.message_type === 'system' ? styles.messageSystem
                                            : msg.message_type === 'bot' ? styles.messageBot
                                                : styles.messageUser
                                        }`}
                                >
                                    {msg.message_type === 'system' ? (
                                        <div className={styles.systemMsg}>
                                            <AlertCircle size={11} /> {msg.message_text}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.msgLabel}>
                                                {msg.message_type === 'agent' ? 'Agent'
                                                    : msg.message_type === 'bot' ? 'Bot'
                                                        : 'Customer'}
                                            </div>
                                            <div className={styles.msgText}>{msg.message_text}</div>
                                            <div className={styles.msgTime}>
                                                {new Date(msg.created_at_utc).toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit',
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                    </>
                ) : (
                    <div className={styles.chatEmpty}>
                        <History size={48} className={styles.emptyIcon} />
                        <h3>Select a record</h3>
                        <p>Click any session on the left to inspect the full conversation log.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
