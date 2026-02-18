import styles from './CRMPreview.module.css';

const kpis = [
    { label: 'Active Shipments', value: '1,284', change: '+12%', trend: 'up', color: 'accent' },
    { label: 'Pending Documents', value: '47', change: '-8%', trend: 'down', color: 'warning' },
    { label: 'Revenue This Month', value: '$4.2M', change: '+18%', trend: 'up', color: 'success' },
    { label: 'New Leads', value: '347', change: '+23%', trend: 'up', color: 'accent' },
];

const shipments = [
    { id: 'SHP-2401', client: 'Maersk Line', origin: 'Shanghai', dest: 'Rotterdam', status: 'In Transit', progress: 65 },
    { id: 'SHP-2402', client: 'Emirates SkyCargo', origin: 'Dubai', dest: 'New York', status: 'Customs Hold', progress: 80 },
    { id: 'SHP-2403', client: 'DB Schenker', origin: 'Mumbai', dest: 'Hamburg', status: 'Delivered', progress: 100 },
    { id: 'SHP-2404', client: 'Kuehne+Nagel', origin: 'Singapore', dest: 'Los Angeles', status: 'Booked', progress: 15 },
];

const activities = [
    { time: '2m ago', text: 'New lead added: Pacific Rim Exports Ltd.', type: 'lead' },
    { time: '18m ago', text: 'SHP-2401 departed Port of Shanghai', type: 'shipment' },
    { time: '1h ago', text: 'Invoice #INV-8821 approved for $128,000', type: 'finance' },
    { time: '3h ago', text: 'Compliance check passed for SHP-2399', type: 'compliance' },
    { time: '5h ago', text: 'Client meeting scheduled: Maersk Line', type: 'crm' },
];

const revenueData = [55, 70, 60, 85, 72, 90, 78, 95, 82, 100, 88, 105];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function CRMPreview() {
    const maxVal = Math.max(...revenueData);

    return (
        <section className={styles.section} id="platform">
            <div className="container">
                <div className={styles.header}>
                    <span className="badge badge-success">Live Platform Preview</span>
                    <h2 className={styles.title}>Enterprise Power, Simplified</h2>
                    <p className={styles.subtitle}>
                        A data-first dashboard built for trade operations at scale.
                    </p>
                </div>

                <div className={styles.dashboardFrame}>
                    {/* Frame header */}
                    <div className={styles.frameHeader}>
                        <div className={styles.frameDots}>
                            <span></span><span></span><span></span>
                        </div>
                        <span className={styles.frameUrl}>app.aitradecrm.com/dashboard</span>
                    </div>

                    <div className={styles.dashBody}>
                        {/* KPI Cards */}
                        <div className={styles.kpiRow}>
                            {kpis.map((kpi, i) => (
                                <div key={i} className={`${styles.kpiCard} ${styles[`kpi_${kpi.color}`]}`}>
                                    <div className={styles.kpiTop}>
                                        <span className={styles.kpiLabel}>{kpi.label}</span>
                                        <span className={`${styles.kpiChange} ${kpi.trend === 'up' ? styles.changeUp : styles.changeDown}`}>
                                            {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                                        </span>
                                    </div>
                                    <div className={styles.kpiValue}>{kpi.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Charts Row */}
                        <div className={styles.chartsRow}>
                            {/* Revenue Chart */}
                            <div className={styles.chartCard}>
                                <div className={styles.chartCardHeader}>
                                    <div>
                                        <h4 className={styles.chartTitle}>Revenue Overview</h4>
                                        <p className={styles.chartSubtitle}>Monthly revenue in USD (millions)</p>
                                    </div>
                                    <span className="badge badge-success">+18% YoY</span>
                                </div>
                                <div className={styles.lineChart}>
                                    <svg viewBox="0 0 600 160" className={styles.lineSvg} preserveAspectRatio="none">
                                        {/* Grid lines */}
                                        {[0, 1, 2, 3].map(i => (
                                            <line key={i} x1="0" y1={i * 40 + 10} x2="600" y2={i * 40 + 10} stroke="#E2E8F0" strokeWidth="1" />
                                        ))}
                                        {/* Area fill */}
                                        <defs>
                                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#2563EB" stopOpacity="0.15" />
                                                <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d={`M ${revenueData.map((v, i) => `${i * 50 + 25},${150 - (v / maxVal) * 130}`).join(' L ')} L ${11 * 50 + 25},150 L 25,150 Z`}
                                            fill="url(#areaGrad)"
                                        />
                                        {/* Line */}
                                        <polyline
                                            points={revenueData.map((v, i) => `${i * 50 + 25},${150 - (v / maxVal) * 130}`).join(' ')}
                                            fill="none"
                                            stroke="#2563EB"
                                            strokeWidth="2.5"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                        {/* Dots */}
                                        {revenueData.map((v, i) => (
                                            <circle key={i} cx={i * 50 + 25} cy={150 - (v / maxVal) * 130} r="3.5" fill="#2563EB" stroke="#fff" strokeWidth="2" />
                                        ))}
                                    </svg>
                                    <div className={styles.chartMonths}>
                                        {months.map(m => <span key={m}>{m}</span>)}
                                    </div>
                                </div>
                            </div>

                            {/* Shipment Progress */}
                            <div className={styles.shipCard}>
                                <div className={styles.chartCardHeader}>
                                    <h4 className={styles.chartTitle}>Shipment Status</h4>
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
                                            <div className={styles.shipRoute}>{s.origin} → {s.dest}</div>
                                            <div className={styles.progressBar}>
                                                <div className={styles.progressFill} style={{ width: `${s.progress}%`, background: s.status === 'Customs Hold' ? '#F59E0B' : s.status === 'Delivered' ? '#10B981' : '#2563EB' }}></div>
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
                                <h4 className={styles.chartTitle}>Activity Feed</h4>
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

                            {/* Recent Transactions */}
                            <div className={styles.transCard}>
                                <h4 className={styles.chartTitle}>Recent Transactions</h4>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Invoice</th>
                                            <th>Client</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { inv: 'INV-8821', client: 'Maersk Line', amount: '$128,000', status: 'Paid' },
                                            { inv: 'INV-8820', client: 'DB Schenker', amount: '$84,500', status: 'Pending' },
                                            { inv: 'INV-8819', client: 'Emirates SkyCargo', amount: '$210,000', status: 'Paid' },
                                            { inv: 'INV-8818', client: 'Kuehne+Nagel', amount: '$56,200', status: 'Overdue' },
                                        ].map((t, i) => (
                                            <tr key={i}>
                                                <td className={styles.tdMono}>{t.inv}</td>
                                                <td>{t.client}</td>
                                                <td className={styles.tdAmount}>{t.amount}</td>
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
        </section>
    );
}
