// ── Utility Functions for Conversation History ──────────────────────────



// Format duration — never show "0m 0s"
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// Display name — never raw UUID
export function getDisplayName(session: {
  lead_name?: string | null;
  visitor_name?: string | null;
  session_uuid?: string | null;
  visitor_uuid?: string | null;
  leadName?: string | null;
  visitorUuid?: string | null;
}): string {
  const name = session.lead_name || session.visitor_name || session.leadName;
  if (name?.trim()) return name.trim();
  // Clean fallback — never show raw full UUID
  const uuid = session.session_uuid || session.visitor_uuid || session.visitorUuid || 'XXXXXX';
  return `Visitor #${uuid.slice(-6).toUpperCase()}`;
}

// Initials from name
export function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Score → status label + ring color classes
export function getLeadScoreConfig(score: number) {
  if (score >= 7) return { label: 'Hot Lead', ring: 'border-red-400 text-red-600' };
  if (score >= 4) return { label: 'Warm Lead', ring: 'border-amber-300 text-amber-600' };
  return { label: 'Cold Lead', ring: 'border-blue-300 text-blue-600' };
}

// Deterministic avatar gradient from name/uuid
export function getAvatarGradient(seed: string): string {
  const gradients = [
    'linear-gradient(135deg, #4f46e5, #7c3aed)',
    'linear-gradient(135deg, #0f766e, #0d9488)',
    'linear-gradient(135deg, #b45309, #d97706)',
    'linear-gradient(135deg, #be185d, #db2777)',
    'linear-gradient(135deg, #1d4ed8, #3b82f6)',
  ];
  const idx = (seed.charCodeAt(0) + seed.charCodeAt(1)) % gradients.length;
  return gradients[idx];
}

// Format session ID for display
export function formatSessionId(sessionId: string): string {
  return `sess_${sessionId.slice(-6)}`;
}

// Get status badge classes
export function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'ACTIVE':
    case 'active':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'waiting':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'CLOSED':
    case 'ended':
    case 'closed':
      return 'bg-zinc-100 text-zinc-500 border border-zinc-200';
    default:
      return 'bg-zinc-100 text-zinc-500 border border-zinc-200';
  }
}

// Get message bubble classes
export function getMessageBubbleClasses(senderType: string) {
  switch (senderType) {
    case 'user':
      return 'bg-white border border-zinc-100 text-zinc-900';
    case 'bot':
      return 'bg-indigo-50 border border-indigo-200 text-zinc-900';
    case 'agent':
      return 'bg-indigo-800 text-white';
    case 'system':
      return 'bg-zinc-100 border border-zinc-200 text-zinc-500';
    default:
      return 'bg-white border border-zinc-100 text-zinc-900';
  }
}

// Format date for day separator
export function formatDateIST(utcString: string): string {
  return new Date(utcString).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}