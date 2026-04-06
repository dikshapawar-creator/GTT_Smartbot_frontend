'use client';

import { useEffect, useCallback, useRef } from 'react';
import { wsManager } from '@/lib/wsManager';
import { auth } from '@/lib/auth';
import { WS_BASE } from '@/config/api';
import { playNotificationSound, showBrowserNotification } from '@/lib/notifications';

export type CRMEventType =
    | 'INTENT_CREATED' | 'INTENT_UPDATED' | 'INTENT_DELETED'
    | 'LEAD_CREATED' | 'LEAD_UPDATED' | 'LEAD_DELETED'
    | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DEACTIVATED'
    | 'SESSION_UPDATED' | 'NEW_MESSAGE';

export interface CRMUpdateEvent {
    type: CRMEventType;
    purpose: string;
    [key: string]: unknown;
}

export function useCRMUpdates(onEvent?: (event: CRMUpdateEvent) => void) {
    const onEventRef = useRef(onEvent);

    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const connect = useCallback(() => {
        const token = auth.getAccessToken();
        if (!token) return;

        const user = auth.getUser();
        const selectedTenantId = typeof window !== 'undefined'
            ? localStorage.getItem('selected_tenant_id')
            : null;
        const activeTenantId = selectedTenantId || user?.primary_tenant_id || user?.tenant_id;

        let url = `${WS_BASE}/live-chat/ws/crm/updates?token=${token}`;
        if (activeTenantId) {
            url += `&tenant_id=${activeTenantId}`;
        }

        wsManager.connect(url, 'crm_updates');
    }, []);

    useEffect(() => {
        // Only connect if not already connecting/open for this purpose
        const status = wsManager.getStatus('crm_updates');
        if (status === 'IDLE' || status === 'CLOSED') {
            connect();
        }

        const unsubscribe = wsManager.subscribe('message', (data: Record<string, unknown>) => {
            const msgData = data as Record<string, unknown> & { purpose?: string; message_type?: string; type?: string; message_text?: string };
            if (msgData.purpose === 'crm_updates') {
                // Enterprise Global Sound / Notifications
                const isTabInactive = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());
                const isNotLivePage = typeof window !== 'undefined' && !window.location.pathname.includes('live-chat');
                const isIncoming = msgData.message_type !== 'agent';

                if ((isTabInactive || isNotLivePage) && isIncoming && msgData.type === 'NEW_MESSAGE') {
                    playNotificationSound();
                    showBrowserNotification('New Customer Message', msgData.message_text || 'Incoming message...');
                }
            }

            if (onEventRef.current) {
                console.log('📬 CRM Update received:', msgData);
                onEventRef.current(msgData as unknown as CRMUpdateEvent);
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [connect]);

    return {
        status: wsManager.getStatus('crm_updates'),
        reconnect: connect
    };
}
