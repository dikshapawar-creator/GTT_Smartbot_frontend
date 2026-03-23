// ── Types for Conversation History ──────────────────────────────────────

export interface ConversationSession {
  id: number;                    // BIGINT PK
  visitorUuid: string;           // external token
  sessionId: string;             // display ID e.g. "sess_959b66"
  tenantId: number;

  // Display
  displayName: string;           // "Rahul Kumar" or "Visitor #959B66"
  initials: string;              // "RK" or "V"
  avatarColor: string;           // tailwind gradient classes

  // Status
  status: 'bot' | 'active' | 'waiting' | 'ended' | 'archived';
  mode: 'bot' | 'agent';

  // Timing (all UTC — convert to local in component)
  startedAt: string;             // ISO UTC
  lastActivityAt: string;        // ISO UTC
  endedAt: string | null;        // ISO UTC
  durationSeconds: number;       // computed

  // Tech
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  country: string | null;

  // Lead
  leadId: string | null;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
  leadCompany: string | null;
  leadScore: number;
  leadStatus: 'cold' | 'warm' | 'hot';
  leadFormSubmitted: boolean;
  tradeInterest: string | null;
  intentTags: string[];

  // Messages
  messageCount: number;
  messages: ChatMessage[];

  // Flags
  spamFlag: boolean;
  assignedAgentId: number | null;
  agentName: string | null;
}

export interface ChatMessage {
  id: number;
  senderType: 'user' | 'bot' | 'agent' | 'system';
  content: string;
  agentId: number | null;
  agentName: string | null;
  createdAt: string;             // ISO UTC — convert to local in component
}

export interface FilterState {
  search: string;
  country: string;       // '' = all
  device: string;        // '' = all
  spam: 'all' | 'spam' | 'clean';
  dateFrom: string;      // ISO date string
  dateTo: string;        // ISO date string
  tab: 'all' | 'active' | 'closed';
}

export interface HistoryStats {
  totalSessions: number;
  withLeads: number;
  avgDurationSeconds: number;
  spamCount: number;
}