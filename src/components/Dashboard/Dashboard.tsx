'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './Dashboard.module.css';

const navItems = [
    { icon: '⊞', label: 'Dashboard', href: '/dashboard', active: true },
    { icon: '◈', label: 'Leads', href: '/dashboard/leads' },
    { icon: '◉', label: 'Clients', href: '/dashboard/clients' },
    { icon: '▷', label: 'Shipments', href: '/dashboard/shipments' },
    { icon: '☰', label: 'Documentation', href: '/dashboard/docs' },
    { icon: '◎', label: 'Analytics', href: '/dashboard/analytics' },
    { icon: '⚙', label: 'Automation', href: '/dashboard/automation' },
    { icon: '⊙', label: 'Settings', href: '/dashboard/settings' },
];

const kpis = [
    { label: 'Active Shipments', value: '1,284', change: '+12%', trend: 'up', sub: 'vs last month' },
    { label: 'Pending Documents', value: '47', change: '-8%', trend: 'down', sub: 'requires action' },
    { label: 'Revenue This Month', value: '$4.2M', change: '+18%', trend: 'up', sub: 'vs last month' },
    { label: 'New Leads', value: '347', change: '+23%', trend: 'up', sub: 'this month' },
];

const revenueData = [55, 70, 60, 85, 72, 90, 78, 95, 82, 100, 88, 105];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shipments = [
    { id: 'SHP-2401', client: 'Maersk Line', origin: 'Shanghai', dest: 'Rotterdam', eta: 'Feb 28', status: 'In Transit', progress: 65 },
    { id: 'SHP-2402', client: 'Emirates SkyCargo', origin: 'Dubai', dest: 'New York', eta: 'Feb 22', status: 'Customs Hold', progress: 80 },
    { id: 'SHP-2403', client: 'DB Schenker', origin: 'Mumbai', dest: 'Hamburg', eta: 'Feb 18', status: 'Delivered', progress: 100 },
    { id: 'SHP-2404', client: 'Kuehne+Nagel', origin: 'Singapore', dest: 'Los Angeles', eta: 'Mar 10', status: 'Booked', progress: 15 },
    { id: 'SHP-2405', client: 'DHL Global', origin: 'Tokyo', dest: 'Chicago', eta: 'Mar 5', status: 'In Transit', progress: 40 },
];

const activities = [
    { time: '2m ago', text: 'New lead added: Pacific Rim Exports Ltd.', type: 'lead' },
    { time: '18m ago', text: 'SHP-2401 departed Port of Shanghai', type: 'shipment' },
    { time: '1h ago', text: 'Invoice #INV-8821 approved for $128,000', type: 'finance' },
    { time: '3h ago', text: 'Compliance check passed for SHP-2399', type: 'compliance' },
    { time: '5h ago', text: 'Client meeting scheduled: Maersk Line', type: 'crm' },
    { time: '6h ago', text: 'New shipment created: SHP-2405', type: 'shipment' },
];

const transactions = [
    { inv: 'INV-8821', client: 'Maersk Line', amount: '$128,000', date: 'Feb 18', status: 'Paid' },
    { inv: 'INV-8820', client: 'DB Schenker', amount: '$84,500', date: 'Feb 17', status: 'Pending' },
    { inv: 'INV-8819', client: 'Emirates SkyCargo', amount: '$210,000', date: 'Feb 16', status: 'Paid' },
    { inv: 'INV-8818', client: 'Kuehne+Nagel', amount: '$56,200', date: 'Feb 15', status: 'Overdue' },
    { inv: 'INV-8817', client: 'DHL Global', amount: '$92,800', date: 'Feb 14', status: 'Paid' },
];

const maxVal = Math.max(...revenueData);

