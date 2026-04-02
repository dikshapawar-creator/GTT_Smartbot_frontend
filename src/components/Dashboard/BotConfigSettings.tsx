'use client';
import { useState, useEffect, useCallback } from 'react';
import { Save, RefreshCw, CheckCircle2, AlertCircle, Camera, Layout } from 'lucide-react';
import Image from 'next/image';
import api from '@/config/api';

interface BotConfig {
    chatbot_name: string;
    fab_tooltip: string;
    welcome_text: string;
    chatbot_logo_url: string;
    primary_color: string;
    secondary_color: string;
    font_family: string;
}

import { useTenant } from '@/context/TenantContext';
import { auth } from '@/lib/auth';

interface BotConfigProps {
    onSaveStateChange?: (isSaving: boolean) => void;
    registerSave?: (saveFn: () => Promise<void>) => void;
}

export default function BotConfigSettings({ onSaveStateChange, registerSave }: BotConfigProps) {
    const { selectedTenantId: contextTenantId } = useTenant();
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(contextTenantId || null);
    const [tenants, setTenants] = useState<{ id: number, name: string }[]>([]);
    const [config, setConfig] = useState<BotConfig>({
        chatbot_name: '',
        fab_tooltip: '',
        welcome_text: '',
        chatbot_logo_url: '',
        primary_color: '#2B2A9B',
        secondary_color: '#1e40af',
        font_family: "'Inter', sans-serif"
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Sync saving state to parent
    useEffect(() => {
        onSaveStateChange?.(saving);
    }, [saving, onSaveStateChange]);

    // Fetch tenants for Super Admin
    useEffect(() => {
        if (auth.isSuperAdmin()) {
            api.get('/admin/tenants').then(res => {
                const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
                setTenants(data);
                if (!selectedTenantId && data.length > 0) {
                    setSelectedTenantId(data[0].id);
                }
            });
        }
    }, [selectedTenantId]);

    useEffect(() => {
        const tenantId = selectedTenantId || contextTenantId;
        if (!tenantId && !auth.isSuperAdmin()) return;

        setLoading(true);
        const url = auth.isSuperAdmin() && selectedTenantId
            ? `/admin/bot-config/${selectedTenantId}`
            : '/bot-config';

        api.get(url)
            .then(res => {
                setConfig(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch bot config:", err);
                setLoading(false);
            });
    }, [selectedTenantId, contextTenantId]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        setMessage(null);
        try {
            const url = auth.isSuperAdmin() && selectedTenantId
                ? `/admin/bot-config/${selectedTenantId}`
                : '/bot-config';

            await api.put(url, config);
            setMessage({ type: 'success', text: 'Branding updated successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update branding.' });
            throw err;
        } finally {
            setSaving(false);
        }
    }, [config, selectedTenantId]);

    // Register save function with parent
    useEffect(() => {
        registerSave?.(handleSave);
    }, [registerSave, handleSave]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
            const url = auth.isSuperAdmin() && selectedTenantId
                ? `/admin/bot-config/${selectedTenantId}/upload-logo`
                : '/admin/bot-config/upload-logo';

            const res = await api.post(url, formData);
            setConfig({ ...config, chatbot_logo_url: res.data.logo_url });
            setMessage({ type: 'success', text: 'Logo uploaded successfully!' });
            setTimeout(() => setMessage(null), 3000);
        } catch {
            setMessage({ type: 'error', text: 'Logo upload failed.' });
        }
    };

    if (loading) {
        return (
            <div className="section" style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ctm)' }}>
                <RefreshCw className="animate-spin mb-3" size={24} />
                <span>Loading branding configuration...</span>
            </div>
        );
    }

    return (
        <div className="section" style={{ padding: 0 }}>
            {/* Header Area */}
            <div className="section-card" style={{ marginBottom: 24, background: 'transparent', border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ct)' }}>Chatbot Branding</h2>
                        <p style={{ fontSize: '13px', color: 'var(--ctm)', marginTop: 4 }}>
                            {auth.isSuperAdmin() ? 'Configure branding for ' : 'Personalize your chatbot\'s identity, logos, and UI appearance.'}
                            {auth.isSuperAdmin() && (
                                <select
                                    value={selectedTenantId || ''}
                                    onChange={(e) => setSelectedTenantId(Number(e.target.value))}
                                    style={{ background: 'var(--cf)', border: '1px solid var(--cb)', borderRadius: 6, padding: '2px 8px', fontSize: 13, color: 'var(--ct)', fontWeight: 600, marginLeft: 8 }}
                                >
                                    {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            )}
                        </p>
                    </div>
                    {/* Hide local save button if parent is handling it, but keep for standalone use if needed */}
                    {!registerSave && (
                        <button className="btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />}
                            {saving ? 'Saving...' : 'Save Branding'}
                        </button>
                    )}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                {/* Visual Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="section-card">
                        <div className="section-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Layout size={16} />
                                <h2>Identity & Interface</h2>
                            </div>
                        </div>
                        <div className="section-body">
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label">Chatbot Name</label>
                                <input
                                    className="form-input"
                                    value={config.chatbot_name}
                                    onChange={e => setConfig({ ...config, chatbot_name: e.target.value })}
                                    placeholder="e.g. Smart Chatbot Support"
                                />
                                <span style={{ fontSize: '11px', color: 'var(--ctm)', marginTop: 4 }}>This name appears in the chat header and emails.</span>
                            </div>

                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label className="form-label">Launcher Tooltip</label>
                                <input
                                    className="form-input"
                                    value={config.fab_tooltip}
                                    onChange={e => setConfig({ ...config, fab_tooltip: e.target.value })}
                                    placeholder="e.g. Trade Support"
                                />
                                <span style={{ fontSize: '11px', color: 'var(--ctm)', marginTop: 4 }}>The message displayed next to the floating chat button.</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Welcome Message</label>
                                <textarea
                                    className="form-textarea"
                                    value={config.welcome_text}
                                    onChange={e => setConfig({ ...config, welcome_text: e.target.value })}
                                    placeholder="e.g. Welcome to Smart Chatbot. How can I help you today?"
                                    style={{ minHeight: 100 }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--ctm)', marginTop: 4 }}>The first automated message a user sees.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logo & Preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="section-card">
                        <div className="section-head">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Camera size={16} />
                                <h2>Bot Avatar / Logo</h2>
                            </div>
                        </div>
                        <div className="section-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32 }}>
                            <div style={{
                                position: 'relative',
                                width: 120,
                                height: 120,
                                borderRadius: 24,
                                border: '1px solid var(--cb)',
                                background: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                marginBottom: 20,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                {config.chatbot_logo_url ? (
                                    <Image
                                        src={config.chatbot_logo_url.startsWith('http') ? config.chatbot_logo_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${config.chatbot_logo_url}`}
                                        alt="Logo"
                                        fill
                                        style={{ objectFit: 'contain' }}
                                        unoptimized={true}
                                    />
                                ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--ctm)' }}>No Logo</span>
                                )}
                            </div>

                            <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                                <input type="file" hidden onChange={handleLogoUpload} accept="image/*" />
                                <Camera size={13} />
                                Upload New Logo
                            </label>
                            <p style={{ fontSize: '11px', color: 'var(--ctm)', marginTop: 12, textAlign: 'center' }}>
                                Recommended: Square PNG with transparent background.
                            </p>
                        </div>
                    </div>

                    {/* Live Preview Mini Preview */}
                    <div className="section-card" style={{ background: 'var(--cp)', color: 'white', padding: 20, borderRadius: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{config.chatbot_name || 'Chatbot'}</span>
                        </div>
                        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.1)', fontSize: '12px', lineHeight: 1.5 }}>
                            {config.welcome_text || 'Welcome to our service...'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                            <div style={{ background: 'white', color: 'var(--cp)', fontSize: '11px', fontWeight: 700, padding: '6px 12px', borderRadius: 8 }}>
                                Hi! I need help
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
