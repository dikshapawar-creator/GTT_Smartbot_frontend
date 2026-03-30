'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Save, RotateCcw, ShieldAlert } from 'lucide-react';
import api from '@/config/api';
import IntentManager from '@/components/Dashboard/IntentManager';
import BotConfigSettings from '@/components/Dashboard/BotConfigSettings';
import EmailSettings from '@/components/Dashboard/EmailSettings';
import { auth } from '@/lib/auth';
import { useTenant } from '@/context/TenantContext';

function AccessDenied() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
            <ShieldAlert size={48} color="var(--cda)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Access Denied</h2>
            <p style={{ color: 'var(--ctm)', fontSize: '14px' }}>You do not have permission to access the Settings page.</p>
        </div>
    );
}

type TabType = 'general' | 'chatbot' | 'branding' | 'leads' | 'email' | 'security';

// ── LS Keys ────────────────────────────────────────────────────────────
const LS = {
    general: 'gtt_settings_general',
    notifs: 'gtt_settings_notifs',
    leads: 'gtt_settings_leads',
    leadToggles: 'gtt_settings_lead_toggles',
    securityToggles: 'gtt_settings_security_toggles',
    blockedIPs: 'gtt_settings_blocked_ips',
};

function loadLS<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLS(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)); }

// ── Scoped CSS (same design system as IntentManager) ─────────────────

