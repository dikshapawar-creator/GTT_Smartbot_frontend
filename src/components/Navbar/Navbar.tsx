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
            width={160}
            height={48}
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
            <button className="h-9 px-5 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm">
              Client Login
            </button>
          </Link>
          <Link href="#contact">
            <button className="h-9 px-5 text-sm font-semibold text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-all shadow-md">
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