export default function Dashboard() {
    const [collapsed, setCollapsed] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.sidebarLogo}>
                        <div className={styles.logoIcon}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        {!collapsed && <span className={styles.logoText}>AI Trade CRM</span>}
                    </div>
                    <button className={styles.collapseBtn} onClick={() => setCollapsed(!collapsed)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d={collapsed ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                </div>

                <nav className={styles.sidebarNav}>
                    {navItems.map((item) => (
                        <Link key={item.label} href={item.href} className={`${styles.navItem} ${item.active ? styles.navItemActive : ''}`}>
                            <span className={styles.navIcon}>{item.icon}</span>
                            {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    {!collapsed && (
                        <div className={styles.userCard}>
                            <div className={styles.userAvatar}>HK</div>
                            <div className={styles.userInfo}>
                                <span className={styles.userName}>Harsh Kumar</span>
                                <span className={styles.userRole}>Admin</span>
                            </div>
                        </div>
                    )}
                    {collapsed && <div className={styles.userAvatarSm}>HK</div>}
                </div>
            </aside>

            {/* Main Content */}
            <div className={styles.main}>
                {/* Top Header */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.searchWrap}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={styles.searchIcon}>
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <input className={styles.searchInput} type="text" placeholder="Search shipments, clients, documents..." />
                        </div>
                    </div>
                    <div className={styles.headerRight}>
                        <div className={styles.orgSwitcher}>
                            <span>GTT Enterprises</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <div className={styles.notifWrap}>
                            <button className={styles.iconBtn} onClick={() => setNotifOpen(!notifOpen)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className={styles.notifBadge}>3</span>
                            </button>
                        </div>
                        <div className={styles.userProfile}>
                            <div className={styles.profileAvatar}>HK</div>
                            <div className={styles.profileInfo}>
                                <span className={styles.profileName}>Harsh Kumar</span>
                                <span className={styles.profileRole}>Administrator</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M19 9l-7 7-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={styles.content}>
                    {/* Page Title */}
                    <div className={styles.pageTitle}>
                        <div>
                            <h1 className={styles.pageTitleText}>Dashboard</h1>
                            <p className={styles.pageTitleSub}>Welcome back, Harsh. Here is your trade operations overview.</p>
                        </div>
                        <div className={styles.pageTitleActions}>
                            <button className="btn btn-outline btn-sm">Export Report</button>
                            <button className="btn btn-primary btn-sm">+ New Shipment</button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className={styles.kpiGrid}>
                        {kpis.map((kpi, i) => (
                            <div key={i} className={styles.kpiCard}>
                                <div className={styles.kpiTop}>
                                    <span className={styles.kpiLabel}>{kpi.label}</span>
                                    <span className={`${styles.kpiChange} ${kpi.trend === 'up' ? styles.changeUp : styles.changeDown}`}>
                                        {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                                    </span>
                                </div>
                                <div className={styles.kpiValue}>{kpi.value}</div>
                                <div className={styles.kpiSub}>{kpi.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className={styles.chartsRow}>
                        {/* Revenue Chart */}
                        <div className={styles.chartCard}>
                            <div className={styles.cardHeader}>
                                <div>
                                    <h3 className={styles.cardTitle}>Revenue Overview</h3>
                                    <p className={styles.cardSubtitle}>Monthly revenue in USD (millions)</p>
                                </div>
                                <div className={styles.cardActions}>
                                    <span className="badge badge-success">+18% YoY</span>
                                    <select className={styles.periodSelect}>
                                        <option>2025</option>
                                        <option>2024</option>
                                    </select>
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

                        {/* Shipment Overview */}
                        <div className={styles.shipCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Shipment Progress</h3>
                                <span className="badge badge-accent">Live</span>
                            </div>
                            <div className={styles.shipList}>
                                {shipments.map((s) => (
                                    <div key={s.id} className={styles.shipItem}>
                                        <div className={styles.shipTop}>
                                            <span className={styles.shipId}>{s.id}</span>
                                            <span className={`${styles.shipStatus} ${s.status === 'Delivered' ? styles.statusDelivered :
                                                    s.status === 'Customs Hold' ? styles.statusHold :
                                                        s.status === 'Booked' ? styles.statusBooked : styles.statusTransit
                                                }`}>{s.status}</span>
                                        </div>
                                        <div className={styles.shipMeta}>
                                            <span>{s.origin} → {s.dest}</span>
                                            <span>ETA: {s.eta}</span>
                                        </div>
                                        <div className={styles.progressBar}>
                                            <div className={styles.progressFill} style={{
                                                width: `${s.progress}%`,
                                                background: s.status === 'Customs Hold' ? '#F59E0B' : s.status === 'Delivered' ? '#10B981' : '#2563EB'
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row */}
                    <div className={styles.bottomRow}>
                        {/* Activity Feed */}
                        <div className={styles.activityCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Activity Feed</h3>
                                <button className="btn btn-ghost btn-sm">View All</button>
                            </div>
                            <div className={styles.activityList}>
                                {activities.map((a, i) => (
                                    <div key={i} className={styles.activityItem}>
                                        <div className={`${styles.activityDot} ${styles[`dot_${a.type}`]}`}></div>
                                        <div className={styles.activityContent}>
                                            <span className={styles.activityText}>{a.text}</span>
                                            <span className={styles.activityTime}>{a.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Transactions */}
                        <div className={styles.transCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardTitle}>Recent Transactions</h3>
                                <button className="btn btn-ghost btn-sm">View All</button>
                            </div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Invoice</th>
                                        <th>Client</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t, i) => (
                                        <tr key={i}>
                                            <td className={styles.tdMono}>{t.inv}</td>
                                            <td>{t.client}</td>
                                            <td className={styles.tdAmount}>{t.amount}</td>
                                            <td className={styles.tdMuted}>{t.date}</td>
                                            <td>
                                                <span className={`badge ${t.status === 'Paid' ? 'badge-success' : t.status === 'Overdue' ? 'badge-danger' : 'badge-warning'}`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
