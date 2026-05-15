import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Cpu,
  Database,
  DollarSign,
  Eye,
  Hash,
  Shield,
  Zap,
} from 'lucide-react';
import { PageFrame } from '@/components/ui/kit';

const flow = [
  { icon: Database, label: 'Data Source', sub: 'Upload or connect' },
  { icon: Cpu, label: 'Data Agent', sub: 'Your representative' },
  { icon: Hash, label: '0G Storage', sub: 'Merkle root hash' },
  { icon: Shield, label: 'On-chain License', sub: 'Tokenized asset' },
  { icon: Eye, label: 'Buyer Access', sub: 'Permissioned' },
  { icon: DollarSign, label: 'Creator Payout', sub: 'On-chain revenue' },
];

const trust = [
  { icon: Hash, label: '0G Storage', desc: 'Content-addressed storage with cryptographic root hashes.' },
  { icon: CheckCircle, label: 'AI Validation', desc: 'Quality scored for completeness, accuracy, authenticity, and consistency.' },
  { icon: Shield, label: 'On-chain Licensing', desc: 'Usage rights, purchase events, and payouts are traceable.' },
  { icon: DollarSign, label: 'Creator Earnings', desc: 'Pay-per-access and subscriptions route value back to contributors.' },
];

export default function HomePage() {
  return (
    <PageFrame home>
      <section style={{ textAlign: 'center', padding: '56px 0 52px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 999, padding: '5px 14px', marginBottom: 24 }}>
          <Zap size={11} color="var(--cyan)" fill="var(--cyan)" />
          <span style={{ color: 'var(--cyan)', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.04em' }}>BUILT ON 0G LABS</span>
        </div>

        <h1 style={{ color: 'var(--text)', fontSize: 'clamp(38px, 6vw, 58px)', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.06, marginBottom: 18 }}>
          Own Your Data.
          <br />
          <span style={{ backgroundImage: 'linear-gradient(90deg, var(--accent) 20%, var(--cyan) 80%)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            License It With Agents.
          </span>
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: 17, maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Zhunix helps people turn valuable data into programmable, on-chain licenses. Agents classify, validate, price, and protect access so contributors keep control and earn from approved buyers.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/upload" className="btn btn-primary" style={{ minHeight: 46, padding: '0 28px', fontSize: 15 }}>
            Create Data License <ArrowRight size={16} />
          </Link>
          <Link href="/marketplace" className="btn btn-secondary" style={{ minHeight: 46, padding: '0 28px', fontSize: 15 }}>
            Explore Marketplace
          </Link>
        </div>
      </section>

      <section className="card card-pad home-flow-card">
        <p className="section-kicker" style={{ marginBottom: 22 }}>How Zhunix Works</p>
        <div className="home-flow-grid">
          {flow.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="home-flow-step">
              <div className="home-flow-icon">
                <Icon size={22} color="var(--accent-light)" strokeWidth={1.6} />
              </div>
              <div className="home-flow-label">{label}</div>
              <div className="home-flow-sub">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-4" style={{ marginBottom: 24 }}>
        {trust.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card card-pad">
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(6,182,212,0.1)', display: 'grid', placeItems: 'center', marginBottom: 12 }}>
              <Icon size={17} color="var(--cyan)" strokeWidth={1.7} />
            </div>
            <div style={{ color: 'var(--text)', fontSize: 13.5, fontWeight: 700, marginBottom: 5 }}>{label}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.55 }}>{desc}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-3">
        {[
          ['Licenses Created', '2,418', 'var(--accent)'],
          ['Revenue Distributed', '$184K', 'var(--green)'],
          ['Validated Assets', '1,903', 'var(--cyan)'],
        ].map(([label, value, color]) => (
          <div key={label} className="card" style={{ padding: '26px 24px', textAlign: 'center' }}>
            <div style={{ color, fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 5 }}>{label}</div>
          </div>
        ))}
      </section>
    </PageFrame>
  );
}
