'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import styles from './Dashboard.module.css';

import { auth } from '@/lib/auth';
import { api } from '@/lib/api';

import {
    LayoutDashboard,
    Users,
    Clock,
    Settings,
    Contact2,
    Bell,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Plus,
    MessageCircle,
    Activity,
    UserPlus
} from 'lucide-react';

const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', href: '/crm/dashboard' },
    { icon: <Contact2 size={20} />, label: 'Captured Leads', href: '/crm/dashboard/leads' },
    { icon: <Users size={20} />, label: 'User Management', href: '/crm/users', adminOnly: true },
    { icon: <Clock size={20} />, label: 'Conversation History', href: '/crm/dashboard/history' },
    { icon: <MessageCircle size={20} />, label: 'Live Conversations', href: '/crm/dashboard/live-chat' },
    { icon: <Settings size={20} />, label: 'Settings', href: '/crm/dashboard/settings' },
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const revenueData = [55, 70, 60, 85, 72, 90, 78, 95, 82, 100, 88, 105];
const maxVal = Math.max(...revenueData);

interface DashboardStats {
    kpis: {
        total_leads: number;
        new_leads: number;
        active_chats: number;
        total_messages: number;
    };
    recent_leads: Array<{
        id: string;
        name: string;
        email: string;
        company: string;
        status: string;
        created_at: string;
    }>;
    recent_sessions: Array<{
        session_id: string;
        client_ip: string;
        country: string;
        status: string;
        last_activity: string;
        mode: string;
    }>;
}

