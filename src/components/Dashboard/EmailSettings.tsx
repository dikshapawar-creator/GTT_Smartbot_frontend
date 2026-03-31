'use client';
import { useState, useEffect, useCallback } from 'react';
import { Save, Server, Globe, Layout, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/config/api';
import { useTenant } from '@/context/TenantContext'; // Import useTenant

interface EmailConfig {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
    smtp_from_email: string;
    smtp_from_name: string;
    smtp_use_tls: boolean;
    smtp_use_ssl: boolean;
    confirmation_template: string;
    reset_password_template: string;
}

interface Tenant {
    id: number;
    name: string;
}

interface EmailSettingsProps {
    onSaveStateChange?: (isSaving: boolean) => void;
    registerSave?: (saveFn: () => Promise<void>) => void;
}

export default function EmailSettings({ onSaveStateChange, registerSave }: EmailSettingsProps) {
    const { selectedTenantId: contextTenantId } = useTenant(); // Get context ID
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [config, setConfig] = useState<EmailConfig>({
        smtp_host: '',
        smtp_port: 587,
        smtp_user: '',
        smtp_password: '',
        smtp_from_email: '',
        smtp_from_name: 'Chatbot Support',
        smtp_use_tls: true,
        smtp_use_ssl: false,
        confirmation_template: '',
        reset_password_template: ''
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sync saving state to parent
    useEffect(() => {
        onSaveStateChange?.(saving);
    }, [saving, onSaveStateChange]);

    useEffect(() => {
        api.get('/admin/tenants').then(res => {
            const data = Array.isArray(res.data) ? res.data : (res.data as { data: Tenant[] }).data || [];
            setTenants(data);

            // 🔥 Context Sync: If global context has a selected tenant, use it first
            if (contextTenantId && data.some(t => t.id === contextTenantId)) {
                setSelectedTenantId(contextTenantId);
            } else if (data.length > 0) {
                setSelectedTenantId(data[0].id);
            }
        }).catch(err => console.error("Failed to fetch tenants:", err));
    }, [contextTenantId]);

    useEffect(() => {
        if (selectedTenantId) {
            setLoading(true);
            api.get(`/admin/email-config/${selectedTenantId}`)
                .then(res => {
                    setConfig(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Failed to fetch email config:", err);
                    setLoading(false);
                });
        }
    }, [selectedTenantId]);

    const handleSave = useCallback(async () => {
        if (!selectedTenantId) return;
        setSaving(true);
        setMessage(null);
        try {
            await api.put(`/admin/email-config/${selectedTenantId}`, config);
            setMessage({ type: 'success', text: 'Email configuration saved successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Save failed:", err);
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
            throw err;
        } finally {
            setSaving(false);
        }
    }, [config, selectedTenantId]);

    // Register save function with parent
    useEffect(() => {
        registerSave?.(handleSave);
    }, [registerSave, handleSave]);

    return (
        <div className="section" style={{ padding: 0 }}>
            {/* Header Area */}
            <div className="section-card" style={{ marginBottom: 24, background: 'transparent', border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ct)' }}>Mail Server & Templates</h2>
                        <p style={{ fontSize: '13px', color: 'var(--ctm)', marginTop: 4 }}>Configure multi-tenant SMTP settings and HTML email card designs.</p>
                    </div>
                    <button className="btn-primary" onClick={handleSave} disabled={saving || !selectedTenantId}>
                        {saving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`alert-box ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 24 }}>
                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <div>
                        <strong>{message.type === 'success' ? 'Success' : 'Error'}</strong>
                        <span>{message.text}</span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 3fr', gap: 24 }}>
                {/* website selection */}
                <div className="lg:col-span-1">
                    <div className="section-card" style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Globe size={14} className="text-primary" style={{ color: 'var(--cp)' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ctm)' }}>Scope</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {tenants.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedTenantId(t.id)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '10px 14px',
                                        borderRadius: 8,
                                        fontSize: '13px',
                                        transition: 'all 0.2s',
                                        background: selectedTenantId === t.id ? 'var(--cpl)' : 'transparent',
                                        color: selectedTenantId === t.id ? 'var(--cp)' : 'var(--cts)',
                                        border: 'none',
                                        fontWeight: selectedTenantId === t.id ? 600 : 400
                                    }}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    {loading ? (
                        <div className="section-card" style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ctm)' }}>
                            <RefreshCw className="animate-spin mb-3" size={24} />
                            <span style={{ fontSize: '13px' }}>Fetching tenant configuration...</span>
                        </div>
                    ) : (
                        <>
                            {/* SMTP Server */}
                            <div className="section-card">
                                <div className="section-head">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Server size={16} />
                                        <h2>SMTP Server Settings</h2>
                                    </div>
                                </div>
                                <div className="section-body">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">SMTP Host</label>
                                            <input className="form-input" placeholder="smtp.gmail.com" value={config.smtp_host} onChange={e => setConfig({ ...config, smtp_host: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Port</label>
                                            <input className="form-input" type="number" value={config.smtp_port} onChange={e => setConfig({ ...config, smtp_port: parseInt(e.target.value) || 0 })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Username</label>
                                            <input className="form-input" value={config.smtp_user} onChange={e => setConfig({ ...config, smtp_user: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Password</label>
                                            <input className="form-input" type="password" value={config.smtp_password} onChange={e => setConfig({ ...config, smtp_password: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">From Email</label>
                                            <input className="form-input" value={config.smtp_from_email} onChange={e => setConfig({ ...config, smtp_from_email: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">From Name</label>
                                            <input className="form-input" value={config.smtp_from_name} onChange={e => setConfig({ ...config, smtp_from_name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={config.smtp_use_tls} onChange={e => setConfig({ ...config, smtp_use_tls: e.target.checked })} />
                                            Use TLS
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={config.smtp_use_ssl} onChange={e => setConfig({ ...config, smtp_use_ssl: e.target.checked })} />
                                            Use SSL
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Templates */}
                            <div className="section-card">
                                <div className="section-head">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <Layout size={16} />
                                        <h2>HTML Card Templates</h2>
                                    </div>
                                </div>
                                <div className="section-body">
                                    <div className="form-group" style={{ marginBottom: 24 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <label className="form-label">Lead Confirmation HTML</label>
                                            <span style={{ fontSize: '10px', color: 'var(--cp)', fontWeight: 600 }}>Supports {'{{name}}'}, {'{{email}}'}</span>
                                        </div>
                                        <textarea
                                            className="form-textarea"
                                            style={{ minHeight: 180, fontFamily: 'monospace', fontSize: '12px' }}
                                            value={config.confirmation_template}
                                            onChange={e => setConfig({ ...config, confirmation_template: e.target.value })}
                                            placeholder="<html>...</html>"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <label className="form-label">Password Reset HTML</label>
                                            <span style={{ fontSize: '10px', color: 'var(--cp)', fontWeight: 600 }}>Supports {'{{token}}'}, {'{{reset_url}}'}</span>
                                        </div>
                                        <textarea
                                            className="form-textarea"
                                            style={{ minHeight: 180, fontFamily: 'monospace', fontSize: '12px' }}
                                            value={config.reset_password_template}
                                            onChange={e => setConfig({ ...config, reset_password_template: e.target.value })}
                                            placeholder="<html>...</html>"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
