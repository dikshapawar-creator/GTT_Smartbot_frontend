/**
 * Formats a UTC date string or Date object into IST (Asia/Kolkata).
 * Ensures consistency across the CRM and prevents "UTC flicker" during initial renders.
 */
const istFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
});

export const formatToIST = (utcDate: string | Date | null | undefined): string => {
    if (!utcDate) return '';

    try {
        const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

        if (isNaN(date.getTime())) return '';

        return istFormatter.format(date) + ' IST';
    } catch (error) {
        console.error('[formatToIST] Error formatting date:', error);
        return '';
    }
};

/**
 * Returns a precise "synced" timestamp based on the server offset.
 * Use this for live durations or "now" comparisons.
 */
export const getSyncedNow = (serverOffset: number = 0): number => {
    return Date.now() + serverOffset;
};

/**
 * Normalizes an array of messages or a single message to include formatted IST strings.
 * Use this BEFORE setting state to prevent hydration flicker.
 */
export const normalizeMessages = <T extends { created_at_utc?: string | null }>(messages: T | T[]): (T & { created_at_ist: string }) | (T & { created_at_ist: string })[] => {
    const format = (m: T) => ({
        ...m,
        created_at_ist: formatToIST(m.created_at_utc)
    });

    if (Array.isArray(messages)) return messages.map(format);
    return format(messages);
};

/**
 * Normalizes session objects to include formatted IST strings for their activity.
 */
export const normalizeSessions = <T extends { created_at?: string | null, last_message_at?: string | null }>(sessions: T | T[]): (T & { created_at_ist: string, last_message_ist: string }) | (T & { created_at_ist: string, last_message_ist: string })[] => {
    const format = (s: T) => ({
        ...s,
        created_at_ist: formatToIST(s.created_at),
        last_message_ist: formatToIST(s.last_message_at)
    });

    if (Array.isArray(sessions)) return sessions.map(format);
    return format(sessions);
};
