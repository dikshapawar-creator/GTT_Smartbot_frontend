'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/config/api';
import { ConversationSession, ChatMessage, FilterState, HistoryStats } from '@/components/conversation-history/types';
import { getDisplayName, getInitials, getAvatarGradient } from '@/components/conversation-history/utils';

interface UseConversationHistoryReturn {
  sessions: ConversationSession[];
  selectedSession: ConversationSession | null;
  messages: ChatMessage[];
  loading: boolean;
  messagesLoading: boolean;
  error: string | null;
  stats: HistoryStats;
  filters: FilterState;
  filteredSessions: ConversationSession[];

  // Actions
  setFilters: (filters: Partial<FilterState>) => void;
  selectSession: (sessionId: string) => void;
  resumeChat: (session: ConversationSession) => void;
  exportTranscript: (sessionId: string) => void;
  flagAsSpam: (sessionId: string) => void;
  blockIP: (sessionId: string) => void;
  refresh: () => void;
}

interface RawApiSession {
  id: number;
  session_id: string;
  visitor_uuid: string;
  display_name?: string | null;
  lead_name?: string | null;
  tenant_id?: number;
  session_status: 'ACTIVE' | 'CLOSED';
  current_mode: 'BOT' | 'HUMAN';
  created_at?: string;
  started_at?: string;
  last_message_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number;
  browser?: string;
  os?: string;
  device_type?: string;
  initial_ip?: string;
  ip_address?: string;
  country?: string | null;
  lead_id?: number | string;
  lead_email?: string | null;
  lead_phone?: string | null;
  lead_company?: string | null;
  lead_score?: number;
  lead_status?: string;
  trade_interest?: string | null;
  intent_tags?: string[];
  message_count?: number;
  spam_flag?: boolean;
  assigned_agent_id?: number | string | null;
  agent_name?: string | null;
}