const CSS = `
.sp{--cp:#2B2A9B;--cph:#1e1d7a;--cpl:#ede9fe;--ca:#5b21b6;--cal:#c4b5fd;--cbg:#f5f4f0;--cbgc:#ffffff;--cbgs:#f8f7f4;--ct:#1a1a1a;--cts:#6b6b6b;--ctm:#9ca3af;--cb:rgba(0,0,0,0.10);--cbf:#5b21b6;--csu:#16a34a;--cda:#dc2626; font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:var(--ct);min-height:100vh;background:var(--cbg);display:flex;flex-direction:column;}
.sp button{cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px;font-weight:500;outline:none;font-family:inherit;}
.sp button:active{transform:scale(0.98);}
.sp .btn-primary{background:var(--cp);color:#fff;border:none;border-radius:8px;padding:7px 16px;height:34px;font-size:13px;}
.sp .btn-primary:hover{background:var(--cph);}
.sp .btn-secondary{background:#fff;border:1px solid #d1d5db;color:var(--ct);border-radius:8px;padding:7px 14px;height:34px;font-size:13px;}
.sp .btn-secondary:hover{background:#f9fafb;border-color:#b0b0b0;}
.sp .btn-danger{background:#fee2e2;border:1px solid #fca5a5;color:var(--cda);border-radius:8px;padding:7px 14px;height:34px;font-size:13px;}
.sp .btn-danger:hover{filter:brightness(0.93);}
.sp .topbar{height:56px;background:#fff;border-bottom:.5px solid var(--cb);display:flex;align-items:center;justify-content:space-between;padding:0 24px;width:100%;box-sizing:border-box;position:sticky;top:0;z-index:50;}
.sp .t-icon{width:32px;height:32px;background:var(--cpl);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--ca);flex-shrink:0;}
.sp .t-title{font-size:15px;font-weight:500;line-height:1.2;margin:0;}
.sp .t-sub{font-size:11px;color:var(--ctm);display:block;line-height:1.2;}
.sp .tab-bar{background:#fff;border-bottom:.5px solid var(--cb);display:flex;align-items:center;gap:0;padding:0 24px;height:44px;}
.sp .tab-btn{height:100%;padding:0 16px;border:none;background:transparent;border-bottom:2px solid transparent;font-size:13px;font-weight:400;color:var(--cts);cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .2s;white-space:nowrap;}
.sp .tab-btn.active{border-bottom:2px solid var(--cp);color:var(--cp);font-weight:500;}
.sp .tab-btn:hover:not(.active){background:rgba(0,0,0,.03);}
.sp .breadcrumb{padding:12px 24px;font-size:11px;color:var(--ctm);text-transform:uppercase;letter-spacing:.05em;}
.sp .content{flex:1;overflow-y:auto;padding-bottom:80px;}
.sp .section{max-width:1280px;margin:0 auto;padding:8px 24px 32px;}
.sp .section-card{background:#fff;border:.5px solid var(--cb);border-radius:12px;overflow:hidden;margin-bottom:20px;}
.sp .section-head{padding:16px 20px;border-bottom:.5px solid var(--cb);display:flex;align-items:center;justify-content:space-between;}
.sp .section-head h2{margin:0;font-size:15px;font-weight:500;color:var(--ct);}
.sp .section-head p{margin:2px 0 0;font-size:12px;color:var(--ctm);}
.sp .section-body{padding:20px;}
.sp .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
.sp .form-row.full{grid-template-columns:1fr;}
.sp .form-group{display:flex;flex-direction:column;gap:4px;}
.sp .form-label{font-size:11px;font-weight:500;color:var(--cts);text-transform:uppercase;letter-spacing:.04em;}
.sp .form-input,.sp .form-textarea,.sp .form-select{background:var(--cbgs);border:.5px solid #d1d5db;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;font-family:inherit;width:100%;box-sizing:border-box;color:var(--ct);}
.sp .form-input:focus,.sp .form-textarea:focus,.sp .form-select:focus{border:1px solid var(--cbf);background:#fff;}
.sp .form-textarea{min-height:72px;resize:vertical;}
.sp .form-hint{font-size:11px;color:var(--ctm);margin-top:2px;}
.sp .toggle-row{display:flex;align-items:flex-start;justify-content:space-between;padding:14px 0;border-bottom:.5px solid var(--cb);gap:24px;}
.sp .toggle-row:last-child{border-bottom:none;padding-bottom:0;}
.sp .toggle-info{flex:1;}
.sp .toggle-info strong{font-size:13px;font-weight:500;display:block;margin-bottom:2px;}
.sp .toggle-info span{font-size:12px;color:var(--ctm);}
.sp .toggle{width:36px;height:20px;border-radius:999px;position:relative;cursor:pointer;transition:background .2s;border:none;background:#d1d5db;flex-shrink:0;}
.sp .toggle.on{background:var(--ca);}
.sp .toggle-thumb{width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2);}
.sp .toggle.on .toggle-thumb{transform:translateX(16px);}
.sp .divider{height:.5px;background:var(--cb);margin:16px 0;}
.sp .section-footer{padding:16px 20px;border-top:.5px solid var(--cb);background:var(--cbgs);display:flex;justify-content:flex-end;gap:8px;}
.sp .status-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:500;}
.sp .badge-green{background:#dcfce7;color:#15803d;}
.sp .badge-red{background:#fee2e2;color:var(--cda);}
.sp .badge-yellow{background:#fef9c3;color:#a16207;}
.sp .alert-box{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:8px;margin-bottom:8px;}
.sp .alert-danger{background:#fee2e2;border:.5px solid #fca5a5;}
.sp .alert-success{background:#dcfce7;border:.5px solid #86efac;}
.sp .alert-warn{background:#fef9c3;border:.5px solid #fde047;}
.sp .alert-box strong{font-size:13px;font-weight:500;display:block;margin-bottom:2px;}
.sp .alert-box span{font-size:12px;color:var(--cts);}
.sp .blocked-list{display:flex;flex-direction:column;gap:8px;}
.sp .blocked-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--cbgs);border:.5px solid var(--cb);border-radius:8px;}
.sp .blocked-item span{font-size:12px;color:var(--ct);}
.sp .tag{padding:2px 8px;background:#f3f4f6;border:.5px solid #e5e7eb;border-radius:999px;font-size:11px;color:var(--cts);}
.sp .status-bar{position:fixed;bottom:0;left:0;right:0;height:52px;background:#fff;border-top:.5px solid var(--cb);display:flex;align-items:center;justify-content:space-between;padding:0 24px;z-index:40;}
.sp .status-left{display:flex;align-items:center;gap:8px;}
.sp .status-dot{width:6px;height:6px;border-radius:50%;background:#16a34a;}
.sp .status-text{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ctm);}
@media(max-width:768px){.sp .form-row{grid-template-columns:1fr;}}
`;

