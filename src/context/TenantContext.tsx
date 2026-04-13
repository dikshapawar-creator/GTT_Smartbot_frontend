'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { auth, UserProfile } from '@/lib/auth';
import api from '@/config/api';

interface Tenant {
    id: number;
    name: string;
    is_primary: boolean;
}

interface TenantContextType {
    selectedTenantId: number | null;
    setSelectedTenantId: (id: number | null) => void;
    allowedTenants: Tenant[];
    isLoading: boolean;
    currentTenantName: string;
    refreshTenants: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
    const [selectedTenantId, setSelectedTenantIdState] = useState<number | null>(null);
    const [allowedTenants, setAllowedTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const setSelectedTenantId = useCallback((id: number | null) => {
        setSelectedTenantIdState(id);
        if (id !== null) {
            localStorage.setItem('selected_tenant_id', String(id));
        } else {
            localStorage.removeItem('selected_tenant_id');
        }
    }, []);

    const refreshTenants = useCallback(async () => {
        try {
            // Small delay to ensure DB transaction is fully committed and visible
            await new Promise(resolve => setTimeout(resolve, 2000));
            const { data: user } = await api.get<UserProfile>('/auth/me');
            auth.updateUser(user);

            const tenants = user.tenant_access?.map(t => ({
                id: t.tenant_id,
                name: t.tenant_name,
                is_primary: t.is_primary
            })) || [];

            setAllowedTenants(tenants);

            // If current selected id is no longer valid, fallback
            const currentId = localStorage.getItem('selected_tenant_id');
            const parsedId = currentId ? parseInt(currentId, 10) : null;
            const isValid = tenants.some(t => t.id === parsedId);

            if (!isValid && tenants.length > 0) {
                const primary = tenants.find(t => t.is_primary) || tenants[0];
                setSelectedTenantId(primary.id);
            }
        } catch (error) {
            console.error('Failed to refresh tenants:', error);
        }
    }, [setSelectedTenantId]);

    useEffect(() => {
        const user = auth.getUser();
        if (user) {
            // Transform tenant_access to a simpler internal format
            const tenants = user.tenant_access?.map(t => ({
                id: t.tenant_id,
                name: t.tenant_name,
                is_primary: t.is_primary
            })) || [];

            setAllowedTenants(tenants);

            // 1. Try to load from localStorage
            const savedId = localStorage.getItem('selected_tenant_id');
            const parsedId = savedId ? parseInt(savedId, 10) : null;

            // 2. Validate savedId exists in allowedTenants
            const isValid = tenants.some(t => t.id === parsedId);

            if (isValid && parsedId !== null) {
                setSelectedTenantIdState(parsedId);
            } else if (tenants.length === 1) {
                setSelectedTenantId(tenants[0].id);
            } else if (user.primary_tenant_id) {
                setSelectedTenantId(user.primary_tenant_id);
            }
        }
        setIsLoading(false);

        // 🔄 Phase 4: Forced Sync & Background Refresh
        refreshTenants(); // Trigger initial backfill/refresh on mount

        const interval = setInterval(() => {
            if (auth.isAuthenticated()) {
                refreshTenants();
            }
        }, 300000); // Pulse every 5 minutes

        return () => clearInterval(interval);
    }, [setSelectedTenantId, refreshTenants]);

    const currentTenantName = allowedTenants.find(t => t.id === selectedTenantId)?.name || 'Select Website';

    return (
        <TenantContext.Provider value={{
            selectedTenantId,
            setSelectedTenantId,
            allowedTenants,
            isLoading,
            currentTenantName,
            refreshTenants
        }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