export default function Dashboard({ children }: { children?: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [profileOpen, setProfileOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await api.get<DashboardStats>("/admin/stats");
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setStatsLoading(false);
        }
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff}m ago`;
        const hours = Math.floor(diff / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarLogo}>
                        <Image
                            src="/logo.png"
                            alt="GTD Service"
                            width={collapsed ? 36 : 140}
                            height={36}
                            className="object-contain inverted-logo"
                            priority
                            style={{ width: "auto" }}
                        />
                    </div>
                    <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                    </button>
                </div>

                <nav className={styles.sidebarNav}>
                    {mounted && navItems.filter(item => !item.adminOnly || auth.isAdmin()).map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Link key={item.label} href={item.href} className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}>
                                <span className={styles.navIcon}>{item.icon}</span>
                                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.sidebarFooter}>
                    {!collapsed && (
                        <div className={styles.userCard} onClick={() => setProfileOpen(!profileOpen)}>
                            <div className={styles.userAvatar}>HK</div>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>
                                    {mounted ? (auth.getUser()?.email || 'Harsh Kumar') : 'Harsh Kumar'}
                                </span>
                                <span className={styles.userRole}>
                                    {mounted ? (auth.getUser()?.role || 'Admin') : 'Admin'}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />

                            {profileOpen && (
                                <div className={styles.profileDropdown}>
                                    <button onClick={() => { auth.clearSession(); window.location.reload(); }} className={styles.dropdownOption}>
                                        <LogOut size={14} />
                                        <span>Logout</span>
                                    </button>
                                    <button onClick={() => { auth.clearSession(); window.location.href = '/signin'; }} className={styles.dropdownOption}>
                                        <UserPlus size={14} />
                                        <span>Sign in to another account</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {collapsed && (
                        <div className="flex flex-col items-center gap-4">
                            <div className={styles.userAvatarSm}>HK</div>
                            <button onClick={() => { auth.clearSession(); window.location.reload(); }} className="text-slate-400 hover:text-red-500 transition-colors">
                                <LogOut size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </aside >

            {/* Main Content */}
            < div className={styles.main} >
                {/* Top Header */}
                < header className={styles.header} >
                    <div className={styles.headerLeft}>
                        <div className={styles.searchWrap}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.searchIcon}>
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input className={styles.searchInput} type="text" placeholder="Search leads, sessions, history..." />
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.orgSwitcher}>
                            <span>GTD Service</span>
                            <ChevronDown size={14} className="text-slate-400" />
                        </div>
                        <div className={styles.notifWrap}>
                            <button className={styles.iconBtn} onClick={() => setNotifOpen(!notifOpen)}>
                                <Bell size={18} />
                                <span className={styles.notifBadge}>3</span>
                            </button>
                        </div>
                        <div className={styles.userProfile} onClick={() => setProfileOpen(!profileOpen)}>
                            <div className={styles.profileAvatar}>HK</div>
                            <div className={styles.profileInfo}>
                                <span className={styles.profileName}>
                                    {mounted ? (auth.getUser()?.email || 'Harsh Kumar') : 'Harsh Kumar'}
                                </span>
                                <span className={styles.profileRole}>
                                    {mounted ? (auth.getUser()?.role || 'Administrator') : 'Administrator'}
                                </span>
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 ml-1 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />

                            {profileOpen && (
                                <div className={styles.headerProfileDropdown}>
                                    <button onClick={() => { auth.clearSession(); window.location.reload(); }} className={styles.dropdownOption}>
                                        <LogOut size={14} />
                                        <span>Logout</span>
                                    </button>
                                    <button onClick={() => { auth.clearSession(); window.location.href = '/signin'; }} className={styles.dropdownOption}>
                                        <UserPlus size={14} />
                                        <span>Sign in to another account</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header >

                {/* Page Content */}
                < div className={styles.content} >
                    {pathname === '/crm/dashboard' ? (
                        <>
                            {/* Page Title */}
                            <div className={styles.pageTitle}>
                                <div>
                                    <h1 className={styles.pageTitleText}>Dashboard</h1>
                                    <p className={styles.pageTitleSub}>Welcome back, {auth.getUser()?.email?.split('@')[0] || 'Harsh'}. Here is your real-time analytics.</p>
                                </div>
                                <div className={styles.pageTitleActions}>
                                    <Button onClick={fetchStats} variant="outline" size="sm" className="gap-2">
                                        <Activity size={14} />
                                        Refresh Data
                                    </Button>
                                    <Button onClick={() => window.location.href = '/crm/dashboard/leads'} size="sm" className="gap-2 shadow-md shadow-primary/20">
                                        <Plus size={14} />
                                        View All Leads
                                    </Button>
                                </div>
                            </div>

                            {/* KPI Cards */}
                            <div className={styles.kpiGrid}>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={styles.kpiLabel}>Total Leads</span>
                                        <span className={`${styles.kpiChange} ${styles.changeUp}`}>Real-time</span>
                                    </div>
                                    <div className={styles.kpiValue}>{statsLoading ? "..." : stats?.kpis.total_leads || 0}</div>
                                    <div className={styles.kpiSub}>Non-deleted leads in DB</div>
                                </div>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={styles.kpiLabel}>New Leads</span>
                                        <span className={`${styles.kpiChange} ${styles.changeUp}`}>Active</span>
                                    </div>
                                    <div className={styles.kpiValue}>{statsLoading ? "..." : stats?.kpis.new_leads || 0}</div>
                                    <div className={styles.kpiSub}>Awaiting follow-up</div>
                                </div>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={styles.kpiLabel}>Active Chats</span>
                                        <span className={`${styles.kpiChange} ${styles.changeUp}`}>Live</span>
                                    </div>
                                    <div className={styles.kpiValue}>{statsLoading ? "..." : stats?.kpis.active_chats || 0}</div>
                                    <div className={styles.kpiSub}>Current live sessions</div>
                                </div>
                                <div className={styles.kpiCard}>
                                    <div className={styles.kpiTop}>
                                        <span className={styles.kpiLabel}>Msg Volume</span>
                                        <span className={`${styles.kpiChange} ${styles.changeUp}`}>Total</span>
                                    </div>
                                    <div className={styles.kpiValue}>{statsLoading ? "..." : stats?.kpis.total_messages || 0}</div>
                                    <div className={styles.kpiSub}>Total messages processed</div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className={styles.chartsRow}>
                                {/* Messages Chart (Simulated Revenue Chart placeholder) */}
                                <div className={styles.chartCard} style={{ flex: 1.5 }}>
                                    <div className={styles.cardHeader}>
                                        <div>
                                            <h3 className={styles.cardTitle}>Platform Activity</h3>
                                            <p className={styles.cardSubtitle}>Usage trends over time</p>
                                        </div>
                                        <div className={styles.cardActions}>
                                            <span className="badge badge-success">Growth: +24%</span>
                                        </div>
                                    </div>
                                    <div className={styles.lineChart}>
                                        <svg viewBox="0 0 700 180" className={styles.lineSvg} preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="dashAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.12" />
                                                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            {[0, 1, 2, 3, 4].map(i => (
                                                <line key={i} x1="0" y1={i * 35 + 10} x2="700" y2={i * 35 + 10} stroke="#F1F5F9" strokeWidth="1" />
                                            ))}
                                            <path
                                                d={`M ${revenueData.map((v, i) => `${i * 58 + 29},${160 - (v / maxVal) * 140}`).join(' L ')} L ${11 * 58 + 29},160 L 29,160 Z`}
                                                fill="url(#dashAreaGrad)"
                                            />
                                            <polyline
                                                points={revenueData.map((v, i) => `${i * 58 + 29},${160 - (v / maxVal) * 140}`).join(' ')}
                                                fill="none"
                                                stroke="#2563EB"
                                                strokeWidth="2.5"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />
                                            {revenueData.map((v, i) => (
                                                <circle key={i} cx={i * 58 + 29} cy={160 - (v / maxVal) * 140} r="4" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                                            ))}
                                        </svg>
                                        <div className={styles.chartMonths}>
                                            {months.map(m => <span key={m}>{m}</span>)}
                                        </div>
                                    </div>
                                </div>

                                {/* Active Sessions Feed */}
                                <div className={styles.shipCard}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>Live Sessions</h3>
                                        <span className="badge badge-accent">Auto-sync</span>
                                    </div>
                                    <div className={styles.shipList}>
                                        {!statsLoading && stats?.recent_sessions.map((s) => (
                                            <div key={s.session_id} className={styles.shipItem}>
                                                <div className={styles.shipTop}>
                                                    <span className={styles.shipId}>{s.session_id.slice(0, 8)}...</span>
                                                    <span className={`${styles.shipStatus} ${s.status === 'ACTIVE' ? styles.statusTransit : styles.statusDelivered}`}>{s.status}</span>
                                                </div>
                                                <div className={styles.shipMeta}>
                                                    <span>{s.client_ip || 'Anonymous'} | {s.country || 'Unknown'}</span>
                                                    <span>{formatTimeAgo(s.last_activity)}</span>
                                                </div>
                                                <div className={styles.progressBar}>
                                                    <div className={styles.progressFill} style={{
                                                        width: s.mode === 'HUMAN' ? '100%' : '30%',
                                                        background: s.mode === 'HUMAN' ? '#F59E0B' : '#2563EB'
                                                    }}></div>
                                                </div>
                                            </div>
                                        ))}
                                        {!statsLoading && stats?.recent_sessions.length === 0 && (
                                            <div className="text-center py-8 text-slate-400 text-xs italic">No active sessions</div>
                                        )}
                                        {statsLoading && <div className="text-center py-8 text-slate-400 animate-pulse">Loading sessions...</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row */}
                            <div className={styles.bottomRow}>
                                {/* Activity Feed (Recent Leads) */}
                                <div className={styles.activityCard}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>Activity Feed</h3>
                                        <Link href="/crm/dashboard/leads" className="btn btn-ghost btn-sm text-[10px]">View All</Link>
                                    </div>
                                    <div className={styles.activityList}>
                                        {!statsLoading && stats?.recent_leads.map((l) => (
                                            <div key={l.id} className={styles.activityItem}>
                                                <div className={`${styles.activityDot} ${styles.dot_lead}`}></div>
                                                <div className={styles.activityContent}>
                                                    <span className={styles.activityText}>New lead {l.name} from {l.company || 'Direct'}</span>
                                                    <span className={styles.activityTime}>{formatTimeAgo(l.created_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {!statsLoading && stats?.recent_leads.length === 0 && (
                                            <div className="text-center py-4 text-slate-400 text-sm">No recent activity</div>
                                        )}
                                    </div>
                                </div>

                                {/* Recent Leads Table */}
                                <div className={styles.transCard}>
                                    <div className={styles.cardHeader}>
                                        <h3 className={styles.cardTitle}>Recent Prospects</h3>
                                        <Link href="/crm/dashboard/leads" className="btn btn-ghost btn-sm text-[10px]">Manage Leads</Link>
                                    </div>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Company</th>
                                                <th>Email</th>
                                                <th>Status</th>
                                                <th>Created</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {!statsLoading && stats?.recent_leads.map((l) => (
                                                <tr key={l.id}>
                                                    <td className={styles.tdStrong}>{l.name}</td>
                                                    <td className={styles.tdText}>{l.company || '-'}</td>
                                                    <td className={styles.tdMuted}>{l.email}</td>
                                                    <td>
                                                        <span className={`badge ${l.status === 'NEW' ? 'badge-warning' : l.status === 'CONTACTED' ? 'badge-success' : 'badge-warning'}`}>
                                                            {l.status}
                                                        </span>
                                                    </td>
                                                    <td className={styles.tdTiny}>{new Date(l.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        children
                    )
                    }
                </div >
            </div >
        </div >
    );
}