// ── Toggle Component ──────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button className={`toggle${value ? ' on' : ''}`} onClick={() => onChange(!value)} type="button">
            <div className="toggle-thumb" />
        </button>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function SettingsPage() {
    const { currentTenantName } = useTenant();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('chatbot');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2000); };
    const handleSave = () => { setIsSaving(true); setTimeout(() => { setIsSaving(false); notify('Settings saved ✓'); }, 800); };

    if (!mounted) return null;

    if (!auth.isManager()) {
        return <div className="sp"><style dangerouslySetInnerHTML={{ __html: CSS }} /><AccessDenied /></div>;
    }

    const tabs: { key: TabType; label: string; emoji: string }[] = [
        { key: 'general', label: 'General', emoji: '⚙' },
        { key: 'chatbot', label: 'Intents', emoji: '🤖' },
        { key: 'branding', label: 'Branding', emoji: '🎨' },
        { key: 'leads', label: 'Lead Rules', emoji: '👥' },
        ...(auth.isSuperAdmin() ? [{ key: 'email' as TabType, label: 'Email Server', emoji: '✉️' }] : []),
        { key: 'security', label: 'Security', emoji: '🔒' },
    ];

    return (
        <div className="sp">
            <style dangerouslySetInnerHTML={{ __html: CSS }} />

            {/* Topbar */}
            <header className="topbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="t-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="t-title">Settings & Intelligence</h1>
                        <span className="t-sub">{currentTenantName} · {tabs.find(t => t.key === activeTab)?.label}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" onClick={() => notify('Export triggered')}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Export
                    </button>
                    {activeTab !== 'chatbot' && activeTab !== 'branding' && (
                        <button className="btn-primary" onClick={handleSave}>
                            {isSaving ? (
                                <><Activity size={13} className="animate-spin" />Saving...</>
                            ) : (
                                <><Save size={13} />Save Changes</>
                            )}
                        </button>
                    )}
                </div>
            </header>

            {/* Tab Bar */}
            <nav className="tab-bar">
                {tabs.map(t => (
                    <button key={t.key} className={`tab-btn${activeTab === t.key ? ' active' : ''}`} onClick={() => setActiveTab(t.key)}>
                        <span>{t.emoji}</span>{t.label}
                    </button>
                ))}
            </nav>

            {/* Breadcrumb */}
            <div className="breadcrumb">
                {currentTenantName} &gt; {tabs.find(t => t.key === activeTab)?.label}
            </div>

            {/* Content */}
            <div className="content">
                {activeTab === 'chatbot' && <IntentManager />}
                {activeTab === 'branding' && <BotConfigSettings />}
                {activeTab === 'general' && <GeneralTab notify={notify} />}
                {activeTab === 'leads' && <LeadRulesTab notify={notify} />}
                {activeTab === 'email' && <EmailSettings />}
                {activeTab === 'security' && <SecurityTab notify={notify} />}
            </div>

            {/* Workspace Status Bar */}
            <div className="status-bar">
                <div className="status-left">
                    <div className="status-dot" style={{ animation: 'pulse 2s infinite' }} />
                    <span className="status-text">Workspace is up to date</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-secondary" onClick={() => { localStorage.clear(); window.location.reload(); }}>
                        <RotateCcw size={13} /> Reset All
                    </button>
                    {activeTab !== 'chatbot' && activeTab !== 'branding' && (
                        <button className="btn-primary" onClick={handleSave}>
                            {isSaving ? <Activity size={13} className="animate-spin" /> : <Save size={13} />}
                            {isSaving ? 'Saving...' : 'Save & Sync'}
                        </button>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: 70, right: 24, background: '#1a1a1a', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 999, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(0,0,0,.25)', animation: 'tIn .25s ease' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {toast}
                </div>
            )}
        </div>
    );
}

