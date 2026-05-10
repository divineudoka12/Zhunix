import Link from 'next/link';
import styles from './page.module.css';

const stats = [
  { value: '0G', label: 'Storage Layer' },
  { value: 'TEE', label: 'Privacy Stack' },
  { value: 'EVM', label: 'On-Chain Logic' },
  { value: 'AI', label: 'Quality Scoring' },
];

const features = [
  {
    icon: '◈',
    title: 'Privacy-Preserving Storage',
    desc: 'Files stored on 0G Labs with cryptographic root hashes. Your data is yours.',
  },
  {
    icon: '◉',
    title: 'AI-Powered Validation',
    desc: 'Agents score completeness, accuracy, authenticity and consistency before listing.',
  },
  {
    icon: '◇',
    title: 'On-Chain Purchases',
    desc: 'Every transaction is indexed on-chain. Transparent provenance, zero intermediaries.',
  },
  {
    icon: '◆',
    title: 'Agent Marketplace',
    desc: 'Register validator agents, trigger dynamic pricing cycles, earn agentic token rewards.',
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* Background grid */}
      <div className={styles.grid} />

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.tag}>
            <span className={styles.tagDot} />
            Privacy-Preserving Data Marketplace
          </div>
          <h1 className={styles.heroTitle} style={{opacity: 1, transform: 'none'}}>
            Trade Data.
            <br />
            <span className={styles.heroAccent}>Trust Nothing</span>
            <br />
            Verify Everything.
          </h1>
          <p className={styles.heroSub} style={{opacity: 1, transform: 'none'}}>
            Zhunix is a decentralized marketplace where contributors list datasets with cryptographic
            integrity and buyers access them through on-chain smart contracts — with zero trust assumptions.
          </p>
          <div className={styles.heroCta} style={{opacity: 1, transform: 'none'}}>
            <Link href="/marketplace" className="btn btn-primary">
              Explore Marketplace →
            </Link>
            <Link href="/upload" className="btn btn-ghost">
              List a Dataset
            </Link>
          </div>
        </div>

        {/* Decorative terminal */}
       <div className={styles.terminal} style={{opacity: 1, transform: 'none'}}>
          <div className={styles.terminalBar}>
            <span className={styles.termDot} style={{ background: '#ff5f57' }} />
            <span className={styles.termDot} style={{ background: '#febc2e' }} />
            <span className={styles.termDot} style={{ background: '#28c840' }} />
            <span className={styles.termTitle}>zhunix.log</span>
          </div>
          <div className={styles.terminalBody}>
            <div className={styles.termLine}><span className={styles.termPrompt}>$</span> Dataset uploaded → 0G storage</div>
            <div className={styles.termLine}><span className={styles.termGreen}>✓</span> Root hash: 0x4f9a...c821</div>
            <div className={styles.termLine}><span className={styles.termPrompt}>$</span> Validation triggered</div>
            <div className={styles.termLine}><span className={styles.termGreen}>✓</span> Quality score: <span className={styles.termRed}>87</span>/100</div>
            <div className={styles.termLine}><span className={styles.termGreen}>✓</span> Status: APPROVED</div>
            <div className={styles.termLine}><span className={styles.termPrompt}>$</span> Listed on marketplace</div>
            <div className={styles.termLine}><span className={styles.termGreen}>✓</span> txHash: 0x71bc...98fa</div>
            <div className={styles.termLine}><span className={styles.termCursor}>█</span></div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className={styles.statsBar}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statItem}>
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <div className="section-title">How it works</div>
          <h2 className={styles.featuresTitle}>Built for trustless data exchange</h2>
          <div className={styles.featuresGrid}>
            {features.map((f) => (
              <div key={f.title} className={`card card-red-hover ${styles.featureCard}`}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to contribute?</h2>
          <p className={styles.ctaSub}>List your dataset in minutes. Earn on every access.</p>
          <Link href="/upload" className="btn btn-primary">
            Start Uploading
          </Link>
        </div>
      </section>
    </div>
  );
}
