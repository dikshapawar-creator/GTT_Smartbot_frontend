'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/config/api';

// ── Inline SVG Icons ─────────────────────────────────────────────────

const IcTarget = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const IcPlus = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);
const IcDownload = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const IcSearch = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const IcFilter = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
);
const IcPencil = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);
const IcEye = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);
const IcTrash = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);
const IcX = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
const IcCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const IcAlert = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const IcSave = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
);

// ── Types ─────────────────────────────────────────────────────────────

interface Intent {
    id: string;
    intentKey: string; // stored as #GREETING in frontend, GREETING in backend
    name: string;
    color: 'purple' | 'blue' | 'teal';
    keywords: string[];
    responseText: string;
    active: boolean;
}

const COLOR_MAP: Record<string, 'purple' | 'blue' | 'teal'> = {
    GREETING: 'purple',
    BUYER_SEARCH: 'teal',
    SUPPLIER_SEARCH: 'teal',
    HS_CODE_SEARCH: 'teal',
    IMPORT_EXPORT: 'teal',
    SALES_DEMO: 'blue',
    DEFAULT: 'blue',
};

function getColor(key: string): 'purple' | 'blue' | 'teal' {
    const upper = key.replace('#', '').toUpperCase();
    for (const [k, v] of Object.entries(COLOR_MAP)) {
        if (upper.includes(k)) return v;
    }
    return 'blue';
}

function toDisplayName(key: string): string {
    return key.replace('#', '').split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
}

// ── Default Fallback Data ─────────────────────────────────────────────

const DEFAULT_INTENTS: Intent[] = [
    {
        id: '1',
        intentKey: '#GREETING',
        name: 'Greeting',
        color: 'purple',
        keywords: ['hi', 'hello', 'hey', 'hii'],
        responseText: "Welcome to GTD Service! Are you looking to import or export data? I'm here to assist you — please let me know how I can help.",
        active: true,
    },
    {
        id: '2',
        intentKey: '#SALES_DEMO',
        name: 'Sales Demo',
        color: 'blue',
        keywords: ['demo', 'book demo', 'more details', 'pricing'],
        responseText: "I'd be grateful to help with that. Please book a demo so we can guide you properly.",
        active: true,
    },
    {
        id: '3',
        intentKey: '#IMPORT_EXPORT',
        name: 'Import Export',
        color: 'teal',
        keywords: ['show import data', 'show export data', 'get trade data'],
        responseText: "I will help you find the import export data. To assist you better, please share your details. May I know your Full Name?",
        active: true,
    }
];

// ── Component ─────────────────────────────────────────────────────────

