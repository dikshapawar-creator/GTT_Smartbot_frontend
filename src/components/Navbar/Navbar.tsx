'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 8h10M7 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span className={styles.logoText}>TradeFlow CRM</span>
        </Link>

        {/* Desktop Nav */}
        <div className={styles.navLinks}>
          <a href="#platform" className={styles.navLink}>Platform</a>
          <a href="#solutions" className={styles.navLink}>Solutions</a>
          <a href="#compliance" className={styles.navLink}>Compliance</a>
          <a href="#about" className={styles.navLink}>About</a>
        </div>

        {/* CTA Buttons */}
        <div className={styles.navActions}>
          <Link href="/dashboard" className="btn btn-outline btn-sm">Client Login</Link>
          <Link href="#contact" className="btn btn-primary btn-sm">Request Demo</Link>
        </div>

        {/* Mobile Toggle */}
        <button className={styles.mobileToggle} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          <a href="#platform" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Platform</a>
          <a href="#solutions" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Solutions</a>
          <a href="#compliance" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Compliance</a>
          <a href="#about" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>About</a>
          <div className={styles.mobileCtas}>
            <Link href="/dashboard" className="btn btn-outline">Client Login</Link>
            <Link href="#contact" className="btn btn-primary">Request Demo</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
