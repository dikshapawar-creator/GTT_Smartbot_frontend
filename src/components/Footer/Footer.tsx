import Image from 'next/image';
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
                            <Image
                                src="/logo.png"
                                alt="GTD Service"
                                width={140}
                                height={40}
                                className="object-contain"
                            />
                        </div>
                        <p className={styles.brandDesc}>
                            Enterprise Trade Data Intelligence Platform. Precision insights for global trade partners across 200+ countries.
                        </p>
                        <div className={styles.contact}>
                            <span>enterprise@gtdservice.com</span>
                            <span>+1 (800) GTD-TRADE</span>
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
                        © 2026 GTD Service. All rights reserved.
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