const CSS = `
.ifp { --cp:#2B2A9B;--cph:#1e1d7a;--cpl:#ede9fe;--ca:#5b21b6;--cal:#c4b5fd;--cbg:#f5f4f0;--cbgc:#ffffff;--cbgs:#f8f7f4;--ct:#1a1a1a;--cts:#6b6b6b;--ctm:#9ca3af;--cb:rgba(0,0,0,0.10);--cbf:#5b21b6;--csu:#16a34a;--cda:#dc2626;--ton:#5b21b6;--tof:#d1d5db; font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:var(--ct);background:var(--cbg);display:flex;flex-direction:column; }
.ifp .topbar{height:56px;background:#fff;border-bottom:.5px solid var(--cb);display:flex;align-items:center;justify-content:space-between;padding:0 24px;width:100%;box-sizing:border-box;}
.ifp .topbar-l{display:flex;align-items:center;gap:12px;}
.ifp .t-icon{width:32px;height:32px;background:var(--cpl);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ca);flex-shrink:0;}
.ifp .t-title{font-size:15px;font-weight:500;line-height:1.2;margin:0;}
.ifp .t-sub{font-size:11px;color:var(--ctm);display:block;line-height:1.2;}
.ifp .topbar-r{display:flex;align-items:center;gap:10px;}
.ifp button{cursor:pointer;transition:all .2s ease;display:inline-flex;align-items:center;gap:6px;font-weight:500;outline:none;font-family:inherit;}
.ifp button:active{transform:scale(0.98);}
.ifp .btn-primary{background:var(--cp);color:#fff;border:none;border-radius:8px;padding:7px 16px;height:34px;font-size:13px;}
.ifp .btn-primary:hover{background:var(--cph);}
.ifp .btn-secondary{background:#fff;border:1px solid #d1d5db;color:var(--ct);border-radius:8px;padding:7px 14px;height:34px;font-size:13px;}
.ifp .btn-secondary:hover{background:#f9fafb;border-color:#b0b0b0;}
.ifp .btn-danger-sm{background:#fee2e2;border:1px solid #fca5a5;color:var(--cda);border-radius:8px;width:32px;height:32px;padding:0;justify-content:center;}
.ifp .btn-danger-sm:hover{filter:brightness(0.93);}
.ifp .btn-filter{height:34px;padding:0 14px;border-radius:8px;font-size:13px;background:#fff;border:1px solid #d1d5db;color:var(--cts);}
.ifp .btn-filter.active{border:1px solid var(--ca);color:var(--ca);font-weight:500;}
.ifp .btn-icon-sm{background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;width:32px;height:32px;padding:0;justify-content:center;}
.ifp .content{padding:24px;max-width:1280px;margin:0 auto;width:100%;box-sizing:border-box;}
.ifp .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;}
.ifp .stat-card{background:#fff;border:.5px solid var(--cb);border-radius:12px;padding:16px 20px;}
.ifp .stat-label{font-size:12px;color:var(--cts);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
.ifp .stat-value{font-size:26px;font-weight:500;color:var(--ct);line-height:1.2;}
.ifp .stat-delta{font-size:11px;margin-top:4px;display:flex;align-items:center;gap:4px;}
.ifp .d-up{color:var(--csu);}
.ifp .d-neutral{color:var(--ctm);}
.ifp .toolbar{display:flex;align-items:center;gap:10px;margin-bottom:24px;flex-wrap:wrap;}
.ifp .search-wrap{flex:1;max-width:360px;position:relative;}
.ifp .search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--ctm);pointer-events:none;display:flex;}
.ifp .search-input{width:100%;height:34px;background:#fff;border:.5px solid #d1d5db;border-radius:8px;padding-left:34px;padding-right:12px;font-size:14px;box-sizing:border-box;outline:none;font-family:inherit;}
.ifp .search-input:focus{border:1px solid var(--cbf);}
.ifp .toolbar-count{margin-left:auto;font-size:12px;color:var(--ctm);white-space:nowrap;}
.ifp .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:48px;}
.ifp .card{background:#fff;border:.5px solid var(--cb);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;transition:border .25s;}
.ifp .card.is-active{border:1px solid var(--cal);}
.ifp .card-head{padding:14px 16px;border-bottom:.5px solid var(--cb);display:flex;align-items:center;justify-content:space-between;}
.ifp .head-main{display:flex;align-items:center;gap:10px;}
.ifp .i-icon{width:36px;height:36px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ifp .ic-purple{background:#ede9fe;color:#5b21b6;}
.ifp .ic-blue{background:#dbeafe;color:#2563eb;}
.ifp .ic-teal{background:#ccfbf1;color:#0d9488;}
.ifp .meta-id{font-size:10px;font-weight:400;color:var(--ctm);text-transform:uppercase;letter-spacing:.05em;line-height:1;margin-bottom:2px;}
.ifp .meta-name{font-size:15px;font-weight:500;color:var(--ct);line-height:1.1;}
.ifp .toggle{width:32px;height:18px;border-radius:999px;position:relative;cursor:pointer;transition:background .2s;border:none;background:var(--tof);flex-shrink:0;}
.ifp .toggle.on{background:var(--ton);}
.ifp .toggle-thumb{width:14px;height:14px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);}
.ifp .toggle.on .toggle-thumb{transform:translateX(14px);}
.ifp .card-body{padding:12px 16px;flex:1;display:flex;flex-direction:column;gap:14px;}
.ifp .sec-label{font-size:10px;font-weight:500;color:var(--ctm);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;}
.ifp .chips{display:flex;flex-wrap:wrap;gap:5px;}
.ifp .chip{padding:3px 8px;background:#f3f4f6;border:.5px solid #e5e7eb;border-radius:999px;font-size:11px;color:#374151;}
.ifp .chip-more{background:var(--cpl);color:var(--ca);font-weight:500;border-color:var(--cal);}
.ifp .preview-box{background:var(--cbgs);border-left:2px solid var(--cal);border-radius:8px;padding:10px 12px;font-size:12px;color:var(--cts);line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;}
.ifp .card-footer{display:flex;align-items:center;gap:6px;padding:10px 16px;border-top:.5px solid var(--cb);}
.ifp .divider-v{width:.5px;height:20px;background:#e5e7eb;flex-shrink:0;}
.ifp .footer-btn{flex:1;justify-content:center;}
.ifp .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 20px;text-align:center;color:var(--ctm);gap:12px;}
.ifp .empty p{margin:0;font-size:14px;}
.ifp .personality{margin-top:32px;padding-top:24px;border-top:.5px solid var(--cb);}
.ifp .personality h2{font-size:16px;font-weight:500;margin:0 0 4px;}
.ifp .personality p{font-size:13px;color:var(--ctm);margin:0 0 20px;}
.ifp .personality-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#fff;padding:20px;border:.5px solid var(--cb);border-radius:12px;}
.ifp .form-group{display:flex;flex-direction:column;gap:4px;}
.ifp .form-label{font-size:12px;font-weight:500;color:var(--cts);}
.ifp .form-input,.ifp .form-textarea{background:var(--cbgs);border:.5px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;width:100%;box-sizing:border-box;color:var(--ct);}
.ifp .form-input:focus,.ifp .form-textarea:focus{border:1px solid var(--cbf);background:#fff;}
.ifp .form-mono{font-family:monospace;}
.ifp .form-textarea{min-height:80px;resize:vertical;}
.ifp .form-hint{font-size:11px;color:var(--ctm);}
.ifp .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:100;backdrop-filter:blur(2px);}
.ifp .modal{width:540px;background:#fff;border-radius:12px;border:.5px solid #d1d5db;box-shadow:0 20px 60px -10px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;animation:mIn .2s cubic-bezier(0,0,.2,1);}
@keyframes mIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
.ifp .modal-head{padding:18px 24px 14px;border-bottom:.5px solid var(--cb);display:flex;align-items:center;justify-content:space-between;}
.ifp .modal-head h2{margin:0;font-size:16px;font-weight:500;}
.ifp .modal-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px;}
.ifp .modal-foot{padding:14px 24px;border-top:.5px solid var(--cb);display:flex;justify-content:flex-end;gap:8px;background:#f9fafb;}
.ifp .toast{position:fixed;bottom:24px;right:24px;background:#1a1a1a;color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:999;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.25);animation:tIn .25s cubic-bezier(0,0,.2,1);}
@keyframes tIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.ifp .toast.error{background:#dc2626;}
.ifp .personality-save{grid-column:span 2;display:flex;justify-content:flex-end;margin-top:4px;}
@media(max-width:1024px){.ifp .grid{grid-template-columns:repeat(2,1fr);}.ifp .stats-row{grid-template-columns:repeat(2,1fr);}}
@media(max-width:640px){.ifp .grid{grid-template-columns:1fr;}.ifp .stats-row{grid-template-columns:repeat(2,1fr);}.ifp .modal{width:95vw;}.ifp .personality-grid{grid-template-columns:1fr;}.ifp .personality-save{grid-column:span 1;}}
`;

