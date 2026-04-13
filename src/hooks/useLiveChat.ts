'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '@/lib/auth'
import api, { WS_BASE } from '@/config/api'
import { playNotificationSound, showBrowserNotification } from '@/lib/notifications'
import { wsManager, WSMessage } from '@/lib/wsManager'

export type ChatViewState = 'pretakeover' | 'active' | 'ended'
export type FilterType = 'ALL' | 'ACTIVE' | 'BOT' | 'WAITING' | 'PRIORITY' | 'SPAM' | 'MISSED'


// ── Types ────────────────────────────────────────────────────────────────

export interface Conversation {
    session_id: number;
    session_uuid: string;
    session_status: string;  // backend returns lowercase: 'active', 'ended', 'bot', etc.
    current_mode: string;   // backend returns lowercase: 'bot' or 'agent'
    agent_name: string | null;
    is_locked: boolean;
    lead_name: string | null;
    lead_company: string | null;
    lead_email: string | null;
    lead_phone: string | null;
    lead_score: number;
    lead_status: string;
    trade_type?: string | null;
    country_interested?: string | null;
    product?: string | null;
    requirement_type?: string | null;
    website?: string | null;
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
    assigned_agent_id?: number | null;
    assigned_agent_email?: string | null;
    assigned_agent_name?: string | null;
    agent_joined_at?: string | null;
    closed_by_agent_id?: number | null;
    closed_by_agent_email?: string | null;
    closed_by_agent_name?: string | null;
    agent_closed_at?: string | null;
    is_online?: boolean; // Real-time status from backend
    created_at_ist?: string;
    last_message_ist?: string;
    lead_insights?: string;
    user_message_count?: number;
    has_user_message?: boolean;
    is_lead?: boolean;
}

export interface ChatMessage {
    id: number;
    session_id: string;
    message_type: 'user' | 'bot' | 'agent' | 'system' | 'form';
    message_text: string;
    sender_user_id?: number | null;
    sender_name?: string | null;
    sender_email?: string | null;
    created_at_utc: string;
    created_at_ist?: string;
    message_status?: 'sent' | 'delivered' | 'read';
}

export interface Analytics {
    active_visitors: number;
    avg_lead_score: number;
    spam_visitors: number;
    agent_chats: number;
}

interface RawConversation {
    session_id: number;
    session_uuid: string;
    session_status: 'ACTIVE' | 'CLOSED';
    current_mode: 'BOT' | 'HUMAN';
    agent_name?: string | null;
    is_locked?: boolean;
    lead_name?: string | null;
    lead_company?: string | null;
    lead_email?: string | null;
    lead_phone?: string | null;
    lead_score?: number;
    lead_status?: string;
    trade_type?: string | null;
    country_interested?: string | null;
    product?: string | null;
    requirement_type?: string | null;
    website?: string | null;
    spam_flag?: boolean;
    last_message_at?: string | null;
    message_count?: number;
    created_at?: string | null;
    initial_ip?: string | null;
    browser?: string | null;
    os?: string | null;
    is_online?: boolean;
    lead_insights?: string;
}

// Message history item interface
interface MessageHistoryItem {
    id: number;
    message_type: string;
    message_text: string;
    created_at_utc: string;
    created_at_ist: string;
    sender_user_id?: number;
    sender_name?: string;
    sender_email?: string;
    is_read?: boolean;
}
interface WsMessage extends Omit<Partial<RawConversation>, 'session_id'> {
    type: string;
    message?: string;
    message_text?: string;
    message_type?: string;
    sender?: string;
    sender_user_id?: number;
    sender_name?: string;
    sender_email?: string;
    is_typing?: boolean;
    session_id?: string | number;
    created_at_ist?: string;
    msg_id?: string | number;
    purpose?: string;
    state?: string;
    message_history?: MessageHistoryItem[];
    session_uuid?: string;
    status?: 'sent' | 'delivered' | 'read';
}

