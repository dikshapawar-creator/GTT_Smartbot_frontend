import styles from './SolutionSection.module.css';

const solutions = [
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        label: 'Documentation',
        title: 'Automated Trade Documentation',
        description: 'Generate bills of lading, certificates of origin, customs declarations, and compliance documents from a single workflow engine.',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        label: 'Client Management',
        title: 'Unified Client Operations',
        description: 'Centralise all client interactions, contracts, and communication history. Manage importers, exporters, and freight partners from one system.',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        label: 'Shipment Tracking',
        title: 'End-to-End Shipment Visibility',
        description: 'Real-time tracking across all carriers, ports, and logistics partners. Automated alerts and status updates at every milestone.',
    },
    {
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        label: 'Trade Analytics',
        title: 'Operational Trade Intelligence',
        description: 'Revenue forecasting, route performance analysis, and compliance reporting to support strategic trade decisions.',
    },
];

export default function SolutionSection() {
    return (
        <section className={styles.section} id="platform">
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.eyebrow}>Platform Capabilities</span>
                    <h2 className={styles.title}>One Integrated Operations Platform</h2>
                    <p className={styles.subtitle}>
                        Replace fragmented tools with a unified system built for the complexity of global trade operations.
                    </p>
                </div>
                <div className={styles.grid}>
                    {solutions.map((s, i) => (
                        <div key={i} className={styles.card}>
                            <div className={styles.cardTop}>
                                <div className={styles.iconWrap}>{s.icon}</div>
                                <span className={styles.label}>{s.label}</span>
                            </div>
                            <h3 className={styles.cardTitle}>{s.title}</h3>
                            <p className={styles.cardDesc}>{s.description}</p>
                            <div className={styles.cardFooter}>
                                <span className={styles.learnMore}>Learn more →</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
