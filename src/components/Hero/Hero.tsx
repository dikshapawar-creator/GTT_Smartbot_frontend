import Link from 'next/link';
import styles from './Hero.module.css';

export default function Hero() {
    return (
        <section className={styles.hero} id="hero">
            {/* Subtle grid background */}
            <div className={styles.gridBg} aria-hidden="true" />

            <div className={`container ${styles.inner}`}>
                {/* Left: Content */}
                <div className={styles.content}>
                    <div className={styles.eyebrow}>
                        <span className={styles.eyebrowTag}>Enterprise Import &amp; Export Management Platform</span>
                    </div>
                    <h1 className={styles.headline}>
                        Global Trade Operations,<br />
                        Managed from One Platform
                    </h1>
                    <p className={styles.subheading}>
                        Manage shipments, documentation, compliance, and client operations across global trade routes from a unified enterprise system.
                    </p>
                    <div className={styles.stats}>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>120+</span>
                            <span className={styles.statLabel}>Global Trade Routes</span>
                        </div>
                        <div className={styles.statDivider}></div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>10,000+</span>
                            <span className={styles.statLabel}>Monthly Shipments</span>
                        </div>
                        <div className={styles.statDivider}></div>
                        <div className={styles.stat}>
                            <span className={styles.statValue}>50+</span>
                            <span className={styles.statLabel}>Countries Covered</span>
                        </div>
                    </div>
                    <div className={styles.ctas}>
                        <a href="#contact" className="btn btn-primary btn-lg">Request Demo</a>
                        <a href="#contact" className="btn btn-outline btn-lg">Contact Sales</a>
                    </div>
                </div>

                {/* Right: Dashboard Preview */}
                <div className={styles.preview}>
                    <div className={styles.previewCard}>
                        <div className={styles.previewHeader}>
                            <div className={styles.previewDots}>
                                <span></span><span></span><span></span>
                            </div>
                            <span className={styles.previewTitle}>TradeFlow CRM — Operations Dashboard</span>
                        </div>
                        <div className={styles.previewBody}>
                            {/* KPI Row */}
                            <div className={styles.miniKpis}>
                                {[
                                    { label: 'Active Shipments', value: '1,284', change: '+12%', color: '#2563EB' },
                                    { label: 'Revenue MTD', value: '$4.2M', change: '+8%', color: '#0f172a' },
                                    { label: 'Pending Docs', value: '47', change: '-3', color: '#64748b' },
                                ].map((kpi) => (
                                    <div key={kpi.label} className={styles.miniKpi}>
                                        <span className={styles.miniKpiValue} style={{ color: kpi.color }}>{kpi.value}</span>
                                        <span className={styles.miniKpiLabel}>{kpi.label}</span>
                                        <span className={styles.miniKpiChange}>{kpi.change}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Chart */}
                            <div className={styles.miniChart}>
                                <div className={styles.miniChartLabel}>Shipment Volume — Last 12 Months</div>
                                <div className={styles.chartBars}>
                                    {[40, 65, 45, 80, 60, 90, 75, 95, 70, 88, 92, 100].map((h, i) => (
                                        <div key={i} className={styles.chartBar} style={{ height: `${h}%`, background: i === 11 ? '#2563EB' : '#e2e8f0' }}></div>
                                    ))}
                                </div>
                            </div>
                            {/* Shipment List */}
                            <div className={styles.miniList}>
                                {[
                                    { id: 'SHP-2401', dest: 'Shanghai → Rotterdam', status: 'In Transit', color: '#2563EB' },
                                    { id: 'SHP-2402', dest: 'Dubai → New York', status: 'Customs Hold', color: '#d97706' },
                                    { id: 'SHP-2403', dest: 'Mumbai → Hamburg', status: 'Delivered', color: '#16a34a' },
                                ].map((s) => (
                                    <div key={s.id} className={styles.miniListItem}>
                                        <span className={styles.miniListId}>{s.id}</span>
                                        <span className={styles.miniListDest}>{s.dest}</span>
                                        <span className={styles.miniListStatus} style={{ color: s.color }}>{s.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Operational badge — no AI */}
                    <div className={styles.statusBadge}>
                        <span className={styles.statusDot}></span>
                        <span>Operations Active — 3 Regions</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
