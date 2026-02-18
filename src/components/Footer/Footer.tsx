import styles from './Footer.module.css';

const footerLinks = {
    Platform: ['Operations Dashboard', 'Shipment Tracking', 'Documentation Management', 'Trade Analytics', 'Compliance Module'],
    Solutions: ['Freight Forwarders', 'Export Management', 'Import Operations', 'Multi-Office Deployment', 'API Integration'],
    Resources: ['Documentation', 'API Reference', 'Implementation Guide', 'Case Studies', 'Support Portal'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Data Processing', 'GDPR', 'Security'],
};

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className="container">
                <div className={styles.top}>
                    {/* Brand */}
                    <div className={styles.brand}>
                        <div className={styles.logo}>
                            <div className={styles.logoIcon}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                    <path d="M7 8h10M7 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </div>
                            <span className={styles.logoText}>TradeFlow CRM</span>
                        </div>
                        <p className={styles.brandDesc}>
                            Enterprise Import &amp; Export Management Platform. Trusted by logistics companies and freight forwarders across 50+ countries.
                        </p>
                        <div className={styles.contact}>
                            <span>enterprise@tradeflowcrm.com</span>
                            <span>+1 (800) 555-TRADE</span>
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([category, links]) => (
                        <div key={category} className={styles.linkGroup}>
                            <h4 className={styles.linkGroupTitle}>{category}</h4>
                            <ul className={styles.linkList}>
                                {links.map((link) => (
                                    <li key={link}>
                                        <a href="#" className={styles.link}>{link}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className={styles.bottom}>
                    <p className={styles.copyright}>
                        © 2025 TradeFlow CRM. All rights reserved.
                    </p>
                    <div className={styles.bottomLinks}>
                        <a href="#" className={styles.bottomLink}>Privacy</a>
                        <a href="#" className={styles.bottomLink}>Terms</a>
                        <a href="#" className={styles.bottomLink}>Security</a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
