'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Layers,
  LayoutDashboard,
  Plus,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { truncateAddress } from '@/lib/api';

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/marketplace', label: 'Marketplace', icon: ShoppingBag },
  { href: '/upload', label: 'Create License', icon: Plus },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export default function Navbar() {
  const pathname = usePathname();
  const { address, isConnected, isLoading, connect, disconnect } = useAuth();

  return (
    <aside className="sidebar">
      <div className="logo-block">
        <Link href="/" className="logo">
          <span className="logo-mark">
            <Layers size={16} color="white" />
          </span>
          <span className="logo-text">Zhunix</span>
        </Link>
        <div className="logo-kicker">DATA LICENSING PROTOCOL</div>
      </div>

      <nav className="nav-links" aria-label="Primary navigation">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={`nav-link ${active ? 'active' : ''}`}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="wallet-panel">
        {isConnected ? (
          <button className="wallet-row" onClick={disconnect} style={{ width: '100%', background: 'transparent', border: 0, textAlign: 'left' }}>
            <span className="wallet-icon">
              <Wallet size={13} color="var(--green)" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="wallet-label">Connected</span>
              <span className="wallet-address" style={{ display: 'block' }}>
                {truncateAddress(address || '')}
              </span>
            </span>
            <span className="wallet-status" />
          </button>
        ) : (
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={connect} disabled={isLoading}>
            <Wallet size={14} />
            {isLoading ? 'Connecting' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </aside>
  );
}