// ── General Tab (Persisted to localStorage) ───────────────────────────

interface GeneralData {
    companyName: string;
    supportEmail: string;
    contactNum: string;
    website: string;
    description: string;
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
}

const DEFAULT_GENERAL: GeneralData = {
    companyName: 'GTD Service',
    supportEmail: 'support@gtdservice.com',
    contactNum: '+1 (555) 000-0000',
    website: 'https://gtdservice.com',
    description: 'GTD Service specializes in global trade data intelligence and B2B import-export analytics.',
    timezone: 'IST',
    language: 'en-us',
    dateFormat: 'DD/MM/YYYY',
    currency: 'USD',
};

interface NotifPref { label: string; desc: string; key: string; }
const NOTIF_ITEMS: NotifPref[] = [
    { label: 'New Hot Lead Detected', desc: 'Notify when a visitor crosses the lead score threshold.', key: 'notif_hot_lead' },
    { label: 'Agent Chat Requests', desc: 'Notify when a visitor requests to speak with a human agent.', key: 'notif_agent_req' },
    { label: 'Bot Unmatched Queries', desc: 'Notify when the bot cannot match a user message to an intent.', key: 'notif_unmatched' },
    { label: 'Weekly Summary Report', desc: 'Receive a weekly digest of chatbot performance metrics.', key: 'notif_weekly' },
    { label: 'System Alerts', desc: 'Critical platform errors and downtime notifications.', key: 'notif_system' },
];
const DEFAULT_NOTIFS: Record<string, boolean> = {
    notif_hot_lead: true, notif_agent_req: true, notif_unmatched: false, notif_weekly: true, notif_system: true,
};