export function useLiveChat() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<Analytics>({
        active_visitors: 0,
        avg_lead_score: 0,
        spam_visitors: 0,
        agent_chats: 0
    });
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [chatViewState, setChatViewState] = useState<ChatViewState>('pretakeover');
    const [isConnected, setIsConnected] = useState(false);
    const [typingSessions, setTypingSessions] = useState<Record<string, boolean>>({});
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const sentMsgIds = useRef<Set<string>>(new Set());
    const lastTenantIdRef = useRef<string | null>(null);
    const audioInitialized = useRef<boolean>(false);

    const playTestSound = useCallback(async () => {
        try {
            const paths = ['/sound/notification.mp3.mp3', '/sounds/notification.mp3', '/sound/notification.mp3'];
            for (const path of paths) {
                try {
                    const audio = new Audio(path);
                    await audio.play();
                    audioInitialized.current = true;
                    return true;
                } catch {
                    continue;
                }
            }
        } catch (e) {
            console.error('Test sound failed', e);
        }
        return false;
    }, []);

    const selectedSession = conversations.find(c => c.session_uuid === selectedSessionId) || null;

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().catch(e => console.log('Notification req failed:', e));
            }
        }
    }, []);

    // ── Handle WebSocket Messages ───────────────────────────────────────────

    const fetchMessages = useCallback(async (sessionId: string) => {
        setMessagesLoading(true);
        setMessages([]); // Immediately clear old messages to prevent flickering
        try {
            const res = await api.get(`/live-chat/messages/${sessionId}?page=1&page_size=100`);
            setMessages(res.data.items || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            setError('Failed to load messages');
        } finally {
            setMessagesLoading(false);
        }
    }, []);

    const handleWebSocketMessage = useCallback((data: WsMessage) => {
        switch (data.type) {
            case 'NEW_MESSAGE':
                // New message received
                if (data.msg_id && sentMsgIds.current.has(String(data.msg_id))) {
                    // console.log('Ignoring echoed message:', data.msg_id);
                    return;
                }

                if (typeof document !== 'undefined' && data.sender !== 'agent') {
                    const isTabInactive = document.hidden || !document.hasFocus();
                    if (isTabInactive) {
                        playNotificationSound();
                        showBrowserNotification('New Live Chat Message', data.message || 'Incoming message...');
                    }
                }

                if (data.session_id && String(data.session_id) === selectedSessionId) {
                    const newMsg: ChatMessage = {
                        id: Date.now(), // Temporary ID
                        session_id: String(data.session_id),
                        message_type: (data.sender === 'user' ? 'user' : data.sender === 'agent' ? 'agent' : data.message_type || 'bot') as ChatMessage['message_type'],
                        message_text: data.message || data.message_text || '',
                        sender_user_id: data.sender_user_id as number,
                        sender_name: data.sender_name as string,
                        sender_email: data.sender_email as string,
                        created_at_utc: new Date().toISOString(),
                        created_at_ist: data.created_at_ist || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                    };

                    setMessages(prev => {
                        // Extra safety: check if message text + timestamp combo already exists
                        const isDuplicate = prev.some(m =>
                            m.message_text === newMsg.message_text &&
                            Math.abs(new Date(m.created_at_utc).getTime() - new Date(newMsg.created_at_utc).getTime()) < 2000
                        );
                        if (isDuplicate) return prev;
                        return [...prev, newMsg];
                    });
                }

                // Update the conversation preview in the sidebar regardless of selection
                setConversations(prev => prev.map(conv => {
                    if (conv.session_uuid === data.session_id) {
                        return {
                            ...conv,
                            message_count: (conv.message_count || 0) + 1,
                            last_message_at: new Date().toISOString(),
                            last_message_ist: data.created_at_ist || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
                        };
                    }
                    return conv;
                }));
                break;

            case 'NEW_CONVERSATION':
                // A new visitor started a chat - trigger refresh
                setRefreshTrigger(prev => prev + 1);
                break;

            case 'TYPING_STATUS':
                // Typing indicator
                if (data.session_id) {
                    const sid = String(data.session_id);
                    setTypingSessions(prev => ({
                        ...prev,
                        [sid]: data.is_typing || false
                    }));

                    // Clear typing after timeout
                    if (typingTimeoutRef.current[sid]) {
                        clearTimeout(typingTimeoutRef.current[sid]);
                    }
                    if (data.is_typing) {
                        typingTimeoutRef.current[sid] = setTimeout(() => {
                            setTypingSessions(prev => ({ ...prev, [sid]: false }));
                        }, 3000);
                    }
                }
                break;

            case 'SESSION_UPDATED':
                // Session updated (e.g., enquiry submitted)
                if (data.session_uuid) {
                    console.log('SESSION_UPDATED received:', data);
                    setConversations(prev =>
                        prev.map(conv =>
                            conv.session_uuid === data.session_uuid
                                ? {
                                    ...conv,
                                    lead_name: data.lead_name || conv.lead_name,
                                    lead_email: data.lead_email || conv.lead_email,
                                    lead_phone: data.lead_phone || conv.lead_phone,
                                    lead_company: data.lead_company || conv.lead_company,
                                    lead_score: data.lead_score ?? conv.lead_score,
                                    lead_status: data.lead_status || conv.lead_status,
                                    lead_insights: data.lead_insights || conv.lead_insights,
                                    trade_type: data.trade_type !== undefined ? data.trade_type : conv.trade_type,
                                    country_interested: data.country_interested !== undefined ? data.country_interested : conv.country_interested,
                                    product: data.product !== undefined ? data.product : conv.product,
                                    requirement_type: data.requirement_type !== undefined ? data.requirement_type : conv.requirement_type,
                                    website: data.website !== undefined ? data.website : conv.website,
                                    is_lead: true
                                }
                                : conv
                        )
                    );

                    // If this is the currently selected session, update it
                    if (data.session_uuid === selectedSessionId) {
                        // Just update the conversations state, no need to refetch
                        console.log('Session updated for currently selected session');
                    }
                }
                break;

            case 'AGENT_TAKEOVER':
                // Agent takeover with message history
                if (data.session_uuid === selectedSessionId) {
                    if (data.message_history && data.message_history.length > 0) {
                        // Update messages with history from server
                        const historyMessages = data.message_history.map((msg: MessageHistoryItem) => ({
                            id: msg.id,
                            session_id: data.session_uuid as string,
                            message_type: msg.message_type as ChatMessage['message_type'],
                            message_text: msg.message_text,
                            created_at_utc: msg.created_at_utc || new Date().toISOString(),
                            created_at_ist: msg.created_at_ist,
                            sender_name: msg.sender_name,
                            sender_email: msg.sender_email,
                            sender_user_id: msg.sender_user_id,
                            is_read: msg.is_read || false,
                            message_status: (msg.is_read ? 'read' : 'delivered') as ChatMessage['message_status']
                        }));
                        setMessages(historyMessages);
                        console.log('✅ Agent takeover completed, loaded message history:', historyMessages.length, 'messages');
                    } else {
                        console.log('⚠️ Agent takeover received but no message history, fetching manually...');
                        // Use non-async call to avoid syntax error
                        fetchMessages(selectedSessionId).catch(fetchError => {
                            console.error('Failed to fetch messages after WebSocket takeover:', fetchError);
                        });
                    }
                    setChatViewState('active');
                }
                break;

            case 'MESSAGE_STATUS_UPDATE':
                // Update message status (delivered/read)
                if (data.msg_id && data.status) {
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === Number(data.msg_id)
                                ? { ...msg, message_status: data.status }
                                : msg
                        )
                    );
                }
                break;

            case 'pong':
                // Keepalive response
                break;

            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }, [selectedSessionId, fetchMessages]);

    // ── WebSocket Connection using WSManager (UNIFIED SYSTEM) ───────────────

    const connectWebSocket = useCallback((sessionId: string) => {
        const token = auth.getAccessToken();
        if (!token) {
            console.warn('No auth token available for session WebSocket');
            return;
        }

        const user = auth.getUser();
        const selectedTenantId = typeof window !== 'undefined'
            ? localStorage.getItem('selected_tenant_id')
            : null;

        // CRITICAL FIX: Use the session's tenant context, not agent's default tenant
        // For super admin, we need to determine the correct tenant from the session
        const activeTenantId = selectedTenantId || user?.primary_tenant_id || user?.tenant_id;

        // If we have a selected session, try to get its tenant context
        const session = conversations.find(c => c.session_uuid === sessionId);
        if (session && user?.is_super_admin) {
            // For super admin, we should connect to the session's tenant
            // This will be handled by the backend based on session lookup
            console.log(`🔑 Super admin connecting to session ${sessionId}`);
        }

        const wsUrl = `${WS_BASE}/live-chat/ws/chat/${sessionId}?role=agent&token=${token}${activeTenantId ? `&tenant_id=${activeTenantId}` : ''}`;
        console.log(`🔗 Connecting to session WebSocket: ${wsUrl}`);
        console.log(`🏢 Tenant context: activeTenantId=${activeTenantId}, user.tenant_id=${user?.tenant_id}, user.primary_tenant_id=${user?.primary_tenant_id}`);

        // Use WSManager for unified connection handling
        wsManager.connect(wsUrl, `session_${sessionId}`);
        setIsConnected(true);
        setError(null);
    }, [conversations]);

    const connectGlobalWebSocket = useCallback(() => {
        const token = auth.getAccessToken();
        if (!token) {
            console.warn('No auth token available for WebSocket connection');
            return;
        }

        const user = auth.getUser();
        const selectedTenantId = typeof window !== 'undefined'
            ? localStorage.getItem('selected_tenant_id')
            : null;
        const activeTenantId = selectedTenantId || user?.primary_tenant_id || user?.tenant_id;

        let url = `${WS_BASE}/live-chat/ws/crm/updates?token=${token}`;
        if (activeTenantId) {
            url += `&tenant_id=${activeTenantId}`;
        }

        console.log('Connecting to global CRM WebSocket via WSManager:', url);
        wsManager.connect(url, 'crm_updates');
    }, []);

    // ── REST API Functions ──────────────────────────────────────────────────

    const fetchConversations = useCallback(async (force = false) => {
        try {
            if (!force) {
                const cached = localStorage.getItem("gtt_conversations_cache");
                const cacheTime = localStorage.getItem("gtt_conversations_cache_time");
                if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 30000) {
                    setConversations(JSON.parse(cached));
                    setLoading(false);
                    return;
                }
            }

            const res = await api.get('/live-chat/conversations');
            const fetchedConversations = res.data || [];

            // Debug: Log tenant context and session count
            const currentTenantId = typeof window !== 'undefined'
                ? localStorage.getItem('selected_tenant_id')
                : null;
            console.log(`📊 Fetched ${fetchedConversations.length} conversations for tenant ${currentTenantId}`);

            localStorage.setItem("gtt_conversations_cache", JSON.stringify(fetchedConversations));
            localStorage.setItem("gtt_conversations_cache_time", Date.now().toString());

            setConversations(fetchedConversations);
            setError(null);
        } catch (err: unknown) {
            console.error('Failed to fetch conversations:', err);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAnalytics = useCallback(async (force = false) => {
        try {
            if (!force) {
                const cached = localStorage.getItem("gtt_analytics_cache");
                const cacheTime = localStorage.getItem("gtt_analytics_cache_time");
                if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 60000) {
                    setAnalytics(JSON.parse(cached));
                    return;
                }
            }

            const res = await api.get('/live-chat/analytics');
            localStorage.setItem("gtt_analytics_cache", JSON.stringify(res.data));
            localStorage.setItem("gtt_analytics_cache_time", Date.now().toString());
            setAnalytics(res.data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
    }, []);



    // ── Actions ──────────────────────────────────────────────────────────────

    const openChat = useCallback(async (sessionId: string) => {
        if (!sessionId || sessionId === 'undefined') {
            console.error('Invalid session ID provided to openChat:', sessionId);
            return;
        }

        const session = conversations.find(c => c.session_uuid === sessionId);

        setSelectedSessionId(sessionId);

        // Intelligent state: If agent already in, show active. Else pretakeover.
        if (session && session.current_mode === 'HUMAN') {
            setChatViewState('active');
        } else {
            setChatViewState('pretakeover');
        }

        localStorage.setItem('gtt_last_selected_session', sessionId);

        await fetchMessages(sessionId);

        // CRITICAL FIX: For super admin, automatically switch tenant context if needed
        const user = auth.getUser();
        if (user?.is_super_admin && session) {
            // Try to determine session's tenant from the session data or make an API call
            try {
                // First, try to get session details to determine its tenant
                const sessionResponse = await api.get(`/live-chat/session-details/${sessionId}`);
                const sessionTenantId = sessionResponse.data.tenant_id;

                const currentTenantId = typeof window !== 'undefined'
                    ? localStorage.getItem('selected_tenant_id')
                    : null;

                if (sessionTenantId && String(sessionTenantId) !== currentTenantId) {
                    console.log(`🔄 Super admin switching tenant context from ${currentTenantId} to ${sessionTenantId} for session ${sessionId}`);
                    localStorage.setItem('selected_tenant_id', String(sessionTenantId));

                    // Reconnect WebSocket with correct tenant context
                    wsManager.disconnect('crm_updates');
                    setTimeout(() => {
                        connectGlobalWebSocket();
                    }, 100);
                }
            } catch (error) {
                console.warn('Could not determine session tenant, using current context:', error);
            }
        }

        // Connect WebSocket for this session
        connectWebSocket(sessionId);
    }, [conversations, fetchMessages, connectWebSocket, connectGlobalWebSocket]);

    const intervene = useCallback(async (sessionId: string) => {
        try {
            const response = await api.post(`/live-chat/intervene/${sessionId}`);
            setChatViewState('active');

            // If response includes message history, update messages
            if (response.data.message_history && response.data.message_history.length > 0) {
                const historyMessages = response.data.message_history.map((msg: MessageHistoryItem) => ({
                    id: msg.id,
                    session_id: response.data.session_id,
                    message_type: msg.message_type as ChatMessage['message_type'],
                    message_text: msg.message_text,
                    created_at_utc: msg.created_at_utc || new Date().toISOString(),
                    created_at_ist: msg.created_at_ist,
                    sender_name: msg.sender_name,
                    sender_email: msg.sender_email,
                    sender_user_id: msg.sender_user_id,
                    is_read: msg.is_read || false,
                    message_status: (msg.is_read ? 'read' : 'delivered') as ChatMessage['message_status']
                }));
                setMessages(historyMessages);
                console.log('✅ Loaded message history after takeover:', historyMessages.length, 'messages');
            } else {
                // Fallback: fetch messages if not included in response
                console.log('⚠️ No message history in takeover response, fetching manually...');
                fetchMessages(sessionId).catch(fetchError => {
                    console.error('Failed to fetch messages after takeover:', fetchError);
                    // Set empty messages if fetch fails
                    setMessages([]);
                });
            }

            // Update conversation status in the list
            setConversations(prev => prev.map(conv =>
                conv.session_uuid === sessionId
                    ? { ...conv, current_mode: 'HUMAN', session_status: 'ACTIVE' }
                    : conv
            ));

            fetchConversations(); // Refresh the queue
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Intervene failed';
            setError(errorMsg);
        }
    }, [fetchConversations, fetchMessages]);

    const sendMessage = useCallback(() => {
        if (!newMessage.trim() || !selectedSessionId || chatViewState !== 'active') return;

        const clientMsgId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sentMsgIds.current.add(clientMsgId);

        // Send via WSManager unified system
        wsManager.send({
            type: 'message',
            message: newMessage.trim(),
            client_msg_id: clientMsgId
        }, `session_${selectedSessionId}`);

        // Optimistic update
        const user = auth.getUser();
        const optimisticMsg: ChatMessage = {
            id: Date.now(),
            session_id: selectedSessionId,
            message_type: 'agent',
            message_text: newMessage,
            sender_user_id: user?.id,
            sender_name: user?.full_name || user?.email || 'Agent',
            sender_email: user?.email,
            created_at_utc: new Date().toISOString(),
            created_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            message_status: 'sent'
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
    }, [newMessage, selectedSessionId, chatViewState]);

    const sendTypingStatus = useCallback((isTyping: boolean) => {
        if (selectedSessionId) {
            wsManager.send({
                type: 'typing',
                is_typing: isTyping
            }, `session_${selectedSessionId}`);
        }
    }, [selectedSessionId]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        sendTypingStatus(true);

        const sid = selectedSessionId || '';
        if (typingTimeoutRef.current[sid]) clearTimeout(typingTimeoutRef.current[sid]);
        typingTimeoutRef.current[sid] = setTimeout(() => sendTypingStatus(false), 2000);
    }, [selectedSessionId, sendTypingStatus]);

    const closeConversation = useCallback(async (sessionId: string) => {
        try {
            await api.post(`/live-chat/close/${sessionId}`);
            setSelectedSessionId(null);
            setMessages([]);
            setChatViewState('ended');
            fetchConversations();

            // Disconnect session WebSocket via WSManager
            wsManager.disconnect(`session_${sessionId}`);
        } catch (err) {
            console.error("Close failed:", err);
            setError("Failed to close conversation");
        }
    }, [fetchConversations]);

    const togglePriority = useCallback(async (sessionId: string) => {
        try {
            await api.post(`/live-chat/toggle-priority/${sessionId}`);
            fetchConversations();
        } catch (err) {
            console.error("Toggle priority failed:", err);
        }
    }, [fetchConversations]);

    const toggleSpam = useCallback(async (sessionId: string) => {
        try {
            await api.post(`/live-chat/toggle-spam/${sessionId}`);
            fetchConversations();
        } catch (err) {
            console.error("Toggle spam failed:", err);
        }
    }, [fetchConversations]);

    const blockVisitor = useCallback(async (sessionId: string) => {
        if (!confirm("Are you sure you want to block this visitor?")) return;
        try {
            await api.post(`/live-chat/block-visitor/${sessionId}`);
            setSelectedSessionId(null);
            fetchConversations();
        } catch (err) {
            console.error("Block failed:", err);
        }
    }, [fetchConversations]);

    // ── Effects ──────────────────────────────────────────────────────────────

    // Handle refresh trigger from NEW_CONVERSATION events
    useEffect(() => {
        if (refreshTrigger > 0) {
            fetchConversations(true);
            fetchAnalytics(true);
        }
    }, [refreshTrigger, fetchConversations, fetchAnalytics]);

    // Monitor tenant context changes and refresh data
    useEffect(() => {
        const handleTenantChange = () => {
            console.log('🔄 Tenant context changed, refreshing conversations...');
            fetchConversations(true);
            fetchAnalytics(true);

            // Reconnect global WebSocket with new tenant context
            wsManager.disconnect('crm_updates');
            setTimeout(() => {
                connectGlobalWebSocket();
            }, 100);
        };

        // Listen for tenant context changes
        const checkTenantChange = setInterval(() => {
            const currentTenantId = typeof window !== 'undefined'
                ? localStorage.getItem('selected_tenant_id')
                : null;

            if (currentTenantId !== lastTenantIdRef.current) {
                lastTenantIdRef.current = currentTenantId;
                handleTenantChange();
            }
        }, 1000);

        return () => clearInterval(checkTenantChange);
    }, [fetchConversations, fetchAnalytics, connectGlobalWebSocket]);

    useEffect(() => {
        console.log('🚀 Initializing Live Chat Hook');
        fetchConversations();
        fetchAnalytics();

        // Connect to global CRM WebSocket via WSManager
        connectGlobalWebSocket();

        // Subscribe to WSManager events for both CRM updates and session messages
        const unsubscribeCRM = wsManager.subscribe('message', (data: WSMessage) => {
            if (data.purpose === 'crm_updates') {
                console.log('📨 Received CRM update:', data);
                handleWebSocketMessage(data as WsMessage);
            }
        });

        const unsubscribeSession = wsManager.subscribe('message', (data: WSMessage) => {
            if (data.purpose && data.purpose.startsWith('session_')) {
                console.log('📨 Received session message:', data);
                handleWebSocketMessage(data as WsMessage);
            }
        });

        // Keep 60s polling as a fallback (increased to prevent usage limit issues)
        const pollInterval = setInterval(() => {
            const wsStatus = wsManager.getStatus('crm_updates');
            if (wsStatus !== 'OPEN') {
                console.log('📡 WebSocket not connected, using polling fallback');
                // Use the stable functions directly
                fetchConversations();
                fetchAnalytics();
            }
        }, 60000);

        // Copy ref to variable for safe cleanup
        const currentTypingTimeouts = typingTimeoutRef.current;

        return () => {
            unsubscribeCRM();
            unsubscribeSession();
            clearInterval(pollInterval);
            Object.values(currentTypingTimeouts).forEach(clearTimeout);
        };
    }, [connectGlobalWebSocket, handleWebSocketMessage, fetchConversations, fetchAnalytics]);

    // Monitor WSManager connection status
    useEffect(() => {
        const checkConnection = () => {
            const crmStatus = wsManager.getStatus('crm_updates');
            const sessionStatus = selectedSessionId ? wsManager.getStatus(`session_${selectedSessionId}`) : 'IDLE';
            setIsConnected(crmStatus === 'OPEN' || sessionStatus === 'OPEN');
        };

        // Check immediately
        checkConnection();

        // Subscribe to status changes
        const unsubscribe = wsManager.subscribe('statusChange', (data: WSMessage) => {
            if (data.purpose === 'crm_updates' || (data.purpose && data.purpose.startsWith('session_'))) {
                setIsConnected(data.state === 'OPEN');
            }
        });

        // Check periodically
        const interval = setInterval(checkConnection, 5000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [selectedSessionId]);

    // ── Filtered Conversations ──────────────────────────────────────────────

    const filteredConversations = conversations.filter(conv => {
        // Normalize current_mode to lowercase (backend returns 'bot' or 'agent')
        const mode = (conv.current_mode || '').toLowerCase();
        const isBotMode = mode === 'bot';
        const isHumanMode = mode === 'agent' || mode === 'human';
        const hasInteraction = (Number(conv.user_message_count || 0) > 0) || conv.is_lead || !!conv.lead_email;
        // "Waiting" = must be ACTIVE/BOT/WAITING, no agent CURRENTLY assigned, and there's interaction
        // We include both bot and human mode sessions (if human mode but no agent, it's definitely waiting)
        const isWaiting = (conv.session_status === 'active' || conv.session_status === 'bot' || conv.session_status === 'waiting' || conv.session_status === 'agent') &&
            !conv.assigned_agent_id && hasInteraction;

        // Global noise filter: exclude old sessions with no interaction if it's bot mode
        // Note: frontend also checks 'freshness' to match backend grace period (15 mins)
        const createdAt = new Date(conv.created_at || new Date());
        const isFresh = (new Date().getTime() - createdAt.getTime()) < 15 * 60 * 1000; // 15 minutes

        if (isBotMode && !hasInteraction && !isFresh) return false;

        // Apply status filter
        if (filter === 'ACTIVE' && !isHumanMode) return false;
        if (filter === 'BOT' && !isBotMode) return false;
        if (filter === 'WAITING' && !isWaiting) return false;

        // Handle other filters
        const f = filter as string;
        if (f === 'PRIORITY' && conv.lead_status !== 'PRIORITY') return false;
        if (f === 'SPAM' && !conv.spam_flag) return false;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                (conv.lead_name || '').toLowerCase().includes(query) ||
                conv.session_uuid.toLowerCase().includes(query) ||
                (conv.browser || '').toLowerCase().includes(query) ||
                (conv.os || '').toLowerCase().includes(query)
            );
        }

        return true;
    });

    return {
        // State
        conversations: filteredConversations,
        allConversations: conversations,
        selectedSession,
        messages,
        messagesLoading,
        newMessage,
        loading,
        error,
        analytics,
        filter,
        searchQuery,
        chatViewState,
        isConnected,
        typingSessions,

        // Actions
        setFilter,
        setSearchQuery,
        openChat,
        intervene,
        sendMessage,
        handleInputChange,
        closeConversation,
        togglePriority,
        toggleSpam,
        blockVisitor,
        setSelectedSessionId,
        setMessages,
        setChatViewState,
        setConversations,
        fetchConversations,
        playTestSound,
        audioEnabled: typeof window !== 'undefined' ? (Notification.permission === 'granted') : false
    };
}