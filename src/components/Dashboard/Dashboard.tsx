'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import styles from './Dashboard.module.css';

import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatToIST } from '@/lib/time';
import { useCRMUpdates, CRMUpdateEvent } from '@/hooks/useCRMUpdates';

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
    UserPlus,
    Moon,
    Sun,
    Building
} from 'lucide-react';

interface NavItem {
    icon: React.ReactNode;
    label: string;
    href: string;
    adminOnly?: boolean;
    superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', href: '/crm/dashboard' },
    { icon: <Contact2 size={20} />, label: 'Captured Leads', href: '/crm/dashboard/leads' },
    { icon: <Users size={20} />, label: 'User Management', href: '/crm/users', adminOnly: true },
    { icon: <Building size={20} />, label: 'Tenant Management', href: '/crm/tenants', superAdminOnly: true },
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
    tenant_name: string;
    notifications: Array<{
        id: string;
        message: string;
        time: string;
    }>;
}

export default function Dashboard({ children }: { children?: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [profileOpen, setProfileOpen] = useState(false);
    const [orgOpen, setOrgOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [lastReadTime, setLastReadTime] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        fetchStats();

        // Load theme and last read time from local storage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.setAttribute('data-theme', 'dark');
        }

        const savedReadTime = localStorage.getItem('notificationsLastRead');
        if (savedReadTime) {
            setLastReadTime(savedReadTime);
        }
    }, []);

    // 🔄 Real-time CRM Updates
    useCRMUpdates((event: CRMUpdateEvent) => {
        console.log('📬 Dashboard received sync event:', event);

        // Refresh stats on any relevant mutation
        const refreshEvents = [
            'LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_DELETED',
            'SESSION_UPDATED', 'NEW_MESSAGE',
            'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED'
        ];

        if (refreshEvents.includes(event.type)) {
            fetchStats();
        }
    });

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        const newTheme = !isDarkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const markAllRead = () => {
        const now = new Date().toISOString();
        setLastReadTime(now);
        localStorage.setItem('notificationsLastRead', now);
        setNotifOpen(false);
    };

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
        return formatToIST(dateStr);
    };

    const getInitials = () => {
        if (!mounted) return '...';
        const user = auth.getUser();
        if (user && user.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'US';
    };

    const displayLeads = stats?.recent_leads?.filter(l =>
        (l.name + l.email + l.company + l.status).toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const displaySessions = stats?.recent_sessions?.filter(s =>
        (s.session_id + s.client_ip + s.country + s.status).toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const unreadNotifications = stats?.notifications?.filter(n => {
        if (!lastReadTime) return true;
        return new Date(n.time) > new Date(lastReadTime);
    }) || [];

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
                    {mounted && navItems.filter(item => {
                        if (item.superAdminOnly && !auth.isSuperAdmin()) return false;
                        if (item.adminOnly && !auth.isAdmin()) return false;
                        return true;
                    }).map((item) => {
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
                            <div className={styles.userAvatar}>{getInitials()}</div>
                            <div className={styles.userInfo}>
                                {mounted ? (auth.getUser()?.email?.split('@')[0] || 'User') : '...'}
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
                            <div className={styles.userAvatarSm}>{getInitials()}</div>
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
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder="Search leads, sessions, history..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        {mounted && auth.getUser() && (auth.getUser()?.tenant_ids?.length || 0) > 1 && (
                            <div className={styles.orgSwitcher} onClick={() => setOrgOpen(!orgOpen)} style={{ position: 'relative' }}>
                                <span className="flex items-center gap-2">
                                    <Activity size={14} className="text-primary" />
                                    {statsLoading ? 'Loading...' : (
                                        auth.getUser()?.tenant_access?.find(t => String(t.tenant_id) === (localStorage.getItem('selected_tenant_id') || String(auth.getUser()?.primary_tenant_id)))?.tenant_name || 'Select Tenant'
                                    )}
                                </span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${orgOpen ? 'rotate-180' : ''}`} />
                                {orgOpen && (
                                    <div className={styles.orgDropdown}>
                                        <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                            Switch Workspace
                                        </div>
                                        {auth.getUser()?.tenant_access?.map((t) => (
                                            <button
                                                key={t.tenant_id}
                                                className={`${styles.orgOption} ${String(t.tenant_id) === (localStorage.getItem('selected_tenant_id') || String(auth.getUser()?.primary_tenant_id)) ? styles.orgOptionActive : ''}`}
                                                onClick={() => {
                                                    localStorage.setItem('selected_tenant_id', String(t.tenant_id));
                                                    window.location.reload();
                                                }}
                                            >
                                                {t.tenant_name}
                                                {t.is_primary && <span className="ml-auto text-[10px] bg-slate-100 px-1 rounded">Primary</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Fallback for single tenant users: just show name */}
                        {mounted && auth.getUser() && (auth.getUser()?.tenant_ids?.length || 0) <= 1 && (
                            <div className={styles.orgSwitcher} style={{ cursor: 'default' }}>
                                <span>{auth.getUser()?.tenant_access?.[0]?.tenant_name || 'My Workspace'}</span>
                            </div>
                        )}
                        <div className={styles.notifWrap}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className={styles.iconBtn} onClick={toggleTheme} title="Toggle Dark Mode">
                                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                                </button>
                                <button className={styles.iconBtn} onClick={() => setNotifOpen(!notifOpen)}>
                                    <Bell size={18} />
                                    {unreadNotifications.length > 0 && (
                                        <span className={styles.notifBadge}>{unreadNotifications.length}</span>
                                    )}
                                </button>
                            </div>
                            {notifOpen && (
                                <div className={styles.notifDropdown}>
                                    <div className={styles.notifHeader}>
                                        <span className={styles.notifTitle}>Notifications</span>
                                        <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">Mark all read</button>
                                    </div>
                                    <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
                                        {statsLoading ? (
                                            <div className="p-4 text-center text-xs text-slate-400">Loading notifications...</div>
                                        ) : unreadNotifications.length > 0 ? (
                                            unreadNotifications.map((notif) => (
                                                <div key={notif.id} className={styles.notifItem}>
                                                    <span className={styles.notifItemText}>{notif.message}</span>
                                                    <span className={styles.notifTime}>{formatTimeAgo(notif.time)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.userProfile} onClick={() => setProfileOpen(!profileOpen)}>
                            <div className={styles.profileAvatar}>{getInitials()}</div>
                            <div className={styles.profileInfo}>
                                {mounted ? (auth.getUser()?.email?.split('@')[0] || 'User') : '...'}
                                <span className={styles.profileRole}>
                                    {mounted ? (auth.getUser()?.is_super_admin ? 'Super Admin' : (auth.getUser()?.role || 'Administrator')) : 'Administrator'}
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
                                    <p className={styles.pageTitleSub}>
                                        Welcome back, {auth.getUser()?.email?.split('@')[0] || 'User'}.
                                        Showing analytics for <strong>{auth.getUser()?.tenant_access?.find(t => String(t.tenant_id) === (localStorage.getItem('selected_tenant_id') || String(auth.getUser()?.primary_tenant_id)))?.tenant_name || 'your workspace'}</strong>.
                                    </p>
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
                                        {!statsLoading && displaySessions.map((s) => (
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
                                        {!statsLoading && displaySessions.length === 0 && (
                                            <div className="text-center py-8 text-slate-400 text-xs italic">No matching sessions</div>
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
                                        {!statsLoading && displayLeads.slice(0, 5).map((l) => (
                                            <div key={l.id} className={styles.activityItem}>
                                                <div className={`${styles.activityDot} ${styles.dot_lead}`}></div>
                                                <div className={styles.activityContent}>
                                                    <span className={styles.activityText}>New lead {l.name} from {l.company || 'Direct'}</span>
                                                    <span className={styles.activityTime}>{formatTimeAgo(l.created_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {!statsLoading && displayLeads.length === 0 && (
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
                                            {!statsLoading && displayLeads.map((l) => (
                                                <tr key={l.id}>
                                                    <td className={styles.tdStrong}>{l.name}</td>
                                                    <td className={styles.tdText}>{l.company || '-'}</td>
                                                    <td className={styles.tdMuted}>{l.email}</td>
                                                    <td>
                                                        <span className={`badge ${l.status === 'NEW' ? 'badge-warning' : l.status === 'CONTACTED' ? 'badge-success' : 'badge-warning'}`}>
                                                            {l.status}
                                                        </span>
                                                    </td>
                                                    <td className={styles.tdTiny}>{formatToIST(l.created_at)}</td>
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

