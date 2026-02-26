'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageCircle,
    Send,
    X,
    RefreshCw,
    Clock,
    User,
    Headphones,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import styles from './LiveChat.module.css';
import { WS_BASE } from '@/lib/config';
import api from '@/config/api';
import { auth } from '@/lib/auth';


// ── Types ────────────────────────────────────────────────────────────────

interface Conversation {
    session_id: string;
    session_status: 'ACTIVE' | 'CLOSED';
    current_mode: 'BOT' | 'HUMAN';
    agent_name: string | null;
    is_locked: boolean;
    lead_name: string | null;
    lead_company: string | null;
    lead_email: string | null;
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



// ── Component ────────────────────────────────────────────────────────────

export default function LiveChatPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedSession, setSelectedSession] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<NodeJS.Timeout | null>(null);

    // ── Get auth token ────────────────────────────────────────────────────

    const getToken = useCallback((): string | null => {
        return auth.getAccessToken() || null;
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
    }, [getToken]);

    // ── Poll for conversations ───────────────────────────────────────────

    useEffect(() => {
        fetchConversations();
        pollRef.current = setInterval(fetchConversations, 5000);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchConversations]);

    // ── Fetch message history ────────────────────────────────────────────

    const fetchMessages = useCallback(
        async (sessionId: string) => {
            const token = getToken();
            if (!token) return;

            try {
                const res = await api.get(`/live-chat/messages/${sessionId}?page=1&page_size=100`);
                setMessages(res.data.items || []);
            } catch {
                setError('Failed to load messages');
            }
        },
        [getToken],
    );

    // ── Connect to conversation ──────────────────────────────────────────

    const interveneInConversation = async (sessionId: string) => {
        setConnecting(true);
        try {
            await api.post(`/live-chat/intervene/${sessionId}`, {});
            setSelectedSession(sessionId);
            await fetchMessages(sessionId);
            const token = getToken();
            if (token) connectWebSocket(sessionId, token);
            fetchConversations();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Takeover failed');
        } finally {
            setConnecting(false);
        }
    };


    // ── Open existing connected conversation ─────────────────────────────

    const openConversation = async (sessionId: string) => {
        setSelectedSession(sessionId);

        // Fetch details to get email (now suppressed from list view)
        try {
            const res = await api.get(`/live-chat/detail/${sessionId}`);
            const detail = res.data;
            setConversations(prev => prev.map(c =>
                c.session_id === sessionId ? { ...c, lead_email: detail.lead_email } : c
            ));
        } catch (e) { console.error("Detail fetch failed", e); }

        await fetchMessages(sessionId);
        const token = getToken();
        if (token) connectWebSocket(sessionId, token);
    };

    // ── WebSocket connection ─────────────────────────────────────────────

    const connectWebSocket = (sessionId: string, token: string) => {
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
                const newMsg: ChatMessage = {
                    id: Date.now(),
                    session_id: sessionId,
                    message_type: data.sender === 'user' ? 'user' : data.sender === 'system' ? 'system' : 'agent',
                    message_text: data.message,
                    created_at_utc: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, newMsg]);
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
    };

    // ── Send message ────────────────────────────────────────────────────

    const sendMessage = () => {
        if (!wsRef.current || !newMessage.trim()) return;

        wsRef.current.send(JSON.stringify({ message: newMessage.trim() }));

        // Optimistic local append
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                session_id: selectedSession || '',
                message_type: 'agent',
                message_text: newMessage.trim(),
                created_at_utc: new Date().toISOString(),
            },
        ]);
        setNewMessage('');
    };

    // ── Close conversation ───────────────────────────────────────────────

    const closeConversation = async (sessionId: string) => {
        try {
            await api.post(`/live-chat/close/${sessionId}`, {});
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }

            setSelectedSession(null);
            setMessages([]);
            fetchConversations();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Close failed');
        }
    };

    // ── Auto-scroll ──────────────────────────────────────────────────────

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Cleanup ──────────────────────────────────────────────────────────

    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────

    const formatTime = (utc: string | null) => {
        if (!utc) return '—';
        return new Date(utc).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusBadge = (conv: Conversation) => {
        if (!conv) return null;
        if (conv.session_status === 'CLOSED') {
            return (
                <span className={styles.badgeClosed}>
                    <CheckCircle2 size={12} /> Closed
                </span>
            );
        }

        if (conv.current_mode === 'HUMAN') {
            return (
                <span className={styles.badgeConnected}>
                    <Headphones size={12} /> {conv.agent_name || 'Connected'}
                </span>
            );
        }


        // Default: BOT mode (ACTIVE)
        return (
            <span className={styles.badgeBot}>
                <MessageCircle size={12} /> Bot Replying
            </span>
        );
    };


    // ── Render ───────────────────────────────────────────────────────────

    return (
        <div className={styles.container}>
            {/* ── Conversation List ──────────────────────────────────────── */}
            <div className={styles.listPanel}>
                <div className={styles.listHeader}>
                    <h2 className={styles.listTitle}>
                        <MessageCircle size={20} />
                        Live Conversations
                    </h2>
                    <button
                        className={styles.refreshBtn}
                        onClick={fetchConversations}
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                </div>

                {error && (
                    <div className={styles.errorBanner}>
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className={styles.emptyState}>Loading conversations...</div>
                ) : conversations.length === 0 ? (
                    <div className={styles.emptyState}>
                        <MessageCircle size={32} className={styles.emptyIcon} />
                        <p>No active conversations</p>
                        <span>Conversations will appear here when customers submit a demo request.</span>
                    </div>
                ) : (
                    <div className={styles.conversationList}>
                        {conversations.map((conv) => (
                            <div
                                key={conv.session_id}
                                className={`${styles.conversationCard} ${selectedSession === conv.session_id ? styles.cardActive : ''
                                    }`}
                            >
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardInfo}>
                                        <div className={styles.cardName}>
                                            <User size={14} />
                                            {conv.lead_name || 'Anonymous User'}
                                        </div>
                                        {conv.lead_company && (
                                            <div className={styles.cardCompany}>
                                                {conv.lead_company}
                                            </div>
                                        )}
                                        {conv.lead_email && (
                                            <div className={styles.cardEmail}>{conv.lead_email}</div>
                                        )}
                                    </div>
                                    {getStatusBadge(conv)}
                                </div>


                                {conv.repeat_visitor && (
                                    <div className={styles.historyIndicator} title={`${conv.previous_session_count} past sessions`}>
                                        <Clock size={12} /> Repeat Visitor ({conv.previous_session_count})
                                    </div>
                                )}



                                <div className={styles.cardMeta}>
                                    <span>{conv.message_count} messages</span>
                                    <span>Last: {formatTime(conv.last_message_at)}</span>
                                </div>

                                <div className={styles.visitorMeta}>
                                    {conv.initial_ip && <span className={styles.metaBadge} title="IP Address">{conv.initial_ip}</span>}
                                    {(conv.city || conv.country) && (
                                        <span className={styles.metaBadge} title="Location">
                                            {conv.city}{conv.city && conv.country ? ', ' : ''}{conv.country}
                                        </span>
                                    )}
                                    {conv.device_type && <span className={styles.metaBadge} title="Device">{conv.device_type}</span>}
                                </div>


                                <div className={styles.cardActions}>
                                    {conv.session_status === 'ACTIVE' && conv.current_mode === 'BOT' && (
                                        <button
                                            className={styles.interveneBtn}
                                            onClick={() => interveneInConversation(conv.session_id)}
                                            disabled={connecting}
                                        >
                                            {connecting ? 'Connecting...' : 'Intervene'}
                                        </button>
                                    )}
                                    {conv.session_status === 'ACTIVE' && conv.current_mode === 'HUMAN' && (

                                        <>
                                            <button
                                                className={styles.openBtn}
                                                onClick={() => openConversation(conv.session_id)}
                                            >
                                                Open Chat
                                            </button>
                                            <button
                                                className={styles.closeBtn}
                                                onClick={() => closeConversation(conv.session_id)}
                                            >
                                                Close
                                            </button>
                                        </>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Chat Panel ────────────────────────────────────────────── */}
            <div className={styles.chatPanel}>
                {selectedSession ? (
                    <>
                        <div className={styles.chatHeader}>
                            <div className={styles.chatHeaderInfo}>
                                <Headphones size={18} />
                                <span>
                                    Live Chat — {selectedSession.slice(0, 8)}...
                                </span>
                            </div>
                            <button
                                className={styles.chatCloseBtn}
                                onClick={() => {
                                    if (wsRef.current) wsRef.current.close();
                                    setSelectedSession(null);
                                    setMessages([]);
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className={styles.chatMessages}>
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.message} ${msg.message_type === 'agent'
                                        ? styles.messageAgent
                                        : msg.message_type === 'system'
                                            ? styles.messageSystem
                                            : msg.message_type === 'bot'
                                                ? styles.messageBot
                                                : styles.messageUser
                                        }`}
                                >
                                    {msg.message_type === 'system' ? (
                                        <div className={styles.systemMsg}>
                                            <AlertCircle size={12} />
                                            {msg.message_text}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={styles.msgLabel}>
                                                {msg.message_type === 'agent'
                                                    ? 'You (Agent)'
                                                    : msg.message_type === 'bot'
                                                        ? 'Bot'
                                                        : 'Customer'}
                                            </div>
                                            <div className={styles.msgText}>{msg.message_text}</div>
                                            <div className={styles.msgTime}>
                                                {formatTime(msg.created_at_utc)}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className={styles.chatInputArea}>
                            <input
                                type="text"
                                className={styles.chatInput}
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="Type a message..."
                            />
                            <button
                                className={styles.sendBtn}
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className={styles.chatEmpty}>
                        <MessageCircle size={48} className={styles.emptyIcon} />
                        <h3>Select a conversation</h3>
                        <p>
                            Choose a conversation from the left panel to start chatting with
                            the customer.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
