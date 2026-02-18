import styles from './TrustSection.module.css';

const features = [
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Enterprise-Grade Security',
        description: 'SOC 2 Type II certified infrastructure with end-to-end encryption for all data in transit and at rest.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Role-Based Access Control',
        description: 'Granular permissions for every team member. Control who sees what across your entire organization.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Data Encryption',
        description: 'AES-256 encryption at rest and TLS 1.3 in transit. Your trade data is protected at every layer.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Complete Audit Logs',
        description: 'Every action logged with user, timestamp, and context. Full compliance trail for regulatory requirements.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: '99.9% Uptime SLA',
        description: 'Enterprise SLA with guaranteed uptime, 24/7 monitoring, and dedicated support for critical operations.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Global Compliance',
        description: 'Built-in support for GDPR, CCPA, and international trade regulations across 50+ jurisdictions.',
    },
];

const certifications = ['SOC 2 Type II', 'ISO 27001', 'GDPR Compliant', 'CCPA Ready', 'PCI DSS'];

export default function TrustSection() {
    return (
        <section className={styles.section}>
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.eyebrow}>Security & Compliance</span>
                    <h2 className={styles.title}>Built for Enterprise Trust</h2>
                    <p className={styles.subtitle}>
                        Security is not an afterthought. Every layer of our platform is designed to meet the highest enterprise standards.
                    </p>
                </div>

                <div className={styles.grid}>
                    {features.map((f, i) => (
                        <div key={i} className={styles.card}>
                            <div className={styles.iconWrap}>{f.icon}</div>
                            <h3 className={styles.cardTitle}>{f.title}</h3>
                            <p className={styles.cardDesc}>{f.description}</p>
                        </div>
                    ))}
                </div>

                <div className={styles.certs}>
                    <p className={styles.certsLabel}>Certified & Compliant</p>
                    <div className={styles.certsList}>
                        {certifications.map((c) => (
                            <div key={c} className={styles.certBadge}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                {c}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