export default function IntentManager() {
    const [intents, setIntents] = useState<Intent[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [modal, setModal] = useState<{ open: boolean; mode: 'add' | 'edit'; data: Intent | null }>({ open: false, mode: 'add', data: null });
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [botName, setBotName] = useState('GTD Service Bot');
    const [handoffMsg, setHandoffMsg] = useState('Connecting you to a human agent...');
    const [liveStats, setLiveStats] = useState<{ active_visitors: number; agent_chats: number; spam_visitors: number }>({ active_visitors: 0, agent_chats: 0, spam_visitors: 0 });

    // Load live analytics from backend
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/live-chat/analytics');
                if (res.data) setLiveStats(res.data);
            } catch { /* analytics are non-critical, fail silently */ }
        })();
    }, []);

    // Load intents from backend
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/intents/');
                const mapped: Intent[] = res.data.map((i: { id: number | string; intent_key: string; keywords: string[]; response_text: string }) => ({
                    id: i.id.toString(),
                    intentKey: '#' + i.intent_key.toUpperCase(),
                    name: toDisplayName(i.intent_key),
                    color: getColor(i.intent_key),
                    keywords: Array.isArray(i.keywords) ? i.keywords : [],
                    responseText: i.response_text || '',
                    active: true,
                }));
                setIntents(mapped.length > 0 ? mapped : DEFAULT_INTENTS);
            } catch {
                setIntents(DEFAULT_INTENTS);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const notify = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2500);
    };

    const filtered = useMemo(() => intents.filter(i => {
        const q = search.toLowerCase();
        const matchSearch = !q || i.name.toLowerCase().includes(q) || i.intentKey.toLowerCase().includes(q) || i.keywords.some(k => k.toLowerCase().includes(q));
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? i.active : !i.active);
        return matchSearch && matchStatus;
    }), [intents, search, statusFilter]);

    const activeCount = intents.filter(i => i.active).length;

    const toggleActive = (id: string) => {
        const prev = intents.find(i => i.id === id);
        setIntents(intents.map(i => i.id === id ? { ...i, active: !i.active } : i));
        notify(`Intent ${!prev?.active ? 'activated' : 'deactivated'} ✓`);
    };

    const handleDelete = async (id: string, key: string) => {
        if (!confirm(`Delete ${key}? This cannot be undone.`)) return;
        try {
            const apiKey = key.replace('#', '');
            await api.delete(`/intents/${apiKey}`);
            setIntents(prev => prev.filter(i => i.id !== id));
            notify('Intent deleted ✓');
        } catch {
            notify('Delete failed', 'error');
        }
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const rawKey = (fd.get('intentKey') as string || '').trim();
        const keywordsRaw = (fd.get('keywords') as string || '').trim();
        const responseText = (fd.get('responseText') as string || '').trim();

        if (!rawKey || !keywordsRaw || !responseText) {
            notify('Please fill in all fields', 'error');
            return;
        }

        const intentKey = rawKey.startsWith('#') ? rawKey.toUpperCase() : '#' + rawKey.toUpperCase();
        const apiKey = intentKey.replace('#', '');
        const keywords = keywordsRaw.split(',').map(k => k.trim()).filter(Boolean);

        try {
            if (modal.mode === 'add') {
                const res = await api.post('/intents/', { intent_key: apiKey, keywords, response_text: responseText });
                const newIntent: Intent = {
                    id: res.data.id.toString(),
                    intentKey,
                    name: toDisplayName(apiKey),
                    color: getColor(apiKey),
                    keywords,
                    responseText,
                    active: true,
                };
                setIntents(prev => [...prev, newIntent]);
                notify('Intent created ✓');
            } else if (modal.data) {
                const oldApiKey = modal.data.intentKey.replace('#', '');
                await api.patch(`/intents/${oldApiKey}`, { intent_key: apiKey, keywords, response_text: responseText });
                setIntents(prev => prev.map(i => i.id === modal.data!.id
                    ? { ...i, intentKey, name: toDisplayName(apiKey), color: getColor(apiKey), keywords, responseText }
                    : i
                ));
                notify('Intent updated ✓');
            }
            setModal({ open: false, mode: 'add', data: null });
        } catch {
            notify('Operation failed — please try again', 'error');
        }
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(intents, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement('a'), { href: url, download: 'intents.json' }).click();
        notify('Exporting intents...');
    };

    return (
        <div className="ifp">
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* ── Topbar ─── */}
            <header className="topbar">
                <div className="topbar-l">
                    <div className="t-icon"><IcTarget /></div>
                    <div>
                        <h1 className="t-title">Settings & Intelligence</h1>
                        <span className="t-sub">GTD Service · Chatbot · Intent Framework</span>
                    </div>
                </div>
                <div className="topbar-r">
                    <button className="btn-secondary" onClick={handleExport}>
                        <IcDownload />
                        Export
                    </button>
                    <button className="btn-primary" onClick={() => setModal({ open: true, mode: 'add', data: null })}>
                        <IcPlus />
                        Add Intent
                    </button>
                </div>
            </header>

            <main className="content">
                {/* ── Stats Row (Live Data) ─── */}
                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-label">Active Intents</div>
                        <div className="stat-value">{loading ? '—' : activeCount}</div>
                        <div className="stat-delta d-up">↑ {intents.length} configured</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Active Visitors</div>
                        <div className="stat-value">{liveStats.active_visitors}</div>
                        <div className="stat-delta d-up">Live count</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Agent Chats</div>
                        <div className="stat-value">{liveStats.agent_chats}</div>
                        <div className="stat-delta d-up">Currently active</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Spam Blocked</div>
                        <div className="stat-value">{liveStats.spam_visitors}</div>
                        <div className={`stat-delta ${liveStats.spam_visitors > 0 ? 'd-up' : 'd-neutral'}`}>{liveStats.spam_visitors > 0 ? 'Threats detected' : 'No threats'}</div>
                    </div>
                </div>

                {/* ── Toolbar ─── */}
                <div className="toolbar">
                    <div className="search-wrap">
                        <span className="search-icon"><IcSearch /></span>
                        <input
                            className="search-input"
                            placeholder="Search intents, keywords..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button className={`btn-filter${statusFilter === 'all' ? ' active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
                    <button className={`btn-filter${statusFilter === 'active' ? ' active' : ''}`} onClick={() => setStatusFilter('active')}>Active</button>
                    <button className={`btn-filter${statusFilter === 'inactive' ? ' active' : ''}`} onClick={() => setStatusFilter('inactive')}>Inactive</button>
                    <button className="btn-filter" onClick={() => notify('Filters panel coming soon')}>
                        <IcFilter /> Filters
                    </button>
                    <span className="toolbar-count">{filtered.length} intent{filtered.length !== 1 ? 's' : ''}</span>
                </div>

                {/* ── Cards Grid ─── */}
                {filtered.length === 0 ? (
                    <div className="empty">
                        <IcSearch />
                        <p>No intents match your search.</p>
                        <button className="btn-secondary" onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear filters</button>
                    </div>
                ) : (
                    <div className="grid">
                        {filtered.map(intent => (
                            <div key={intent.id} className={`card${intent.active ? ' is-active' : ''}`}>
                                {/* Header */}
                                <div className="card-head">
                                    <div className="head-main">
                                        <div className={`i-icon ic-${intent.color}`}><IcTarget /></div>
                                        <div>
                                            <div className="meta-id">{intent.intentKey}</div>
                                            <div className="meta-name">{intent.name}</div>
                                        </div>
                                    </div>
                                    <button
                                        className={`toggle${intent.active ? ' on' : ''}`}
                                        onClick={() => toggleActive(intent.id)}
                                        title={intent.active ? 'Click to deactivate' : 'Click to activate'}
                                    >
                                        <div className="toggle-thumb" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="card-body">
                                    <div>
                                        <div className="sec-label">Primary Keywords</div>
                                        <div className="chips">
                                            {intent.keywords.slice(0, 4).map(kw => (
                                                <span key={kw} className="chip">{kw}</span>
                                            ))}
                                            {intent.keywords.length > 4 && (
                                                <span className="chip chip-more">+{intent.keywords.length - 4} more</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="sec-label">AI Response Preview</div>
                                        <div className="preview-box">{intent.responseText}</div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="card-footer">
                                    <button
                                        className="btn-secondary footer-btn"
                                        onClick={() => setModal({ open: true, mode: 'edit', data: intent })}
                                    >
                                        <IcPencil /> Edit
                                    </button>
                                    <div className="divider-v" />
                                    <button
                                        className="btn-secondary footer-btn"
                                        onClick={() => notify(`"${intent.keywords[0]}" → ${intent.responseText.slice(0, 40)}...`)}
                                    >
                                        <IcEye /> Preview
                                    </button>
                                    <div className="divider-v" />
                                    <button
                                        className="btn-danger-sm"
                                        onClick={() => handleDelete(intent.id, intent.intentKey)}
                                        title="Delete intent"
                                    >
                                        <IcTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Bot Personality ─── */}
                <section className="personality">
                    <h2>Bot Personality</h2>
                    <p>Define how the bot introduces itself and handles handover to human agents.</p>
                    <div className="personality-grid">
                        <div className="form-group">
                            <label className="form-label">Bot Name</label>
                            <input className="form-input" value={botName} onChange={e => setBotName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Handover Message</label>
                            <textarea className="form-textarea" value={handoffMsg} onChange={e => setHandoffMsg(e.target.value)} />
                        </div>
                        <div className="personality-save">
                            <button className="btn-primary" onClick={() => notify('Personality saved ✓')}>
                                <IcSave /> Save Personality
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            {/* ── Add / Edit Modal ─── */}
            {modal.open && (
                <div className="modal-overlay" onClick={() => setModal({ open: false, mode: 'add', data: null })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <header className="modal-head">
                            <h2>{modal.mode === 'add' ? 'Add New Intent' : `Edit ${modal.data?.intentKey}`}</h2>
                            <button className="btn-icon-sm" onClick={() => setModal({ open: false, mode: 'add', data: null })}>
                                <IcX />
                            </button>
                        </header>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Intent ID</label>
                                    <input
                                        name="intentKey"
                                        className="form-input form-mono"
                                        placeholder="#PRICING"
                                        defaultValue={modal.data?.intentKey ?? ''}
                                    />
                                    <span className="form-hint">Use #PREFIX format, e.g. #BUYER_SEARCH. Stored without # in the database.</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Primary Keywords</label>
                                    <input
                                        name="keywords"
                                        className="form-input"
                                        placeholder="price, cost, how much, fees"
                                        defaultValue={modal.data?.keywords.join(', ') ?? ''}
                                    />
                                    <span className="form-hint">Comma-separated. These trigger this intent in user messages.</span>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">AI Response</label>
                                    <textarea
                                        name="responseText"
                                        className="form-textarea"
                                        placeholder="I'd be happy to help with that..."
                                        defaultValue={modal.data?.responseText ?? ''}
                                    />
                                </div>
                            </div>
                            <footer className="modal-foot">
                                <button type="button" className="btn-secondary" onClick={() => setModal({ open: false, mode: 'add', data: null })}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    <IcSave /> Save Intent
                                </button>
                            </footer>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Toast ─── */}
            {toast && (
                <div className={`toast${toast.type === 'error' ? ' error' : ''}`}>
                    {toast.type === 'error' ? <IcAlert /> : <IcCheck />}
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
