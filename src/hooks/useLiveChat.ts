'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { auth } from '@/lib/auth'
import api from '@/config/api'

export type ChatViewState = 'pretakeover' | 'active' | 'ended'
export type FilterType = 'ALL' | 'ACTIVE' | 'BOT' | 'WAITING' | 'PRIORITY' | 'SPAM'

// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
    session_id: number;
    session_uuid: string;
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
}

interface ChatMessage {
    id: number;
    session_id: string;
    message_type: 'user' | 'bot' | 'agent' | 'system' | 'form';
    message_text: string;
    sender_user_id?: number | null;
    sender_name?: string | null;
    sender_email?: string | null;
    created_at_utc: string;
    created_at_ist?: string;
}

interface Analytics {
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
}

export function useLiveChat() {
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
    const [filter, setFilter] = useState<FilterType>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [chatViewState, setChatViewState] = useState<ChatViewState>('pretakeover');
    const [isConnected, setIsConnected] = useState(false);
    const [typingSessions, setTypingSessions] = useState<Record<string, boolean>>({});

    const wsRef = useRef<WebSocket | null>(null);
    const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

    const selectedSession = conversations.find(c => c.session_uuid === selectedSessionId) || null;

    // ── WebSocket Connection using existing infrastructure ──────────────────

    // ── Handle WebSocket Messages ───────────────────────────────────────────

    const handleWebSocketMessage = useCallback((data: WsMessage) => {
        switch (data.type) {
            case 'NEW_MESSAGE':
                // New message received
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
                    setMessages(prev => [...prev, newMsg]);
                }
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
                                ? { ...conv, ...data as unknown as RawConversation }
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

            case 'pong':
                // Keepalive response
                break;

            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }, [selectedSessionId]);

    // ── WebSocket Connection using existing infrastructure ──────────────────

    const connectWebSocket = useCallback((sessionId: string) => {
        const token = auth.getAccessToken();
        if (!token) return;

        // Use your existing WebSocket endpoint
        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL?.replace('http', 'ws')}/live-chat/ws/chat/${sessionId}?role=agent&token=${token}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            setError(null);

            // Keepalive ping every 30s
            pingRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
        };

        ws.onclose = () => {
            setIsConnected(false);
            if (pingRef.current) {
                clearInterval(pingRef.current);
                pingRef.current = null;
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            setError('WebSocket connection failed');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err);
            }
        };

        return ws;
    }, [handleWebSocketMessage]);

    // ── REST API Functions ──────────────────────────────────────────────────

    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/live-chat/conversations');
            setConversations(res.data || []);
            setError(null);
        } catch (err: unknown) {
            console.error('Failed to fetch conversations:', err);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const res = await api.get('/live-chat/analytics');
            setAnalytics(res.data);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        }
    }, []);

    const fetchMessages = useCallback(async (sessionId: string) => {
        try {
            const res = await api.get(`/live-chat/messages/${sessionId}?page=1&page_size=100`);
            setMessages(res.data.items || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch messages:', err);
            setError('Failed to load messages');
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

        // Connect WebSocket for this session
        connectWebSocket(sessionId);
    }, [conversations, fetchMessages, connectWebSocket]);

    const intervene = useCallback(async (sessionId: string) => {
        try {
            await api.post(`/live-chat/intervene/${sessionId}`);
            setChatViewState('active');
            fetchConversations(); // Refresh the queue
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Intervene failed';
            setError(errorMsg);
        }
    }, [fetchConversations]);

    const sendMessage = useCallback(() => {
        if (!newMessage.trim() || !selectedSessionId || chatViewState !== 'active') return;

        // Send via WebSocket if connected
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                message: newMessage.trim()
            }));
        } else {
            // Fallback to REST API
            api.post(`/live-chat/message/${selectedSessionId}`, {
                message: newMessage.trim()
            }).catch(err => {
                console.error("REST message send failed:", err);
                setError("Failed to send message");
            });
        }

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
            created_at_ist: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
    }, [newMessage, selectedSessionId, chatViewState]);

    const sendTypingStatus = useCallback((isTyping: boolean) => {
        if (selectedSessionId && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                is_typing: isTyping
            }));
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

            // Close WebSocket
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
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

    useEffect(() => {
        fetchConversations();
        fetchAnalytics();

        // Poll for updates every 10 seconds
        const pollInterval = setInterval(() => {
            fetchConversations();
            fetchAnalytics();
        }, 10000);

        // Copy ref to variable for safe cleanup
        const currentTypingTimeouts = typingTimeoutRef.current;

        return () => {
            clearInterval(pollInterval);
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (pingRef.current) {
                clearInterval(pingRef.current);
            }
            Object.values(currentTypingTimeouts).forEach(clearTimeout);
        };
    }, [fetchConversations, fetchAnalytics]);

    // ── Filtered Conversations ──────────────────────────────────────────────

    const filteredConversations = conversations.filter(conv => {
        // Apply status filter
        if (filter === 'ACTIVE' && conv.session_status !== 'ACTIVE') return false;
        if (filter === 'BOT' && conv.current_mode !== 'BOT') return false;
        if (filter === 'WAITING' && !(conv.session_status === 'ACTIVE' && conv.current_mode === 'BOT')) return false;
        if (filter === 'PRIORITY' && conv.lead_status !== 'PRIORITY') return false;
        if (filter === 'SPAM' && !conv.spam_flag) return false;

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
        selectedSession,
        messages,
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
        fetchConversations
    };
}