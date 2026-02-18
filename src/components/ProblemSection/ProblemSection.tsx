import styles from './ProblemSection.module.css';

const problems = [
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Manual Documentation Errors',
        description: 'Handcrafted trade documents are error-prone, causing costly delays, compliance failures, and shipment holds at customs.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Shipment Visibility Gaps',
        description: 'Lack of real-time tracking across carriers, ports, and logistics partners creates blind spots in your supply chain.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Disconnected Systems',
        description: 'Siloed tools for clients, shipments, and finance create data fragmentation, slowing decisions and damaging client relationships.',
    },
    {
        icon: (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        title: 'Compliance & Regulatory Risk',
        description: 'Evolving trade regulations, sanctions, and tariff changes expose enterprises to significant legal and financial risk.',
    },
];

export default function ProblemSection() {
    return (
        <section className={styles.section} id="solutions">
            <div className="container">
                <div className={styles.header}>
                    <span className={styles.eyebrow}>Industry Challenges</span>
                    <h2 className={styles.title}>The Complexity of Global Trade Operations</h2>
                    <p className={styles.subtitle}>
                        Modern trade enterprises face systemic operational challenges that cost time, money, and competitive advantage.
                    </p>
                </div>
                <div className={styles.grid}>
                    {problems.map((p, i) => (
                        <div key={i} className={styles.card}>
                            <div className={styles.iconWrap}>{p.icon}</div>
                            <h3 className={styles.cardTitle}>{p.title}</h3>
                            <p className={styles.cardDesc}>{p.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
