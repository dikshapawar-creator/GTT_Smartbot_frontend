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
import { useTenant } from '@/context/TenantContext';
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
    trade_type?: string | null;
    country_interested?: string | null;
    product?: string | null;
    requirement_type?: string | null;
    website?: string | null;
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
    message_type: 'user' | 'bot' | 'agent' | 'system' | 'form';
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
    const { selectedTenantId } = useTenant();
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
    const [activeTab, setActiveTab] = useState<'all' | 'active' | 'closed' | 'missed'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeRange, setActiveRange] = useState<'all' | 'today' | 'yesterday' | '7d' | '30d' | 'custom'>('all');

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
        company: '',
        trade_type: '',
        country_interested: '',
        product: '',
        requirement_type: '',
        website: ''
    });
    const [updating, setUpdating] = useState(false);

    // 🕒 Time Range Presets
    const setQuickRange = (range: 'today' | 'yesterday' | '7d' | '30d' | 'all') => {
        const now = new Date();
        const start = new Date();
        const end = new Date();

        if (range === 'all') {
            setDateFrom('');
            setDateTo('');
            setActiveRange('all');
            return;
        }

        if (range === 'today') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (range === 'yesterday') {
            start.setDate(now.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(now.getDate() - 1);
            end.setHours(23, 59, 59, 999);
        } else if (range === '7d') {
            start.setDate(now.getDate() - 7);
        } else if (range === '30d') {
            start.setDate(now.getDate() - 30);
        }

        // Use local ISO format for datetime-local inputs
        const toLocalISO = (d: Date) => {
            const z = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - z).toISOString().slice(0, 16);
        };

        setDateFrom(toLocalISO(start));
        setDateTo(toLocalISO(end));
        setActiveRange(range);
    };

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
        if (activeTab === 'missed') params.status_filter = 'missed';
        if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
        if (dateTo) params.date_to = new Date(dateTo).toISOString();
        if (countryFilter) params.country = countryFilter;

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
    }, [activeTab, dateFrom, dateTo, countryFilter]);

    useEffect(() => {
        setPage(1);
        setSelectedSession(null);
        setMessages([]);
        fetchHistory(1);
        fetchAnalytics();
    }, [activeTab, dateFrom, dateTo, countryFilter, fetchHistory]);

    useEffect(() => {
        fetchHistory(page);
    }, [page, fetchHistory]);

    const connectWebSocket = useCallback((sessionId: string, token: string) => {
        const url = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=agent&token=${token}${selectedTenantId ? `&tenant_id=${selectedTenantId}` : ''}`;
        wsManager.connect(url, 'chat');
    }, [selectedTenantId]);

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

            const updatedSession = {
                ...selectedSession,
                lead_name: editData.name,
                lead_email: editData.email,
                lead_phone: editData.phone,
                lead_company: editData.company,
                trade_type: editData.trade_type,
                country_interested: editData.country_interested,
                product: editData.product,
                requirement_type: editData.requirement_type,
                website: editData.website
            };

            setSelectedSession(updatedSession);

            // Also update the main list manually for immediate UI response
            setData(d => d ? {
                ...d,
                items: d.items.map(item =>
                    item.session_uuid === updatedSession.session_uuid ? updatedSession : item
                )
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
                company: selectedSession.lead_company || '',
                trade_type: selectedSession.trade_type || '',
                country_interested: selectedSession.country_interested || '',
                product: selectedSession.product || '',
                requirement_type: selectedSession.requirement_type || '',
                website: selectedSession.website || ''
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
                const hasInteraction = Number(c.message_count || 0) > 0 || !!c.lead_name || !!c.lead_email;
                const isBotMode = !c.agent_joined_at;

                // Global noise filter: exclude bot-only greeting sessions in all history tabs
                if (isBotMode && !hasInteraction) return false;

                const isEnded = c.session_status?.toLowerCase() === 'ended' || c.session_status?.toLowerCase() === 'closed';
                if (activeTab === 'active') return !isEnded;
                if (activeTab === 'closed') return isEnded;
                if (activeTab === 'missed') return isBotMode;
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

                const matchesDevice = !deviceFilter || c.device_type === deviceFilter;
                const matchesSpam = spamFilter === 'all' || (spamFilter === 'spam' ? c.spam_flag : !c.spam_flag);

                return matchesSearch && matchesDevice && matchesSpam;
            })
            .filter((s, i, arr) => arr.findIndex(x => x.session_uuid === s.session_uuid) === i)
            .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
    }, [data?.items, activeTab, searchTerm, deviceFilter, spamFilter]);

    const getTabCount = (tab: 'all' | 'active' | 'closed' | 'missed') => {
        if (!data?.items) return 0;

        const filtered = data.items.filter(c => {
            const hasInteraction = Number(c.message_count || 0) > 0 || !!c.lead_name || !!c.lead_email;
            const isBotMode = !c.agent_joined_at;
            // Global noise filter: exclude bot-only greeting sessions in all counts
            if (isBotMode && !hasInteraction) return false;
            return true;
        });

        if (tab === 'all') return filtered.length;
        if (tab === 'missed') return filtered.filter(c => !c.agent_joined_at).length;

        return filtered.filter(c => {
            const isEnded = c.session_status?.toLowerCase() === 'ended' || c.session_status?.toLowerCase() === 'closed';
            if (tab === 'active') return !isEnded;
            if (tab === 'closed') return isEnded;
            return true;
        }).length;
    };

    const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

    const clearFilters = () => {
        setActiveTab('all');
        setDateFrom('');
        setDateTo('');
        setActiveRange('all');
        setSearchTerm('');
        setCountryFilter('');
        setDeviceFilter('');
        setSpamFilter('all');
    };

    const getLocalNowISO = () => {
        const d = new Date();
        const z = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - z).toISOString().slice(0, 16);
    };

    const handleDateChange = (type: 'from' | 'to', val: string) => {
        const now = getLocalNowISO();
        if (val > now) {
            // Prevent future dates by capping at now
            if (type === 'from') setDateFrom(now);
            else setDateTo(now);
        } else {
            if (type === 'from') setDateFrom(val);
            else setDateTo(val);
        }
        setActiveRange('custom');
    };

    const hasActiveFilters = activeTab !== 'all' || !!dateFrom || !!dateTo || !!searchTerm || !!countryFilter || !!deviceFilter || spamFilter !== 'all';

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
                            {hasActiveFilters && (
                                <button
                                    className={histStyles.clearFiltersBtn}
                                    onClick={clearFilters}
                                    title="Reset all filters"
                                >
                                    <X size={14} /> Clear All
                                </button>
                            )}
                        </div>
                        <div className={histStyles.filtersGrid}>
                            <select
                                value={countryFilter}
                                onChange={e => setCountryFilter(e.target.value)}
                                className={histStyles.filterSelect}
                            >
                                <option value="">All Countries</option>
                                <option value="Local Develop">Local Develop</option>
                                <option value="Unknown">Unknown</option>
                                <option value="Afghanistan">Afghanistan</option> <option value="Albania">Albania</option> <option value="Algeria">Algeria</option> <option value="Andorra">Andorra</option> <option value="Angola">Angola</option> <option value="Antigua and Barbuda">Antigua and Barbuda</option> <option value="Argentina">Argentina</option> <option value="Armenia">Armenia</option> <option value="Australia">Australia</option> <option value="Austria">Austria</option> <option value="Azerbaijan">Azerbaijan</option> <option value="Bahamas">Bahamas</option> <option value="Bahrain">Bahrain</option> <option value="Bangladesh">Bangladesh</option> <option value="Barbados">Barbados</option> <option value="Belarus">Belarus</option> <option value="Belgium">Belgium</option> <option value="Belize">Belize</option> <option value="Benin">Benin</option> <option value="Bhutan">Bhutan</option> <option value="Bolivia">Bolivia</option> <option value="Bosnia and Herzegovina">Bosnia and Herzegovina</option> <option value="Botswana">Botswana</option> <option value="Brazil">Brazil</option> <option value="Brunei">Brunei</option> <option value="Bulgaria">Bulgaria</option> <option value="Burkina Faso">Burkina Faso</option> <option value="Burundi">Burundi</option> <option value="Cabo Verde">Cabo Verde</option> <option value="Cambodia">Cambodia</option> <option value="Cameroon">Cameroon</option> <option value="Canada">Canada</option> <option value="Central African Republic">Central African Republic</option> <option value="Chad">Chad</option> <option value="Chile">Chile</option> <option value="China">China</option> <option value="Colombia">Colombia</option> <option value="Comoros">Comoros</option> <option value="Congo">Congo</option> <option value="Costa Rica">Costa Rica</option> <option value="Croatia">Croatia</option> <option value="Cuba">Cuba</option> <option value="Cyprus">Cyprus</option> <option value="Czech Republic">Czech Republic</option> <option value="Denmark">Denmark</option> <option value="Djibouti">Djibouti</option> <option value="Dominica">Dominica</option> <option value="Dominican Republic">Dominican Republic</option> <option value="Ecuador">Ecuador</option> <option value="Egypt">Egypt</option> <option value="El Salvador">El Salvador</option> <option value="Equatorial Guinea">Equatorial Guinea</option> <option value="Eritrea">Eritrea</option> <option value="Estonia">Estonia</option> <option value="Eswatini">Eswatini</option> <option value="Ethiopia">Ethiopia</option> <option value="Fiji">Fiji</option> <option value="Finland">Finland</option> <option value="France">France</option> <option value="Gabon">Gabon</option> <option value="Gambia">Gambia</option> <option value="Georgia">Georgia</option> <option value="Germany">Germany</option> <option value="Ghana">Ghana</option> <option value="Greece">Greece</option> <option value="Grenada">Grenada</option> <option value="Guatemala">Guatemala</option> <option value="Guinea">Guinea</option> <option value="Guinea-Bissau">Guinea-Bissau</option> <option value="Guyana">Guyana</option> <option value="Haiti">Haiti</option> <option value="Honduras">Honduras</option> <option value="Hungary">Hungary</option> <option value="Iceland">Iceland</option> <option value="India">India</option> <option value="Indonesia">Indonesia</option> <option value="Iran">Iran</option> <option value="Iraq">Iraq</option> <option value="Ireland">Ireland</option> <option value="Israel">Israel</option> <option value="Italy">Italy</option> <option value="Jamaica">Jamaica</option> <option value="Japan">Japan</option> <option value="Jordan">Jordan</option> <option value="Kazakhstan">Kazakhstan</option> <option value="Kenya">Kenya</option> <option value="Kiribati">Kiribati</option> <option value="Korea, North">Korea, North</option> <option value="Korea, South">Korea, South</option> <option value="Kosovo">Kosovo</option> <option value="Kuwait">Kuwait</option> <option value="Kyrgyzstan">Kyrgyzstan</option> <option value="Laos">Laos</option> <option value="Latvia">Latvia</option> <option value="Lebanon">Lebanon</option> <option value="Lesotho">Lesotho</option> <option value="Liberia">Liberia</option> <option value="Libya">Libya</option> <option value="Liechtenstein">Liechtenstein</option> <option value="Lithuania">Lithuania</option> <option value="Luxembourg">Luxembourg</option> <option value="Madagascar">Madagascar</option> <option value="Malawi">Malawi</option> <option value="Malaysia">Malaysia</option> <option value="Maldives">Maldives</option> <option value="Mali">Mali</option> <option value="Malta">Malta</option> <option value="Marshall Islands">Marshall Islands</option> <option value="Mauritania">Mauritania</option> <option value="Mauritius">Mauritius</option> <option value="Mexico">Mexico</option> <option value="Micronesia">Micronesia</option> <option value="Moldova">Moldova</option> <option value="Monaco">Monaco</option> <option value="Mongolia">Mongolia</option> <option value="Montenegro">Montenegro</option> <option value="Morocco">Morocco</option> <option value="Mozambique">Mozambique</option> <option value="Myanmar">Myanmar</option> <option value="Namibia">Namibia</option> <option value="Nauru">Nauru</option> <option value="Nepal">Nepal</option> <option value="Netherlands">Netherlands</option> <option value="New Zealand">New Zealand</option> <option value="Nicaragua">Nicaragua</option> <option value="Niger">Niger</option> <option value="Nigeria">Nigeria</option> <option value="North Macedonia">North Macedonia</option> <option value="Norway">Norway</option> <option value="Oman">Oman</option> <option value="Pakistan">Pakistan</option> <option value="Palau">Palau</option> <option value="Palestine">Palestine</option> <option value="Panama">Panama</option> <option value="Papua New Guinea">Papua New Guinea</option> <option value="Paraguay">Paraguay</option> <option value="Peru">Peru</option> <option value="Philippines">Philippines</option> <option value="Poland">Poland</option> <option value="Portugal">Portugal</option> <option value="Qatar">Qatar</option> <option value="Romania">Romania</option> <option value="Russia">Russia</option> <option value="Rwanda">Rwanda</option> <option value="Saint Kitts and Nevis">Saint Kitts and Nevis</option> <option value="Saint Lucia">Saint Lucia</option> <option value="Saint Vincent">Saint Vincent</option> <option value="Samoa">Samoa</option> <option value="San Marino">San Marino</option> <option value="Sao Tome and Principe">Sao Tome and Principe</option> <option value="Saudi Arabia">Saudi Arabia</option> <option value="Senegal">Senegal</option> <option value="Serbia">Serbia</option> <option value="Seychelles">Seychelles</option> <option value="Sierra Leone">Sierra Leone</option> <option value="Singapore">Singapore</option> <option value="Slovakia">Slovakia</option> <option value="Slovenia">Slovenia</option> <option value="Solomon Islands">Solomon Islands</option> <option value="Somalia">Somalia</option> <option value="South Africa">South Africa</option> <option value="South Sudan">South Sudan</option> <option value="Spain">Spain</option> <option value="Sri Lanka">Sri Lanka</option> <option value="Sudan">Sudan</option> <option value="Suriname">Suriname</option> <option value="Sweden">Sweden</option> <option value="Switzerland">Switzerland</option> <option value="Syria">Syria</option> <option value="Taiwan">Taiwan</option> <option value="Tajikistan">Tajikistan</option> <option value="Tanzania">Tanzania</option> <option value="Thailand">Thailand</option> <option value="Timor-Leste">Timor-Leste</option> <option value="Togo">Togo</option> <option value="Tonga">Tonga</option> <option value="Trinidad and Tobago">Trinidad and Tobago</option> <option value="Tunisia">Tunisia</option> <option value="Turkey">Turkey</option> <option value="Turkmenistan">Turkmenistan</option> <option value="Tuvalu">Tuvalu</option> <option value="Uganda">Uganda</option> <option value="Ukraine">Ukraine</option> <option value="United Arab Emirates">United Arab Emirates</option> <option value="United Kingdom">United Kingdom</option> <option value="United States">United States</option> <option value="Uruguay">Uruguay</option> <option value="Uzbekistan">Uzbekistan</option> <option value="Vanuatu">Vanuatu</option> <option value="Vatican City">Vatican City</option> <option value="Venezuela">Venezuela</option> <option value="Vietnam">Vietnam</option> <option value="Yemen">Yemen</option> <option value="Zambia">Zambia</option> <option value="Zimbabwe">Zimbabwe</option>
                            </select>
                            <select value={deviceFilter} onChange={e => setDeviceFilter(e.target.value)} className={histStyles.filterSelect}>
                                <option value="">All Devices</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Mobile">Mobile</option>
                                <option value="Tablet">Tablet</option>
                            </select>
                            <select value={spamFilter} onChange={e => setSpamFilter(e.target.value as 'all' | 'spam' | 'clean')} className={histStyles.filterSelect}>
                                <option value="all">Spam/All Leads</option>
                                <option value="spam">Spam only</option>
                                <option value="clean">Clean only</option>
                            </select>
                        </div>
                        <div className={histStyles.timeFilterWrap}>
                            <div className={histStyles.quickRanges}>
                                <button className={`${histStyles.quickBtn} ${activeRange === 'all' ? histStyles.quickBtnActive : ''}`} onClick={() => setQuickRange('all')}>All Time</button>
                                <button className={`${histStyles.quickBtn} ${activeRange === 'today' ? histStyles.quickBtnActive : ''}`} onClick={() => setQuickRange('today')}>Today</button>
                                <button className={`${histStyles.quickBtn} ${activeRange === 'yesterday' ? histStyles.quickBtnActive : ''}`} onClick={() => setQuickRange('yesterday')}>Yesterday</button>
                                <button className={`${histStyles.quickBtn} ${activeRange === '7d' ? histStyles.quickBtnActive : ''}`} onClick={() => setQuickRange('7d')}>Last 7 Days</button>
                                <button className={`${histStyles.quickBtn} ${activeRange === '30d' ? histStyles.quickBtnActive : ''}`} onClick={() => setQuickRange('30d')}>Last 30 Days</button>
                            </div>
                            <div className={histStyles.dateRowEnterprise}>
                                <div className={histStyles.dateInputWrap}>
                                    <Clock size={12} className={histStyles.inputIcon} />
                                    <input
                                        type="datetime-local"
                                        value={dateFrom}
                                        max={getLocalNowISO()}
                                        onChange={e => handleDateChange('from', e.target.value)}
                                        className={histStyles.dateInput}
                                        title="From Date/Time"
                                    />
                                </div>
                                <span className={histStyles.dateSep}>to</span>
                                <div className={histStyles.dateInputWrap}>
                                    <Clock size={12} className={histStyles.inputIcon} />
                                    <input
                                        type="datetime-local"
                                        value={dateTo}
                                        max={getLocalNowISO()}
                                        onChange={e => handleDateChange('to', e.target.value)}
                                        className={histStyles.dateInput}
                                        title="To Date/Time"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={histStyles.tabBar}>
                        {(['all', 'active', 'closed', 'missed'] as const).map(t => (
                            <button key={t} onClick={() => setActiveTab(t)} className={`${histStyles.tab} ${activeTab === t ? histStyles.tabActive : ''}`}>
                                {t === 'missed' ? 'Missed Chats' : t.charAt(0).toUpperCase() + t.slice(1)}
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
                                                    {isActive ? (conv.current_mode === 'BOT' ? 'Active (Bot)' : 'Active (Agent)') : 'Closed'}
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
                                            <div className={styles.msgText}>
                                                {msg.message_type === 'form' ? (
                                                    <div className={styles.formSummary}>
                                                        <div className={styles.formSummaryTitle}>Enquiry Submission</div>
                                                        {(() => {
                                                            try {
                                                                const data = JSON.parse(msg.message_text);
                                                                return (
                                                                    <div className={styles.formSummaryGrid}>
                                                                        <div className={styles.formField}><span>Name:</span> {data.full_name || data.name}</div>
                                                                        <div className={styles.formField}><span>Email:</span> {data.business_email || data.email}</div>
                                                                        <div className={styles.formField}><span>Phone:</span> {data.contact_number || data.phone}</div>
                                                                        <div className={styles.formField}><span>Company:</span> {data.company_name || data.company}</div>
                                                                    </div>
                                                                );
                                                            } catch {
                                                                return msg.message_text;
                                                            }
                                                        })()}
                                                    </div>
                                                ) : (
                                                    msg.message_text
                                                )}
                                            </div>
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
                                        <div className={histStyles.editGroup}>
                                            <label>Website</label>
                                            <input value={editData.website} onChange={e => setEditData({ ...editData, website: e.target.value })} placeholder="Enter website" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Trade Type</label>
                                            <input value={editData.trade_type} onChange={e => setEditData({ ...editData, trade_type: e.target.value })} placeholder="IMPORT/EXPORT" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Interested Country</label>
                                            <input value={editData.country_interested} onChange={e => setEditData({ ...editData, country_interested: e.target.value })} placeholder="Enter country" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Product</label>
                                            <input value={editData.product} onChange={e => setEditData({ ...editData, product: e.target.value })} placeholder="Enter product" />
                                        </div>
                                        <div className={histStyles.editGroup}>
                                            <label>Requirement</label>
                                            <input value={editData.requirement_type} onChange={e => setEditData({ ...editData, requirement_type: e.target.value })} placeholder="Enter requirement" />
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
                                            <span className={histStyles.dataLabel}>Website</span>
                                            <span className={selectedSession.website ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.website || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Trade Type</span>
                                            <span className={selectedSession.trade_type ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.trade_type || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Country</span>
                                            <span className={selectedSession.country_interested ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.country_interested || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Product</span>
                                            <span className={selectedSession.product ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.product || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Requirement</span>
                                            <span className={selectedSession.requirement_type ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.requirement_type || 'Not provided'}</span>
                                        </div>
                                        <div className={histStyles.dataRow}>
                                            <span className={histStyles.dataLabel}>Visitor Location</span>
                                            <span className={selectedSession.country ? histStyles.dataValue : histStyles.dataEmpty}>{selectedSession.country || 'Unknown'}</span>
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
        </div >
    );
}
