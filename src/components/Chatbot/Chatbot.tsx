'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Chatbot.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type Message = { role: 'user' | 'assistant'; text: string };

export default function Chatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (open && !sessionId) {
            startSession();
        }
    }, [open]);

    const startSession = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/chat/start`, {
                method: 'POST',
                headers: { 'accept': 'application/json' },
            });
            const data = await res.json();
            setSessionId(data.sessionId);
            setMessages([{ role: 'assistant', text: data.message }]);
        } catch {
            setMessages([{ role: 'assistant', text: 'Unable to connect. Please ensure the backend service is running.' }]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim() || !sessionId) return;
        setMessages((prev) => [...prev, { role: 'user', text }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/chat/message`, {
                method: 'POST',
                headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, message: text }),
            });
            const data = await res.json();
            setMessages((prev) => [...prev, { role: 'assistant', text: data.message || 'Request received.' }]);
        } catch {
            setMessages((prev) => [...prev, { role: 'assistant', text: 'Connection error. Please try again.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setSessionId(null);
        setMessages([]);
    };

    return (
        <>
            {/* FAB */}
            <div className={styles.fabWrapper}>
                {!open && <div className={styles.tooltip}>Trade Support</div>}
                <button
                    className={`${styles.fab} ${open ? styles.fabOpen : ''}`}
                    onClick={() => open ? handleClose() : setOpen(true)}
                    aria-label="Open Trade Support"
                >
                    {open ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Chat Panel — fixed 380x520, never resizes */}
            {open && (
                <div className={styles.panel}>
                    {/* Header */}
                    <div className={styles.panelHeader}>
                        <div className={styles.headerLeft}>
                            <div className={styles.headerIcon}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div>
                                <div className={styles.headerTitle}>Trade Support</div>
                                <div className={styles.headerStatus}>
                                    <span className={styles.statusDot}></span>
                                    {sessionId ? 'Support Available' : 'Connecting...'}
                                </div>
                            </div>
                        </div>
                        <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages — scrollable only */}
                    <div className={styles.messages}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`${styles.message} ${msg.role === 'user' ? styles.userMessage : styles.assistantMessage}`}>
                                <div className={styles.msgBubble}>{msg.text}</div>
                            </div>
                        ))}
                        {loading && (
                            <div className={`${styles.message} ${styles.assistantMessage}`}>
                                <div className={styles.msgBubble}>
                                    <div className={styles.typing}>
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input — fixed footer */}
                    <div className={styles.inputArea}>
                        <input
                            className={styles.chatInput}
                            type="text"
                            placeholder={sessionId ? 'Type your message...' : 'Connecting...'}
                            value={input}
                            disabled={!sessionId || loading}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                        />
                        <button
                            className={styles.sendBtn}
                            onClick={() => sendMessage(input)}
                            disabled={!input.trim() || !sessionId || loading}
                            aria-label="Send"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