function GeneralTab({ notify }: { notify: (msg: string) => void }) {
    const [data, setData] = useState<GeneralData>(() => loadLS(LS.general, DEFAULT_GENERAL));
    const [notifs, setNotifs] = useState<Record<string, boolean>>(() => loadLS(LS.notifs, DEFAULT_NOTIFS));

    // Remove the useEffect doing setState since initialization now handles it.

    const saveGeneral = () => { saveLS(LS.general, data); notify('Workspace identity saved ✓'); };
    const saveLocalization = () => { saveLS(LS.general, data); notify('Localization saved ✓'); };
    const saveNotifs = () => { saveLS(LS.notifs, notifs); notify('Notification preferences saved ✓'); };
    const updateField = (key: keyof GeneralData, val: string) => setData(prev => ({ ...prev, [key]: val }));
    const toggleNotif = (key: string) => setNotifs(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="section">
            {/* Workspace Identity */}
            <div className="section-card">
                <div className="section-head">
                    <div>
                        <h2>Workspace Identity</h2>
                        <p>Basic information about your enterprise workspace.</p>
                    </div>
                </div>
                <div className="section-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input className="form-input" value={data.companyName} onChange={e => updateField('companyName', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Support Email</label>
                            <input className="form-input" type="email" value={data.supportEmail} onChange={e => updateField('supportEmail', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Contact Number</label>
                            <input className="form-input" type="tel" value={data.contactNum} onChange={e => updateField('contactNum', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Website URL</label>
                            <input className="form-input" type="url" value={data.website} onChange={e => updateField('website', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-row full">
                        <div className="form-group">
                            <label className="form-label">Company Description</label>
                            <textarea className="form-textarea" value={data.description} onChange={e => updateField('description', e.target.value)} />
                            <span className="form-hint">Displayed in bot conversations and public-facing pages.</span>
                        </div>
                    </div>
                </div>
                <div className="section-footer">
                    <button className="btn-primary" onClick={saveGeneral}>
                        <Save size={13} /> Save Identity
                    </button>
                </div>
            </div>

            {/* Localization */}
            <div className="section-card">
                <div className="section-head">
                    <div>
                        <h2>Regional Localization</h2>
                        <p>Configure time zone, language, and date formats.</p>
                    </div>
                </div>
                <div className="section-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Time Zone</label>
                            <select className="form-select" value={data.timezone} onChange={e => updateField('timezone', e.target.value)}>
                                <option value="UTC">UTC (Coordinated Universal Time)</option>
                                <option value="IST">IST (Indian Standard Time, UTC+5:30)</option>
                                <option value="EST">EST (Eastern Standard Time, UTC-5)</option>
                                <option value="PST">PST (Pacific Standard Time, UTC-8)</option>
                                <option value="CET">CET (Central European Time, UTC+1)</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Language</label>
                            <select className="form-select" value={data.language} onChange={e => updateField('language', e.target.value)}>
                                <option value="en-us">English (US)</option>
                                <option value="en-uk">English (UK)</option>
                                <option value="hi">Hindi</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date Format</label>
                            <select className="form-select" value={data.dateFormat} onChange={e => updateField('dateFormat', e.target.value)}>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Currency Display</label>
                            <select className="form-select" value={data.currency} onChange={e => updateField('currency', e.target.value)}>
                                <option value="USD">USD ($)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="section-footer">
                    <button className="btn-primary" onClick={saveLocalization}>
                        <Save size={13} /> Save Localization
                    </button>
                </div>
            </div>

            {/* Notifications */}
            <div className="section-card">
                <div className="section-head">
                    <div>
                        <h2>Notification Preferences</h2>
                        <p>Control what events trigger email and in-app alerts.</p>
                    </div>
                </div>
                <div className="section-body">
                    {NOTIF_ITEMS.map(item => (
                        <div key={item.key} className="toggle-row">
                            <div className="toggle-info">
                                <strong>{item.label}</strong>
                                <span>{item.desc}</span>
                            </div>
                            <Toggle value={!!notifs[item.key]} onChange={() => toggleNotif(item.key)} />
                        </div>
                    ))}
                </div>
                <div className="section-footer">
                    <button className="btn-primary" onClick={saveNotifs}>
                        <Save size={13} /> Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Lead Rules Tab (Persisted) ────────────────────────────────────────

interface LeadScoring {
    hotThreshold: number;
    coldThreshold: number;
    scorePerMessage: number;
    scoreForForm: number;
}
const DEFAULT_LEAD_SCORING: LeadScoring = { hotThreshold: 70, coldThreshold: 30, scorePerMessage: 5, scoreForForm: 25 };

interface LeadToggle { label: string; desc: string; key: string; }
const LEAD_TOGGLE_ITEMS: LeadToggle[] = [
    { label: 'Email Alert on Hot Lead', desc: 'Instantly email the team when a Hot Lead is detected.', key: 'lt_email_alert' },
    { label: 'CRM Auto-Sync', desc: 'Automatically push all captured leads to the CRM database.', key: 'lt_crm_sync' },
    { label: 'Auto-Assign to Agent', desc: 'Route hot leads to the next available human agent.', key: 'lt_auto_assign' },
    { label: 'Duplicate Lead Detection', desc: 'Prevent the same visitor from creating multiple lead records.', key: 'lt_dupe_detect' },
];
const DEFAULT_LEAD_TOGGLES: Record<string, boolean> = { lt_email_alert: true, lt_crm_sync: true, lt_auto_assign: false, lt_dupe_detect: true };

function LeadRulesTab({ notify }: { notify: (msg: string) => void }) {
    const [scoring, setScoring] = useState<LeadScoring>(() => loadLS(LS.leads, DEFAULT_LEAD_SCORING));
    const [toggles, setToggles] = useState<Record<string, boolean>>(() => loadLS(LS.leadToggles, DEFAULT_LEAD_TOGGLES));

    // Initialization handled by the useState initializer.

    const saveScoring = () => { saveLS(LS.leads, scoring); notify('Lead scoring rules saved ✓'); };
    const saveToggles = () => { saveLS(LS.leadToggles, toggles); notify('Automation settings saved ✓'); };
    const toggleItem = (key: string) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="section">
            {/* Lead Scoring */}
            <div className="section-card">
                <div className="section-head">
                    <div>
                        <h2>Lead Scoring Rules</h2>
                        <p>Define score thresholds and classification rules for visitor leads.</p>
                    </div>
                </div>
                <div className="section-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Hot Lead Threshold</label>
                            <input className="form-input" type="number" value={scoring.hotThreshold} min={0} max={100} onChange={e => setScoring(p => ({ ...p, hotThreshold: +e.target.value }))} />
                            <span className="form-hint">Score above this marks a visitor as a Hot Lead.</span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cold Lead Threshold</label>
                            <input className="form-input" type="number" value={scoring.coldThreshold} min={0} max={100} onChange={e => setScoring(p => ({ ...p, coldThreshold: +e.target.value }))} />
                            <span className="form-hint">Score below this marks a visitor as a Cold Lead.</span>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Score per Message</label>
                            <input className="form-input" type="number" value={scoring.scorePerMessage} onChange={e => setScoring(p => ({ ...p, scorePerMessage: +e.target.value }))} />
                            <span className="form-hint">Points added per chat message sent.</span>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Score for Form Completion</label>
                            <input className="form-input" type="number" value={scoring.scoreForForm} onChange={e => setScoring(p => ({ ...p, scoreForForm: +e.target.value }))} />
                            <span className="form-hint">Points added when visitor completes lead form.</span>
                        </div>
                    </div>
                </div>
                <div className="section-footer">
                    <button className="btn-primary" onClick={saveScoring}>
                        <Save size={13} /> Save Scoring Rules
                    </button>
                </div>
            </div>

            {/* Lead Automation */}
            <div className="section-card">
                <div className="section-head">
                    <div>
                        <h2>Automation</h2>
                        <p>Configure automatic actions triggered by lead events.</p>
                    </div>
                </div>
                <div className="section-body">
                    {LEAD_TOGGLE_ITEMS.map(item => (
                        <div key={item.key} className="toggle-row">
                            <div className="toggle-info">
                                <strong>{item.label}</strong>
                                <span>{item.desc}</span>
                            </div>
                            <Toggle value={!!toggles[item.key]} onChange={() => toggleItem(item.key)} />
                        </div>
                    ))}
                </div>
                <div className="section-footer">
                    <button className="btn-primary" onClick={saveToggles}>
                        <Save size={13} /> Save Automation
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Security Tab (Persisted + Live backend stats) ─────────────────────

interface SecToggle { label: string; desc: string; key: string; }
const SEC_TOGGLE_ITEMS: SecToggle[] = [
    { label: 'IP Rate Limiting', desc: 'Prevent repeated requests from the same IP within a short window.', key: 'sec_rate_limit' },
    { label: 'Spam Keyword Filter', desc: 'Block messages containing known spam or offensive keywords.', key: 'sec_spam_filter' },
    { label: 'Bot Traffic Detection', desc: 'Identify and block automated scraper or bot connections.', key: 'sec_bot_detect' },
    { label: 'Session Fingerprinting', desc: 'Track visitor sessions using browser fingerprint for fraud detection.', key: 'sec_fingerprint' },
    { label: 'Geo-Restriction Mode', desc: 'Limit access to visitors from specific countries or regions.', key: 'sec_geo_restrict' },
    { label: 'Two-Factor Admin Auth', desc: 'Require 2FA for all admin and agent logins to the CRM.', key: 'sec_2fa' },
];
const DEFAULT_SEC_TOGGLES: Record<string, boolean> = {
    sec_rate_limit: true, sec_spam_filter: true, sec_bot_detect: true,
    sec_fingerprint: false, sec_geo_restrict: false, sec_2fa: true,
};

interface BlockedIP { id?: number; ip: string; reason: string; time: string; }

function SecurityTab({ notify }: { notify: (msg: string) => void }) {
    const [secToggles, setSecToggles] = useState<Record<string, boolean>>(() => loadLS(LS.securityToggles, DEFAULT_SEC_TOGGLES));
    const [blocked, setBlocked] = useState<BlockedIP[]>([]);
    const [ipInput, setIpInput] = useState('');
    const [editId, setEditId] = useState<number | null>(null);
    const [editReason, setEditReason] = useState('');
    const [liveStats, setLiveStats] = useState<{ active_visitors: number; spam_visitors: number }>({ active_visitors: 0, spam_visitors: 0 });

    useEffect(() => {
        const init = async () => {
            try {
                // Fetch stats
                const sRes = await api.get('/live-chat/analytics');
                if (sRes.data) setLiveStats(sRes.data);

                // Fetch blocked
                const bRes = await api.get('/admin/security/blocked-ips');
                if (bRes.data) setBlocked(bRes.data);
            } catch { /* fail silently */ }
        };
        init();
    }, []);

    const saveToggles = () => { saveLS(LS.securityToggles, secToggles); notify('Security settings saved ✓'); };
    const toggleItem = (key: string) => setSecToggles(prev => ({ ...prev, [key]: !prev[key] }));

    const addIP = async () => {
        if (!ipInput.trim()) return;
        try {
            await api.post('/admin/security/block-ip', { ip: ipInput.trim(), reason: 'Manual block' });
            setIpInput('');
            const res = await api.get('/admin/security/blocked-ips');
            if (res.data) setBlocked(res.data);
            notify('IP blocked ✓');
        } catch {
            notify('Failed to block IP');
        }
    };

    const removeIP = async (id?: number) => {
        if (!id) return;
        if (!confirm('Unblock this IP?')) return;
        try {
            await api.delete(`/admin/security/unblock-ip/${id}`);
            const res = await api.get('/admin/security/blocked-ips');
            if (res.data) setBlocked(res.data);
            notify('IP unblocked ✓');
        } catch {
            notify('Failed to unblock IP');
        }
    };

    const startEdit = (b: BlockedIP) => {
        setEditId(b.id ?? null);
        setEditReason(b.reason);
    };

    const saveEdit = async () => {
        if (editId === null) return;
        try {
            await api.patch(`/admin/security/block-ip/${editId}`, { reason: editReason });
            setEditId(null);
            const res = await api.get('/admin/security/blocked-ips');
            if (res.data) setBlocked(res.data);
            notify('Reason updated ✓');
        } catch {
            notify('Update failed');
        }
    };

    return (
        <div className="section">
            {/* System Status — Live */}
            <div className="section-card">
                <div className="section-head">
                    <div><h2>System Security Status</h2><p>Real-time status from your backend services.</p></div>
                </div>
                <div className="section-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                        {[
                            { label: 'Firewall', status: secToggles.sec_rate_limit ? 'Active' : 'Disabled', badge: secToggles.sec_rate_limit ? 'badge-green' : 'badge-red' },
                            { label: 'Rate Limiting', status: secToggles.sec_rate_limit ? 'Active' : 'Disabled', badge: secToggles.sec_rate_limit ? 'badge-green' : 'badge-red' },
                            { label: 'Spam Filter', status: secToggles.sec_spam_filter ? 'Active' : 'Disabled', badge: secToggles.sec_spam_filter ? 'badge-green' : 'badge-red' },
                            { label: 'IP Blocklist', status: `${blocked.length} entries`, badge: blocked.length > 0 ? 'badge-yellow' : 'badge-green' },
                            { label: 'Spam Detected', status: `${liveStats.spam_visitors} sessions`, badge: liveStats.spam_visitors > 0 ? 'badge-red' : 'badge-green' },
                            { label: 'Session Validation', status: secToggles.sec_fingerprint ? 'Active' : 'Passive', badge: 'badge-green' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'var(--cbgs)', border: '.5px solid var(--cb)', borderRadius: 8, padding: '12px 14px' }}>
                                <div style={{ fontSize: 11, color: 'var(--ctm)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>{s.label}</div>
                                <span className={`status-badge ${s.badge}`}>{s.status}</span>
                            </div>
                        ))}
                    </div>
                    <div className={`alert-box ${liveStats.spam_visitors > 0 ? 'alert-warn' : 'alert-success'}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={liveStats.spam_visitors > 0 ? '#a16207' : '#15803d'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <div>
                            <strong>{liveStats.spam_visitors > 0 ? `${liveStats.spam_visitors} spam session(s) detected.` : 'All security systems operational.'}</strong>
                            <span>{liveStats.active_visitors} active visitor sessions right now.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Controls — Persisted */}
            <div className="section-card">
                <div className="section-head">
                    <div><h2>Security Controls</h2><p>Toggle protection layers. Settings persist across sessions.</p></div>
                </div>
                <div className="section-body">
                    {SEC_TOGGLE_ITEMS.map(item => (
                        <div key={item.key} className="toggle-row">
                            <div className="toggle-info">
                                <strong>{item.label}</strong>
                                <span>{item.desc}</span>
                            </div>
                            <Toggle value={!!secToggles[item.key]} onChange={() => toggleItem(item.key)} />
                        </div>
                    ))}
                </div>
                <div className="section-footer">
                    <button className="btn-primary" onClick={saveToggles}>
                        <Save size={13} /> Save Controls
                    </button>
                </div>
            </div>

            {/* Blocked IPs — Persisted */}
            <div className="section-card">
                <div className="section-head">
                    <div><h2>Blocked IP Addresses</h2><p>Manually block specific IPs from accessing your chatbot.</p></div>
                </div>
                <div className="section-body">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <input
                            className="form-input"
                            placeholder="Enter IP address to block, e.g. 192.168.1.1"
                            style={{ flex: 1 }}
                            value={ipInput}
                            onChange={e => setIpInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addIP()}
                        />
                        <button className="btn-danger" onClick={addIP}>Block IP</button>
                    </div>
                    <div className="blocked-list">
                        {blocked.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--cb)', textAlign: 'left', color: 'var(--ctm)' }}>
                                        <th style={{ padding: '8px 4px', fontWeight: 500 }}>IP Address</th>
                                        <th style={{ padding: '8px 4px', fontWeight: 500 }}>Reason</th>
                                        <th style={{ padding: '8px 4px', fontWeight: 500 }}>Blocked At</th>
                                        <th style={{ padding: '8px 4px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {blocked.map((b) => (
                                        <tr key={b.id} style={{ borderBottom: '.5px solid var(--cb)' }}>
                                            <td style={{ padding: '12px 4px' }}>
                                                <code style={{ background: '#f3f4f6', padding: '2px 4px', borderRadius: 4 }}>{b.ip}</code>
                                            </td>
                                            <td style={{ padding: '12px 4px' }}>
                                                {editId === b.id ? (
                                                    <input
                                                        className="form-input"
                                                        style={{ height: 28, padding: '2px 8px' }}
                                                        value={editReason}
                                                        onChange={e => setEditReason(e.target.value)}
                                                        onBlur={saveEdit}
                                                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={{ color: 'var(--cts)' }}>{b.reason}</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '12px 4px', color: 'var(--ctm)', fontSize: '11px' }}>
                                                {new Date(b.time).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '12px 4px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn-secondary"
                                                        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}
                                                        onClick={() => startEdit(b)}
                                                        title="Edit Reason"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn-danger"
                                                        style={{ width: 32, height: 32, padding: 0, justifyContent: 'center', background: '#fee2e2' }}
                                                        onClick={() => removeIP(b.id)}
                                                        title="Unblock IP"
                                                    >
                                                        ❌
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {blocked.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '32px', fontSize: '13px', color: 'var(--ctm)', background: 'var(--cbgs)', borderRadius: 12 }}>
                                No blocked IPs — your chatbot is accessible to everyone.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
