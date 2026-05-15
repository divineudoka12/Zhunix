import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Bell, Settings } from 'lucide-react';

export function badgeColor(value?: string) {
  const normalized = String(value || '').toUpperCase();
  if (['APPROVED', 'ACTIVE', 'TEXT', 'AI_TRAINING'].includes(normalized)) return 'blue';
  if (['CODE', 'BOTH'].includes(normalized)) return 'purple';
  if (['AUDIO', 'PENDING', 'PAUSED', 'ANALYTICS', 'DOMAIN'].includes(normalized)) return 'amber';
  if (['VIDEO', 'REJECTED', 'REMOVED'].includes(normalized)) return 'red';
  if (['IMAGE', 'FINANCIAL'].includes(normalized)) return 'green';
  if (['BEHAVIORAL'].includes(normalized)) return 'cyan';
  return 'gray';
}

export function Badge({
  color = 'gray',
  children,
  size = 'sm',
}: {
  color?: string;
  children: ReactNode;
  size?: 'sm' | 'lg';
}) {
  return <span className={`badge badge-${color} ${size === 'lg' ? 'badge-lg' : ''}`}>{children}</span>;
}

export function PageFrame({
  title,
  subtitle,
  children,
  home = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  home?: boolean;
}) {
  return (
    <main className={`main ${home ? 'home-main' : ''}`}>
      <div className={`page ${home ? 'narrow-page' : ''}`}>
        {title && (
          <div className="page-header">
            <div>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            <div className="header-actions">
              <button className="icon-button" aria-label="Notifications">
                <Bell size={15} />
              </button>
              <button className="icon-button" aria-label="Settings">
                <Settings size={15} />
              </button>
            </div>
          </div>
        )}
        {children}
      </div>
    </main>
  );
}

export function QualityBar({ label, score }: { label: string; score: number }) {
  const color = score >= 85 ? 'var(--green)' : score >= 68 ? 'var(--amber)' : 'var(--red)';
  return (
    <div className="quality-row">
      <div className="quality-head">
        <span>{label}</span>
        <span style={{ color, fontWeight: 800 }}>{score}/100</span>
      </div>
      <div className="quality-track">
        <div className="quality-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%`, background: color }} />
      </div>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'var(--accent)',
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="card card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span style={{ width: 30, height: 30, borderRadius: 7, background: `${color}1A`, display: 'grid', placeItems: 'center' }}>
          <Icon size={14} color={color} />
        </span>
      </div>
      <div style={{ color: 'var(--text)', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
      {sub && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function typeMeta(type?: string) {
  const normalized = String(type || '').toUpperCase();
  const map: Record<string, { icon: string; color: string; label: string }> = {
    TEXT: { icon: 'TXT', color: 'var(--accent)', label: 'Text' },
    CODE: { icon: '</>', color: 'var(--purple)', label: 'Code' },
    AUDIO: { icon: 'AUD', color: 'var(--amber)', label: 'Audio' },
    VIDEO: { icon: 'VID', color: 'var(--red)', label: 'Video' },
    IMAGE: { icon: 'IMG', color: 'var(--green)', label: 'Image' },
    FINANCIAL: { icon: '$', color: '#10b981', label: 'Financial' },
    BEHAVIORAL: { icon: 'SIG', color: 'var(--cyan)', label: 'Behavioral' },
    DOMAIN: { icon: 'WEB', color: '#f97316', label: 'Domain' },
  };
  return map[normalized] || { icon: 'DAT', color: 'var(--text-muted)', label: String(type || 'Data') };
}

export function permissionLabel(permission?: string) {
  return String(permission || '').replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function scoreAverage(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return 0;
  return Math.round(usable.reduce((sum, value) => sum + value, 0) / usable.length);
}
