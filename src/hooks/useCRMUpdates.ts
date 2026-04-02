'use client';

import { useEffect, useCallback, useRef } from 'react';
import { wsManager } from '@/lib/wsManager';
import { auth } from '@/lib/auth';
import { WS_BASE } from '@/config/api';

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
            if (data.purpose === 'crm_updates' && onEventRef.current) {
                console.log('📬 CRM Update received:', data);
                onEventRef.current(data as unknown as CRMUpdateEvent);
            }
        });

        return () => {
            unsubscribe();
            // We don't necessarily disconnect here as other components might use it
            // wsManager.disconnect('crm_updates');
        };
    }, [connect]);

    return {
        status: wsManager.getStatus('crm_updates'),
        reconnect: connect
    };
}