export function useConversationHistory(): UseConversationHistoryReturn {
  const router = useRouter();

  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<HistoryStats>({
    totalSessions: 0,
    withLeads: 0,
    avgDurationSeconds: 0,
    spamCount: 0
  });

  const [filters, setFiltersState] = useState<FilterState>({
    search: '',
    country: '',
    device: '',
    spam: 'all',
    dateFrom: '',
    dateTo: '',
    tab: 'all'
  });

  // Transform API data to our interface
  const transformSession = useCallback((apiSession: RawApiSession): ConversationSession => {
    const displayName = apiSession.display_name || getDisplayName({
      leadName: apiSession.lead_name,
      visitorUuid: apiSession.visitor_uuid
    } as { leadName: string | null; visitorUuid: string });

    return {
      id: apiSession.id,
      visitorUuid: apiSession.visitor_uuid,
      sessionId: apiSession.session_id,
      tenantId: apiSession.tenant_id || 1,
      displayName,
      initials: getInitials(displayName),
      avatarColor: getAvatarGradient(displayName),
      status: apiSession.session_status === 'ACTIVE' ? 'active' : 'ended',
      mode: apiSession.current_mode === 'HUMAN' ? 'agent' : 'bot',
      startedAt: apiSession.created_at || apiSession.started_at || '',
      lastActivityAt: apiSession.last_message_at || '',
      endedAt: apiSession.ended_at || null,
      durationSeconds: apiSession.duration_seconds || 0,
      browser: apiSession.browser || 'Unknown',
      os: apiSession.os || 'Unknown',
      deviceType: apiSession.device_type || 'Unknown',
      ipAddress: apiSession.initial_ip || apiSession.ip_address || 'Unknown',
      country: apiSession.country || null,
      leadId: apiSession.lead_id ? String(apiSession.lead_id) : null,
      leadName: apiSession.lead_name || null,
      leadEmail: apiSession.lead_email || null,
      leadPhone: apiSession.lead_phone || null,
      leadCompany: apiSession.lead_company || null,
      leadScore: apiSession.lead_score || 0,
      leadStatus: (apiSession.lead_status as 'cold' | 'warm' | 'hot') || 'cold',
      leadFormSubmitted: !!apiSession.lead_name,
      tradeInterest: apiSession.trade_interest || null,
      intentTags: apiSession.intent_tags || [],
      messageCount: apiSession.message_count || 0,
      messages: [],
      spamFlag: apiSession.spam_flag || false,
      assignedAgentId: typeof apiSession.assigned_agent_id === 'string' ? parseInt(apiSession.assigned_agent_id) : apiSession.assigned_agent_id || null,
      agentName: apiSession.agent_name || null
    };
  }, []);

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use existing history endpoint
      const response = await api.get('/live-chat/history', {
        params: {
          page: 1,
          page_size: 100,
          status: 'ALL'
        }
      });

      const apiSessions = response.data.items || [];
      const transformedSessions = apiSessions.map(transformSession);

      setSessions(transformedSessions);

      // Calculate stats
      const totalSessions = transformedSessions.length;
      const withLeads = transformedSessions.filter((s: ConversationSession) => s.leadFormSubmitted).length;
      const totalDuration = transformedSessions.reduce((sum: number, s: ConversationSession) => sum + s.durationSeconds, 0);
      const avgDurationSeconds = totalSessions > 0 ? Math.floor(totalDuration / totalSessions) : 0;
      const spamCount = transformedSessions.filter((s: ConversationSession) => s.spamFlag).length;

      setStats({
        totalSessions,
        withLeads,
        avgDurationSeconds,
        spamCount
      });

    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load conversation history';
      console.error('Failed to fetch conversation history:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [transformSession]);

  // Fetch messages for selected session
  const fetchMessages = useCallback(async (sessionId: string) => {
    try {
      setMessagesLoading(true);
      setError(null);

      const response = await api.get(`/live-chat/messages/${sessionId}`, {
        params: {
          page: 1,
          page_size: 100
        }
      });

      const apiMessages = response.data.items || [];
      const transformedMessages: ChatMessage[] = apiMessages.map((msg: {
        id: number;
        message_type: 'user' | 'bot' | 'agent' | 'system';
        message_text: string;
        agent_id?: number | string | null;
        agent_name?: string | null;
        created_at_utc: string;
      }) => ({
        id: msg.id,
        senderType: msg.message_type,
        content: msg.message_text,
        agentId: typeof msg.agent_id === 'string' ? parseInt(msg.agent_id) : msg.agent_id || null,
        agentName: msg.agent_name || null,
        createdAt: msg.created_at_utc
      }));

      setMessages(transformedMessages);

    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setError('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Filter sessions based on current filters
  const filteredSessions = sessions
    .filter(s => {
      // Tab filter
      if (filters.tab === 'active' && s.status === 'ended') return false;
      if (filters.tab === 'closed' && s.status !== 'ended') return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = s.displayName.toLowerCase().includes(searchLower);
        const matchesUuid = s.visitorUuid.includes(searchLower);
        const matchesIp = s.ipAddress.includes(searchLower);
        const matchesSessionId = s.sessionId.includes(searchLower);

        if (!matchesName && !matchesUuid && !matchesIp && !matchesSessionId) return false;
      }

      // Country filter
      if (filters.country && s.country !== filters.country) return false;

      // Device filter
      if (filters.device && s.deviceType !== filters.device) return false;

      // Spam filter
      if (filters.spam === 'spam' && !s.spamFlag) return false;
      if (filters.spam === 'clean' && s.spamFlag) return false;

      // Date filters
      if (filters.dateFrom) {
        const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
        if (sessionDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const sessionDate = new Date(s.startedAt).toISOString().split('T')[0];
        if (sessionDate > filters.dateTo) return false;
      }

      return true;
    })
    // Deduplicate by visitorUuid — show most recent session per visitor
    .filter((s, i, arr) => arr.findIndex(x => x.visitorUuid === s.visitorUuid) === i)
    // Sort by most recent first
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  // Actions
  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (session) {
      setSelectedSession(session);
      fetchMessages(session.sessionId);
    }
  }, [sessions, fetchMessages]);

  const resumeChat = useCallback((session: ConversationSession) => {
    if (session.status === 'ended') {
      // Show toast: "This conversation has ended. Start a new chat instead."
      return;
    }

    // Navigate to Live Conversations page with this session pre-selected
    router.push(`/crm/dashboard/live-chat?session=${session.sessionId}`);
  }, [router]);

  const exportTranscript = useCallback(async (sessionId: string) => {
    try {
      // Implementation for export functionality
      console.log('Exporting transcript for session:', sessionId);
    } catch (err) {
      console.error('Failed to export transcript:', err);
    }
  }, []);

  const flagAsSpam = useCallback(async (sessionId: string) => {
    try {
      // Implementation for spam flagging
      console.log('Flagging as spam:', sessionId);
    } catch (err) {
      console.error('Failed to flag as spam:', err);
    }
  }, []);

  const blockIP = useCallback(async (sessionId: string) => {
    try {
      // Implementation for IP blocking
      console.log('Blocking IP for session:', sessionId);
    } catch (err) {
      console.error('Failed to block IP:', err);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Initial load
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    selectedSession,
    messages,
    loading,
    messagesLoading,
    error,
    stats,
    filters,
    filteredSessions,
    setFilters,
    selectSession,
    resumeChat,
    exportTranscript,
    flagAsSpam,
    blockIP,
    refresh
  };
}