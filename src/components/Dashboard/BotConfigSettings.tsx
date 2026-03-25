'use client';
import { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { api } from '@/lib/api';
import { Palette, Upload, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BotConfig {
    chatbot_name: string;
    chatbot_logo_url: string;
    fab_tooltip: string;
    welcome_text: string;
    tenant_id: number;
}

export default function BotConfigSettings() {
    const [config, setConfig] = useState<BotConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const { data } = await api.get<BotConfig>('/bot-config');
            setConfig(data);
        } catch (error) {
            console.error('Failed to fetch bot config', error);
            setToast({ type: 'error', text: 'Failed to load configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;

        try {
            setSaving(true);
            setToast(null);
            await api.put('/admin/bot-config', {
                chatbot_name: config.chatbot_name,
                fab_tooltip: config.fab_tooltip,
                welcome_text: config.welcome_text
            });
            setToast({ type: 'success', text: '✅ Saved successfully' });
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error('Failed to update bot config', error);
            setToast({ type: 'error', text: '❌ Error saving config' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            setToast(null);
            const { data } = await api.post('/admin/bot-config/upload-logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (config) {
                setConfig({ ...config, chatbot_logo_url: data.logo_url });
            }
            setToast({ type: 'success', text: '✅ Logo uploaded successfully!' });
            setTimeout(() => setToast(null), 3000);
        } catch (error) {
            console.error('Logo upload failed', error);
            setToast({ type: 'error', text: '❌ Error uploading logo' });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-gray-500 font-medium">Loading personalization settings...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 leading-tight">Chatbot Branding</h1>
                <p className="text-gray-500 text-sm">Personalize your chatbot&apos;s identity and appearance</p>
            </div>

            {toast && (
                <div className={`fixed top-6 right-6 z-[60] p-4 rounded-xl flex items-center gap-3 border shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 bg-white ${toast.type === 'success'
                    ? 'border-emerald-100 text-emerald-700'
                    : 'border-rose-100 text-rose-700'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                    <span className="text-sm font-semibold !text-inherit">{toast.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT CARD - Configuration Form */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                    <div className="space-y-6">
                        {/* Chatbot Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Chatbot Name
                            </label>
                            <input
                                type="text"
                                value={config?.chatbot_name || ''}
                                onChange={(e) => setConfig(prev => prev ? { ...prev, chatbot_name: e.target.value } : null)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="e.g. GTD Support"
                            />
                            <p className="text-xs text-gray-400 mt-1.5">This name appears in the chat header.</p>
                        </div>

                        {/* Launcher Tooltip */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Launcher Tooltip
                            </label>
                            <input
                                type="text"
                                value={config?.fab_tooltip || ''}
                                onChange={(e) => setConfig(prev => prev ? { ...prev, fab_tooltip: e.target.value } : null)}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
                                placeholder="e.g. Trade Support"
                            />
                            <p className="text-xs text-gray-400 mt-1.5">The message displayed next to the floating chat button.</p>
                        </div>

                        {/* Welcome Message */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Welcome Message
                            </label>
                            <textarea
                                value={config?.welcome_text || ''}
                                onChange={(e) => setConfig(prev => prev ? { ...prev, welcome_text: e.target.value } : null)}
                                rows={4}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm resize-none"
                                placeholder="e.g. Welcome to GTD Service. How can I help you today?"
                            />
                            <p className="text-xs text-gray-400 mt-1.5">This is the first message the user sees when opening the chat.</p>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end pt-4 border-t border-gray-100">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-2.5 rounded-lg bg-indigo-600 !text-white font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                <span className="!text-white">Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE - Logo & Preview */}
                <div className="space-y-6">

                    {/* Logo Card */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center">
                        <p className="text-sm font-semibold text-gray-700 mb-4">Chatbot Logo</p>

                        <div className="relative group mx-auto mb-6">
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center p-4">
                                {config?.chatbot_logo_url ? (
                                    <NextImage
                                        src={config.chatbot_logo_url.startsWith('/static/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${config.chatbot_logo_url}` : config.chatbot_logo_url}
                                        alt="Bot Logo"
                                        width={96}
                                        height={96}
                                        unoptimized={true}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <Palette className="text-gray-300 w-8 h-8" />
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl text-white cursor-pointer"
                                disabled={uploading}
                            >
                                {uploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                            </button>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            className="hidden"
                            accept="image/*"
                        />

                        <button
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2 mx-auto"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <Upload size={14} />
                            Upload New Logo
                        </button>
                    </div>

                    {/* Live Preview Card */}
                    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl shadow-gray-200/50">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Live Preview</p>

                        <div className="bg-gray-800/80 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center p-1.5 overflow-hidden">
                                    {config?.chatbot_logo_url ? (
                                        <NextImage
                                            src={config.chatbot_logo_url.startsWith('/static/') ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}${config.chatbot_logo_url}` : config.chatbot_logo_url}
                                            alt="Logo"
                                            width={32}
                                            height={32}
                                            unoptimized={true}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            className="inverted-logo"
                                        />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-indigo-500" />
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-gray-100">{config?.chatbot_name || 'Bot Name'}</div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        <div className="text-[10px] text-gray-400">Online</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-gray-700/50 rounded-lg rounded-tl-none p-3 text-[11px] leading-relaxed text-gray-200 border border-white/5">
                                    {config?.welcome_text || 'Welcome message...'}
                                </div>
                                <div className="flex justify-end">
                                    <div className="bg-indigo-600 rounded-lg rounded-tr-none p-3 text-[11px] leading-relaxed text-white shadow-lg shadow-indigo-900/20">
                                        Hi! I need some help.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
