'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
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
          <Image
            src="/logo.png"
            alt="GTD Service"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
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
          <Link href="/signin">
            <button style={{ height: '38px', padding: '0 20px', fontSize: '14px', fontWeight: 600, color: '#1f2937', background: '#ffffff', border: '1.5px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
              Client Login
            </button>
          </Link>
          <Link href="#contact">
            <button style={{ height: '38px', padding: '0 20px', fontSize: '14px', fontWeight: 600, color: '#ffffff', background: '#1d4ed8', border: '1.5px solid #1d4ed8', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(29,78,216,0.35)', whiteSpace: 'nowrap' }}>
              Request Demo
            </button>
          </Link>
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
            <Link href="/signin" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">Client Login</Button>
            </Link>
            <Link href="#contact" onClick={() => setMobileOpen(false)}>
              <Button className="w-full">Request Demo</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
