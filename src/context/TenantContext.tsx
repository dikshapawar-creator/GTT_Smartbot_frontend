'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '@/lib/auth';

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
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
    const [selectedTenantId, setSelectedTenantIdState] = useState<number | null>(null);
    const [allowedTenants, setAllowedTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                // 3. Auto-select if only one tenant
                setSelectedTenantIdState(tenants[0].id);
                localStorage.setItem('selected_tenant_id', String(tenants[0].id));
            } else if (user.primary_tenant_id) {
                // 4. Default to primary
                setSelectedTenantIdState(user.primary_tenant_id);
                localStorage.setItem('selected_tenant_id', String(user.primary_tenant_id));
            }
        }
        setIsLoading(false);
    }, []);

    const setSelectedTenantId = (id: number | null) => {
        setSelectedTenantIdState(id);
        if (id !== null) {
            localStorage.setItem('selected_tenant_id', String(id));
        } else {
            localStorage.removeItem('selected_tenant_id');
        }
    };

    const currentTenantName = allowedTenants.find(t => t.id === selectedTenantId)?.name || 'Select Website';

    return (
        <TenantContext.Provider value={{
            selectedTenantId,
            setSelectedTenantId,
            allowedTenants,
            isLoading,
            currentTenantName
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
