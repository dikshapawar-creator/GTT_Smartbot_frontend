// ── Utility Functions for Conversation History ──────────────────────────



// Format duration — never show "0m 0s"
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

// Format UTC timestamp to IST for display
export function toIST(utcString: string): string {
  return new Date(utcString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// Display name — never raw UUID
export function getDisplayName(session: {
  leadName?: string | null;
  visitorUuid: string;
}): string {
  if (session.leadName?.trim()) return session.leadName.trim();
  return `Visitor #${session.visitorUuid.slice(-6).toUpperCase()}`;
}

// Initials from name
export function getInitials(name: string): string {
  const parts = name.trim().split(' ');
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
    'from-indigo-600 to-violet-600',
    'from-teal-600 to-emerald-600',
    'from-amber-600 to-orange-600',
    'from-rose-600 to-pink-600',
    'from-sky-600 to-blue-600',
  ];
  const idx = seed.charCodeAt(0) % gradients.length;
  return gradients[idx];
}

// Format session ID for display
export function formatSessionId(sessionId: string): string {
  return `sess_${sessionId.slice(-6)}`;
}

// Get status badge classes
export function getStatusBadgeClasses(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'waiting':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
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