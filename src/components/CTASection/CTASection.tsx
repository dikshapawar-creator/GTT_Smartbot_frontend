import styles from './CTASection.module.css';

export default function CTASection() {
    return (
        <section className={styles.section} id="contact">
            <div className="container">
                <div className={styles.inner}>
                    <div className={styles.content}>
                        <span className={styles.eyebrow}>Get Started</span>
                        <h2 className={styles.title}>
                            Ready to Modernise Your Trade Operations?
                        </h2>
                        <p className={styles.subtitle}>
                            TradeFlow CRM is deployed by logistics companies, freight forwarders, and exporters across 50+ countries. Contact our enterprise team to schedule a platform walkthrough.
                        </p>
                        <div className={styles.ctas}>
                            <a href="#" className="btn btn-primary btn-lg">Request Demo</a>
                            <a href="#" className="btn btn-outline btn-lg">Contact Sales</a>
                        </div>
                        <p className={styles.note}>Enterprise onboarding included. Dedicated implementation support.</p>
                    </div>
                    <div className={styles.visual}>
                        <div className={styles.statsGrid}>
                            {[
                                { value: '120+', label: 'Global Trade Routes' },
                                { value: '10,000+', label: 'Monthly Shipments' },
                                { value: '50+', label: 'Countries Covered' },
                                { value: '99.9%', label: 'Platform Uptime' },
                            ].map((s) => (
                                <div key={s.label} className={styles.statItem}>
                                    <span className={styles.statValue}>{s.value}</span>
                                    <span className={styles.statLabel}>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
