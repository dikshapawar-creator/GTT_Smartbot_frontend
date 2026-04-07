'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    MessageCircle, Send, X, RefreshCw, Clock, User, Headphones, CheckCircle2,
    ShieldAlert, Star, Ban, Monitor, Zap, Activity, Shield, Settings, Search,
    Paperclip, Smile, AlertCircle, Eye, Building2
} from 'lucide-react';
import styles from './LiveChat.module.css';
import { useLiveChat, Conversation, FilterType } from '@/hooks/useLiveChat';
import { auth } from '@/lib/auth';
import api from '@/config/api';

function LiveChatContent() {
    const {
        conversations, selectedSession, messages, messagesLoading, newMessage, loading, error, analytics,
        filter, searchQuery, chatViewState, typingSessions, allConversations,
        setFilter, setSearchQuery, openChat, intervene, sendMessage, handleInputChange,
        closeConversation, togglePriority, toggleSpam, blockVisitor, setSelectedSessionId, fetchConversations,
        playTestSound, audioEnabled, setConversations
    } = useLiveChat();

    const searchParams = useSearchParams();

    useEffect(() => {
        const filterParam = searchParams.get('filter');
        if (filterParam) {
            setFilter(filterParam as FilterType);
        }
    }, [searchParams, setFilter]);

    const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large' | 'xlarge'>('medium');
    const [liveDurations, setLiveDurations] = useState<Record<string, number>>({});
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [isEditingLead, setIsEditingLead] = useState(false);
    const [editLeadData, setEditLeadData] = useState<Record<string, string>>({});
    const [isSavingLead, setIsSavingLead] = useState(false);

    // Get current tenant context
    const getCurrentTenantInfo = () => {
        const user = auth.getUser();
        const selectedTenantId = typeof window !== 'undefined'
            ? localStorage.getItem('selected_tenant_id')
            : null;
        const activeTenantId = selectedTenantId || user?.primary_tenant_id || user?.tenant_id;

        // Find tenant name from user's tenant access
        const tenantName = user?.tenant_access?.find(t => t.tenant_id === Number(activeTenantId))?.tenant_name || 'Unknown Tenant';

        return { activeTenantId, tenantName };
    };

    const { activeTenantId, tenantName } = getCurrentTenantInfo();

    const selectedSessionId = selectedSession?.session_uuid || null;
    // ── Helper Functions ─────────────────────────────────────────────────────

    const showToast = (message: string) => {
        const toast = document.createElement('div');
        toast.className = styles.toast;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add(styles.toastShow), 10);
        setTimeout(() => {
            toast.classList.remove(styles.toastShow);
            setTimeout(() => document.body.removeChild(toast), 250);
        }, 2500);
    };

    useEffect(() => {
        if (selectedSession && !isEditingLead) {
            setEditLeadData({
                name: selectedSession.lead_name || '',
                email: selectedSession.lead_email || '',
                phone: selectedSession.lead_phone || '',
                company: selectedSession.lead_company || '',
                trade_type: selectedSession.trade_type || '',
                country_interested: selectedSession.country_interested || '',
                product: selectedSession.product || '',
                requirement_type: selectedSession.requirement_type || '',
                website: selectedSession.website || '',
                status: selectedSession.lead_status || ''
            });
        }
    }, [selectedSession, isEditingLead]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, typingSessions]);

    const handleSaveLead = async () => {
        if (!selectedSession?.session_uuid) return;
        setIsSavingLead(true);
        try {
            await api.post(`/live-chat/update-lead/${selectedSession.session_uuid}`, editLeadData);

            // Optimistic Update
            setConversations(prev => prev.map(conv => {
                if (conv.session_uuid === selectedSession.session_uuid) {
                    return {
                        ...conv,
                        ...editLeadData,
                        is_lead: true
                    } as Conversation;
                }
                return conv;
            }));

            setIsEditingLead(false);
            showToast('Lead updated successfully');
        } catch (err) {
            console.error("Failed to update lead", err);
            showToast('Failed to update lead');
        } finally {
            setIsSavingLead(false);
        }
    };

    const increaseFontSize = () => {
        const sizes: Array<'small' | 'medium' | 'large' | 'xlarge'> = ['small', 'medium', 'large', 'xlarge'];
        const currentIndex = sizes.indexOf(fontSize);
        if (currentIndex < sizes.length - 1) {
            setFontSize(sizes[currentIndex + 1]);
            showToast(`Font size increased to ${sizes[currentIndex + 1]}`);
        }
    };

    const decreaseFontSize = () => {
        const sizes: Array<'small' | 'medium' | 'large' | 'xlarge'> = ['small', 'medium', 'large', 'xlarge'];
        const currentIndex = sizes.indexOf(fontSize);
        if (currentIndex > 0) {
            setFontSize(sizes[currentIndex - 1]);
            showToast(`Font size decreased to ${sizes[currentIndex - 1]}`);
        }
    };

    const getFontSizeClass = () => {
        switch (fontSize) {
            case 'small': return styles.fontSizeSmall;
            case 'large': return styles.fontSizeLarge;
            case 'xlarge': return styles.fontSizeXLarge;
            default: return styles.fontSizeMedium;
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return styles.scoreHot;
        if (score >= 50) return styles.scoreWarm;
        return styles.scoreCold;
    };

    const quickReplies = [
        "Let me check that for you",
        "Could you share your company name?",
        "I'll connect you to a specialist",
        "Thanks for your patience!"
    ];

    // ── Effects ──────────────────────────────────────────────────────────────

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = setInterval(() => {
            const syncedNow = Date.now();
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
    }, [conversations]);
    return (
        <div className={styles.dashboardWrapper}>
            {/* Hero Section */}
            <div className={styles.heroSection}>
                <div className={styles.heroLeft}>
                    <div className={styles.heroIcon}>
                        <Activity size={20} />
                    </div>
                    <div>
                        <h1 className={styles.heroTitle}>Live Conversations</h1>
                        <p className={styles.heroSubtitle}>
                            Monitor and manage real-time visitor sessions
                            {auth.getUser()?.is_super_admin && (
                                <span className={styles.tenantIndicator}>
                                    <Building2 size={12} />
                                    {tenantName} (ID: {activeTenantId})
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className={styles.heroStats}>
                    <button
                        className={`${styles.soundToggle} ${audioEnabled ? styles.soundToggleActive : ''}`}
                        onClick={() => playTestSound()}
                        title="Click to enable or test notification sound"
                    >
                        <div className={styles.soundDot} />
                        <span>Sound: {audioEnabled ? 'Active' : 'Click to Test'}</span>
                        <Zap size={10} />
                    </button>
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#34d399' }}>{analytics.active_visitors}</span>
                        <span className={styles.heroStatLabel}>Active Now</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#f9fafb' }}>{analytics.agent_chats}</span>
                        <span className={styles.heroStatLabel}>Agent Chats</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#fbbf24' }}>
                            {allConversations.filter(c => {
                                const mode = (c.current_mode || '').toLowerCase();
                                const isBotMode = mode === 'bot';
                                const hasInteraction = (Number(c.user_message_count || 0) > 0) || c.is_lead || !!c.lead_email;
                                return c.session_status === 'ACTIVE' && isBotMode && !c.assigned_agent_id && !c.agent_joined_at && hasInteraction;
                            }).length}
                        </span>
                        <span className={styles.heroStatLabel}>Waiting</span>
                    </div>
                    <div className={styles.heroStatDivider} />
                    <div className={styles.heroStat}>
                        <span className={styles.heroStatValue} style={{ color: '#374151' }}>{analytics.spam_visitors}</span>
                        <span className={styles.heroStatLabel}>Spam</span>
                    </div>
                </div>
            </div>
            <div className={styles.container}>
                {/* Left Panel: Visitor Queue */}
                <div className={styles.queuePanel}>
                    <div className={styles.queueHeader}>
                        <div className={styles.queueHeaderTop}>
                            <div className={styles.queueTitle}>
                                <div className={styles.liveDot} />
                                <span>Visitor Queue</span>
                                <span className={styles.queueCount}>{conversations.length}</span>
                            </div>
                            <div className={styles.queueActions}>
                                <button className={styles.iconBtn} title="Refresh">
                                    <RefreshCw size={14} />
                                </button>
                                <button className={styles.iconBtn} title="Settings">
                                    <Settings size={14} />
                                </button>
                            </div>
                        </div>

                        <div className={styles.filterTabs}>
                            {['ALL', 'ACTIVE', 'BOT', 'WAITING'].map(tab => (
                                <button
                                    key={tab}
                                    className={`${styles.filterTab} ${filter === tab ? styles.filterTabActive : ''}`}
                                    onClick={() => setFilter(tab as 'ALL' | 'ACTIVE' | 'BOT' | 'WAITING')}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className={styles.queueSearch}>
                            <Search size={14} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search visitors..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        {/* Empty Sessions Warning */}
                        {conversations.filter(c => c.message_count === 0).length > 0 && (
                            <div className={styles.emptySessionsBanner}>
                                <AlertCircle size={12} />
                                <span>{conversations.filter(c => c.message_count === 0).length} empty sessions detected</span>
                                <button
                                    className={styles.cleanupBtn}
                                    onClick={async () => {
                                        try {
                                            const response = await fetch('/api/live-chat/cleanup-empty', { method: 'POST' });
                                            if (response.ok) {
                                                showToast('Empty sessions cleaned up');
                                                fetchConversations();
                                            }
                                        } catch {
                                            showToast('Cleanup failed');
                                        }
                                    }}
                                >
                                    Clean Up
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={styles.queueList}>
                        {error && <div className={styles.errorBanner}>{error}</div>}
                        {loading ? (
                            <div className={styles.emptyState}>Loading conversations...</div>
                        ) : conversations.length === 0 ? (
                            <div className={styles.emptyState}>
                                <MessageCircle size={32} className={styles.emptyIcon} />
                                <p>No conversations found</p>
                                <span>
                                    No active conversations for <strong>{tenantName}</strong>.
                                    {auth.getUser()?.is_super_admin && (
                                        <span> Switch tenants from the main dashboard to view other workspaces.</span>
                                    )}
                                </span>
                            </div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.session_id}
                                    className={`${styles.visitorCard} ${selectedSessionId === conv.session_uuid ? styles.visitorCardSelected : ''}`}
                                    onClick={() => openChat(conv.session_uuid)}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardAvatar}>
                                            {(conv.lead_name || 'A').substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className={styles.cardInfo}>
                                            <div className={styles.cardName}>
                                                {conv.lead_name || `Visitor #${conv.session_uuid.slice(-6).toUpperCase()}`}
                                                {conv.lead_status === 'PRIORITY' && <Star size={12} className={styles.priorityIcon} fill="currentColor" />}
                                                {conv.is_online && <div className={styles.onlineDot} title="Online" />}
                                            </div>
                                        </div>
                                        <div className={`${styles.statusBadge} ${conv.session_status.toLowerCase() === 'active' ? ((conv.current_mode || '').toLowerCase() === 'bot' ? styles.statusBot : styles.statusActive) :
                                            conv.spam_flag ? styles.statusSpam : styles.statusClosed
                                            }`}>
                                            {conv.session_status.toLowerCase() === 'active' ? ((conv.current_mode || '').toLowerCase() === 'bot' ? 'Active (Bot)' : 'Active (Agent)') :
                                                conv.spam_flag ? 'Spam' : 'Closed'}
                                        </div>
                                    </div>

                                    {conv.assigned_agent_name && (
                                        <div className={styles.cardAgent}>
                                            <Headphones size={10} /> {conv.assigned_agent_name}
                                        </div>
                                    )}

                                    <div className={styles.cardMeta}>
                                        <span>{conv.message_count} msgs • {formatDuration(liveDurations[conv.session_uuid] || 0)} • {conv.browser} / {conv.os}</span>
                                    </div>

                                    <div className={styles.cardActions}>
                                        {conv.session_status.toLowerCase() === 'active' && (conv.current_mode || '').toLowerCase() === 'bot' && (
                                            <button
                                                className={styles.takeoverBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    intervene(conv.session_uuid);
                                                }}
                                            >
                                                <Shield size={12} /> Takeover
                                            </button>
                                        )}
                                        <button className={styles.viewBtn}>
                                            {(conv.current_mode || '').toLowerCase() === 'agent' ? (
                                                <><MessageCircle size={12} /> Chat</>
                                            ) : (
                                                <><Eye size={12} /> View</>
                                            )}
                                        </button>
                                    </div>

                                    <div className={styles.cardFooter}>
                                        <span className={styles.sessionId}>{conv.session_uuid} • {conv.created_at_ist}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                {/* Center Panel: Chat Window */}
                <div className={`${styles.chatPanel} ${getFontSizeClass()}`}>
                    {selectedSessionId && selectedSession ? (
                        <>
                            <div className={styles.chatHeader}>
                                <div className={styles.chatHeaderLeft}>
                                    <div className={styles.chatAvatar}>
                                        {(selectedSession.lead_name || 'A').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className={styles.chatHeaderInfo}>
                                        <div className={styles.chatHeaderName}>
                                            {selectedSession.lead_name || 'Anonymous User'}
                                            {selectedSession.is_online ? (
                                                <div className={styles.onlineDot} title="Online" />
                                            ) : (
                                                <div className={styles.offlineDot} title="Offline" />
                                            )}
                                        </div>
                                        <div className={styles.chatHeaderMeta}>
                                            <span><Clock size={11} /> {formatDuration(liveDurations[selectedSessionId] || 0)}</span>
                                            {typingSessions[selectedSessionId] && <span>Typing...</span>}
                                            <span>IST: {selectedSession.created_at_ist}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.chatHeaderActions}>
                                    {/* Font Size Controls */}
                                    <div className={styles.fontSizeControls}>
                                        <span className={styles.fontSizeLabel}>Font</span>
                                        <button
                                            className={styles.fontSizeBtn}
                                            onClick={decreaseFontSize}
                                            disabled={fontSize === 'small'}
                                            title="Decrease font size"
                                        >
                                            -
                                        </button>
                                        <span className={styles.fontSizeDisplay}>{fontSize}</span>
                                        <button
                                            className={styles.fontSizeBtn}
                                            onClick={increaseFontSize}
                                            disabled={fontSize === 'xlarge'}
                                            title="Increase font size"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {chatViewState === 'active' && (
                                        <button className={styles.btnDanger} onClick={() => closeConversation(selectedSessionId)}>
                                            <CheckCircle2 size={14} /> End Chat
                                        </button>
                                    )}
                                    <button className={styles.btnSecondary} onClick={() => setSelectedSessionId(null)}>
                                        <X size={14} /> Close View
                                    </button>
                                </div>
                            </div>

                            <div className={styles.chatMessages}>
                                {messagesLoading ? (
                                    <div className={styles.messagesLoader}>
                                        <RefreshCw className={styles.spinIcon} size={24} />
                                        <p>Loading messages...</p>
                                    </div>
                                ) : messages.filter(msg => msg.message_text && msg.message_text.trim() !== '').length === 0 ? (
                                    <div className={styles.messagesLoader}>
                                        <p className={styles.noMessagesText}>No messages in this conversation</p>
                                    </div>
                                ) : messages.filter(msg => msg.message_text && msg.message_text.trim() !== '').map((msg) => (
                                    <div key={msg.id} className={`${styles.message} ${msg.message_type === 'user' ? styles.msgUser :
                                        msg.message_type === 'agent' ? styles.msgAgent :
                                            msg.message_type === 'form' ? styles.msgForm : styles.msgBot
                                        }`}>
                                        <div className={styles.msgLabel}>
                                            <div className={styles.msgAvatar}>
                                                {msg.message_type === 'user' ? 'U' : msg.message_type === 'agent' ? 'A' : msg.message_type === 'form' ? 'L' : 'B'}
                                            </div>
                                            <span>
                                                {msg.message_type === 'user'
                                                    ? (selectedSession.lead_name || 'Visitor')
                                                    : msg.message_type === 'form'
                                                        ? 'Lead'
                                                        : msg.message_type === 'agent'
                                                            ? (msg.sender_name || 'Agent')
                                                            : msg.message_type.charAt(0).toUpperCase() + msg.message_type.slice(1)
                                                }
                                            </span>
                                            <span className={styles.msgTime}>{msg.created_at_ist}</span>
                                            {/* Message Status Indicators */}
                                            {msg.message_type === 'agent' && msg.message_status && (
                                                <div className={styles.msgStatus}>
                                                    {msg.message_status === 'sent' && (
                                                        <div className={styles.statusSingle} title="Sent">✓</div>
                                                    )}
                                                    {msg.message_status === 'delivered' && (
                                                        <div className={styles.statusDouble} title="Delivered">✓✓</div>
                                                    )}
                                                    {msg.message_status === 'read' && (
                                                        <div className={styles.statusRead} title="Read">✓✓</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.msgBubble}>
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
                                    </div>
                                ))}

                                {typingSessions[selectedSessionId] && (
                                    <div className={styles.typingIndicator}>
                                        <div className={styles.typingBubble}>
                                            <div className={styles.typingDots}>
                                                <div className={styles.typingDot}></div>
                                                <div className={styles.typingDot}></div>
                                                <div className={styles.typingDot}></div>
                                            </div>
                                        </div>
                                        <span className={styles.typingText}>Visitor is typing...</span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                            {chatViewState === 'pretakeover' && (
                                <div className={styles.preTaskoverBanner}>
                                    <AlertCircle size={16} />
                                    <span>This conversation is handled by the bot. Click {`"Takeover"`} to join.</span>
                                    <button
                                        className={styles.takeoverBtn}
                                        onClick={() => intervene(selectedSessionId)}
                                    >
                                        <Headphones size={14} /> Takeover
                                    </button>
                                </div>
                            )}

                            {chatViewState === 'active' && (
                                <div className={styles.composeArea}>
                                    <div className={styles.composeToolbar}>
                                        <div className={styles.toolbarLeft}>
                                            <button className={styles.toolbarBtn} title="Attach file">
                                                <Paperclip size={14} />
                                            </button>
                                            <button className={styles.toolbarBtn} title="Emoji">
                                                <Smile size={14} />
                                            </button>
                                        </div>
                                        <div className={styles.toolbarRight}>
                                            <span className={styles.replyingAs}>Replying as Agent</span>
                                        </div>
                                    </div>

                                    <div className={styles.inputRow}>
                                        <input
                                            type="text"
                                            className={styles.chatInput}
                                            value={newMessage}
                                            onChange={handleInputChange}
                                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Type your message..."
                                        />
                                        <button
                                            className={styles.sendBtn}
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim()}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </div>

                                    <div className={styles.quickReplies}>
                                        {quickReplies.map((reply, idx) => (
                                            <button
                                                key={idx}
                                                className={styles.quickReply}
                                                onClick={() => {
                                                    const mockEvent = { target: { value: reply } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                                    handleInputChange(mockEvent);
                                                    setTimeout(sendMessage, 100);
                                                }}
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={styles.chatEmptyMinimal}>
                            <div className={styles.chatEmptyDot} />
                            <span>Select a visitor to start chatting</span>
                        </div>
                    )}
                </div>
                {/* Right Panel: Visitor Intelligence */}
                {selectedSession && (
                    <div className={styles.intelPanel}>
                        <div className={styles.panelSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <Zap size={14} /> Lead Insights
                                </div>
                            </div>

                            <div className={styles.leadScore}>
                                <div className={`${styles.scoreCircle} ${getScoreColor(selectedSession.lead_score)}`}>
                                    {Math.round(selectedSession.lead_score)}
                                </div>
                                <div className={styles.scoreInfo}>
                                    <div className={styles.scoreLabel}>{selectedSession.lead_status || 'Unknown'}</div>
                                    <div className={styles.scoreSubtext}>Lead Quality Score</div>
                                </div>
                            </div>

                            {selectedSession.lead_insights && (
                                <div className={styles.leadInsightsBreakdown}>
                                    {(() => {
                                        try {
                                            const insights = JSON.parse(selectedSession.lead_insights);
                                            return Object.entries(insights).map(([key, value]) => {
                                                const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
                                                const valStr = String(value);
                                                const numericValue = valStr.includes('/') ? parseInt(valStr.split('/')[0]) : parseInt(valStr);
                                                const maxValue = valStr.includes('/') ? parseInt(valStr.split('/')[1]) : 10;
                                                const percentage = Math.min(Math.max((numericValue / (maxValue || 10)) * 100, 0), 100);

                                                return (
                                                    <div key={key} className={styles.insightRow}>
                                                        <div className={styles.insightHeader}>
                                                            <span className={styles.insightLabel}>{label}</span>
                                                            <span className={styles.insightValue}>{valStr}</span>
                                                        </div>
                                                        <div className={styles.insightBar}>
                                                            <div
                                                                className={styles.insightFill}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        } catch {
                                            return null;
                                        }
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className={styles.panelSection}>
                            <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className={styles.sectionTitle}>
                                    <User size={14} /> Full Lead Details
                                </div>
                                {!isEditingLead ? (
                                    <button
                                        onClick={() => setIsEditingLead(true)}
                                        style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        Edit
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setIsEditingLead(false)}
                                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '12px' }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>

                            {isEditingLead ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={editLeadData.name}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, name: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={editLeadData.email}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, email: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Phone"
                                        value={editLeadData.phone}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, phone: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Company"
                                        value={editLeadData.company}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, company: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Website"
                                        value={editLeadData.website}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, website: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Trade Type"
                                        value={editLeadData.trade_type}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, trade_type: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Country"
                                        value={editLeadData.country_interested}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, country_interested: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Product"
                                        value={editLeadData.product}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, product: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Requirement"
                                        value={editLeadData.requirement_type}
                                        onChange={(e) => setEditLeadData({ ...editLeadData, requirement_type: e.target.value })}
                                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #e2e8f0', width: '100%' }}
                                    />
                                    <button
                                        onClick={handleSaveLead}
                                        disabled={isSavingLead}
                                        style={{ marginTop: '8px', padding: '8px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        {isSavingLead ? 'Saving...' : 'Save Lead'}
                                    </button>
                                </div>
                            ) : (
                                <div className={styles.contactData}>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Email</span>
                                        <span className={styles.dataValue}>{selectedSession.lead_email || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Phone</span>
                                        <span className={styles.dataValue}>{selectedSession.lead_phone || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Company</span>
                                        <span className={styles.dataValue}>{selectedSession.lead_company || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Website</span>
                                        <span className={styles.dataValue}>{selectedSession.website || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Trade Type</span>
                                        <span className={styles.dataValue}>{selectedSession.trade_type || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Country</span>
                                        <span className={styles.dataValue}>{selectedSession.country_interested || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Product</span>
                                        <span className={styles.dataValue}>{selectedSession.product || 'Not provided'}</span>
                                    </div>
                                    <div className={styles.dataRow}>
                                        <span className={styles.dataLabel}>Requirement</span>
                                        <span className={styles.dataValue}>{selectedSession.requirement_type || 'Not provided'}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lead Form Data Section */}
                        {(selectedSession.lead_email || selectedSession.lead_phone || selectedSession.lead_company) && (
                            <div className={styles.panelSection}>
                                <div className={styles.sectionHeader}>
                                    <div className={styles.sectionTitle}>
                                        <CheckCircle2 size={14} /> Enquiry Submitted
                                    </div>
                                </div>

                                <div className={styles.leadFormData}>
                                    <div className={styles.leadFormHeader}>
                                        <div className={styles.leadFormStatus}>
                                            <div className={styles.leadFormStatusDot} />
                                            <span>Form completed during this session</span>
                                        </div>
                                        <div className={styles.leadFormTime}>
                                            Submitted: {selectedSession.created_at_ist}
                                        </div>
                                    </div>

                                    <div className={styles.leadFormFields}>
                                        {selectedSession.lead_name && (
                                            <div className={styles.leadFormField}>
                                                <span className={styles.leadFormLabel}>Full Name</span>
                                                <span className={styles.leadFormValue}>{selectedSession.lead_name}</span>
                                            </div>
                                        )}
                                        {selectedSession.lead_email && (
                                            <div className={styles.leadFormField}>
                                                <span className={styles.leadFormLabel}>Business Email</span>
                                                <span className={styles.leadFormValue}>{selectedSession.lead_email}</span>
                                            </div>
                                        )}
                                        {selectedSession.lead_phone && (
                                            <div className={styles.leadFormField}>
                                                <span className={styles.leadFormLabel}>Contact Number</span>
                                                <span className={styles.leadFormValue}>{selectedSession.lead_phone}</span>
                                            </div>
                                        )}
                                        {selectedSession.lead_company && (
                                            <div className={styles.leadFormField}>
                                                <span className={styles.leadFormLabel}>Company Name</span>
                                                <span className={styles.leadFormValue}>{selectedSession.lead_company}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.leadFormNote}>
                                        <span>Additional details (website, requirements) available in full lead record</span>
                                    </div>

                                    <div className={styles.leadFormActions}>
                                        <button className={styles.leadFormBtn}>
                                            <User size={12} />
                                            View Full Lead
                                        </button>
                                        <button
                                            className={styles.leadFormBtn}
                                            onClick={() => togglePriority(selectedSession.session_uuid)}
                                        >
                                            <Star size={12} />
                                            {selectedSession.lead_status === 'PRIORITY' ? 'Remove Priority' : 'Mark Priority'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.panelSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <Monitor size={14} /> Tech Stack
                                </div>
                            </div>

                            <div className={styles.contactData}>
                                <div className={styles.dataRow}>
                                    <span className={styles.dataLabel}>Browser / OS</span>
                                    <span className={styles.dataValue}>{selectedSession.browser} / {selectedSession.os}</span>
                                </div>
                                <div className={styles.dataRow}>
                                    <span className={styles.dataLabel}>IP Address</span>
                                    <span className={styles.dataValue}>{selectedSession.initial_ip}</span>
                                </div>
                            </div>
                        </div>

                        <div className={styles.panelSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionTitle}>
                                    <Shield size={14} /> Sales Actions
                                </div>
                            </div>

                            <div className={styles.actionGrid}>
                                <button
                                    className={`${styles.actionTile} ${selectedSession.lead_status === 'PRIORITY' ? styles.actionActive : ''}`}
                                    onClick={() => togglePriority(selectedSession.session_uuid)}
                                >
                                    <Star size={16} />
                                    <span>Priority</span>
                                </button>
                                <button
                                    className={`${styles.actionTile} ${selectedSession.spam_flag ? styles.actionActive : ''} ${styles.actionDanger}`}
                                    onClick={() => toggleSpam(selectedSession.session_uuid)}
                                >
                                    <ShieldAlert size={16} />
                                    <span>Spam</span>
                                </button>
                                <button
                                    className={`${styles.actionTile} ${styles.actionDanger}`}
                                    onClick={() => blockVisitor(selectedSession.session_uuid)}
                                >
                                    <Ban size={16} />
                                    <span>Block</span>
                                </button>
                                <button
                                    className={`${styles.actionTile} ${styles.actionDanger} ${styles.actionFullWidth}`}
                                    onClick={() => closeConversation(selectedSession.session_uuid)}
                                >
                                    <X size={16} />
                                    <span>End Chat</span>
                                </button>
                                <button
                                    className={`${styles.actionTile} ${styles.actionFullWidth}`}
                                    onClick={() => setSelectedSessionId(null)}
                                >
                                    <Eye size={16} />
                                    <span>Close View</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default function LiveChatPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', height: '100vh', width: '100%', color: '#666' }}>
                Loading Live Chat...
            </div>
        }>
            <LiveChatContent />
        </Suspense>
    );
}