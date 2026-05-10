'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { truncateAddress } from '@/lib/api';
import styles from './Navbar.module.css';

const navLinks = [
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/upload', label: 'Upload' },
  { href: '/agents', label: 'Agents' },
  { href: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, isLoading, connect, disconnect } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.inner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            <span className={styles.logoText}>ZHUNIX</span>
          </Link>

          <ul className={styles.links}>
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={`${styles.link} ${pathname.startsWith(href) ? styles.active : ''}`}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <div className={styles.right}>
            {isConnected ? (
              <div className={styles.walletGroup}>
                <span className={styles.walletBadge}>
                  <span className={styles.dot} />
                  {truncateAddress(address!)}
                </span>
                <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={disconnect}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={connect} disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>

          <button className={styles.hamburger} onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </button>
        </div>
      </nav>

      <div className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            <span className={styles.logoText}>ZHUNIX</span>
          </Link>
          <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>

        <nav className={styles.sidebarNav}>
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={`${styles.sidebarLink} ${pathname.startsWith(href) ? styles.sidebarActive : ''}`}>
              <span className={styles.sidebarLinkIndicator} />
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {isConnected ? (
            <>
              <div className={styles.sidebarWallet}>
                <span className={styles.dot} />
                <span className="address" style={{ wordBreak: 'break-all', fontSize: 11 }}>{address}</span>
              </div>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={disconnect}>Disconnect</button>
            </>
          ) : (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={connect} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
