import { Button } from '@/components/ui/Button';
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
                            GTD Service is trusted by logistics companies, freight forwarders, and exporters across 200+ countries. Access the GTIS database and modernise your trade intelligence today.
                        </p>
                        <div className={styles.ctas}>
                            <Button size="lg" className="h-14 px-10 text-base font-bold rounded-xl shadow-xl shadow-primary/30">
                                Request Demo
                            </Button>
                            <Button variant="outline" size="lg" className="h-14 px-10 text-base font-bold rounded-xl">
                                Contact Sales
                            </Button>
                        </div>
                        <p className={styles.note}>Enterprise onboarding included. Dedicated implementation support.</p>
                    </div>
                    <div className={styles.visual}>
                        <div className={styles.statsGrid}>
                            {[
                                { value: '200+', label: 'Countries Markets' },
                                { value: 'GTIS', label: 'Trade Database' },
                                { value: '100%', label: 'Verified Data' },
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
