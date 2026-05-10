'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { datasets, purchases, Dataset, truncateAddress, formatWei } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './page.module.css';

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? '#22c55e' : value >= 60 ? '#f59e0b' : '#e8192c';
  return (
    <div className={styles.scoreBar}>
      <div className={styles.scoreBarLabel}>{label}</div>
      <div className={styles.scoreBarTrack}>
        <div className={styles.scoreBarFill} style={{ width: `${value}%`, background: color }} />
      </div>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '12px', width: '32px', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useAuth();
  const [ds, setDs] = useState<Dataset | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await datasets.get(id);
        setDs(res.dataset);
        if (isConnected) {
          const access = await purchases.checkAccess(id);
          setHasAccess(access.hasAccess);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isConnected]);

  if (loading) return <div className={styles.loading}>Loading dataset...</div>;
  if (!ds) return <div className={styles.loading}>Dataset not found.</div>;

  const vd = ds.validationDetails;

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/marketplace" className={styles.breadLink}>← Marketplace</Link>
        <span className={styles.breadSep}>/</span>
        <span className={styles.breadCurrent}>{ds.name}</span>
      </div>

      <div className={styles.layout}>
        {/* Main */}
        <div className={styles.main}>
          <div className={styles.titleRow}>
            <div>
              <div className={styles.badges}>
                <span className={`badge badge-type`}>{ds.dataType}</span>
                <span className={`badge badge-${ds.permission.toLowerCase()}`}>{ds.permission.replace('_', ' ')}</span>
                <span className={`badge badge-${ds.validationStatus.toLowerCase()}`}>{ds.validationStatus}</span>
              </div>
              <h1 className={styles.title}>{ds.name}</h1>
            </div>
            <div className={`badge badge-${ds.status.toLowerCase()}`}>{ds.status}</div>
          </div>

          <p className={styles.desc}>{ds.description}</p>

          {ds.samplePreview && (
            <div className={styles.preview}>
              <div className="section-title">Sample Preview</div>
              <pre className={styles.previewText}>{ds.samplePreview}</pre>
            </div>
          )}

          {ds.tags?.length > 0 && (
            <div className={styles.tagsSection}>
              <div className="section-title">Tags</div>
              <div className={styles.tags}>
                {ds.tags.map(t => (
                  <span key={t} className={styles.tag}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Validation scores */}
          {ds.validationStatus !== 'PENDING' && (
            <div className={`card ${styles.validationCard}`}>
              <div className="section-title">Quality Validation</div>
              <div className={styles.overallScore}>
                <div className={styles.bigScore}>{ds.qualityScore}</div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Overall Quality Score</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {ds.qualityScore >= 60 ? 'Passed validation threshold' : 'Below validation threshold'}
                  </div>
                </div>
              </div>
              <div className={styles.scoreBars}>
                <ScoreBar label="Completeness" value={vd.completeness} />
                <ScoreBar label="Accuracy" value={vd.accuracy} />
                <ScoreBar label="Authenticity" value={vd.authenticity} />
                <ScoreBar label="Consistency" value={vd.consistency} />
              </div>
              {vd.issues?.length > 0 && (
                <div className={styles.issues}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Issues</div>
                  {vd.issues.map((issue, i) => (
                    <div key={i} className={styles.issue}>⚠ {issue}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* On-chain info */}
          <div className={`card ${styles.onChainCard}`}>
            <div className="section-title">On-Chain Info</div>
            <div className={styles.infoGrid}>
              <div><span className={styles.infoLabel}>On-Chain ID</span><span className="mono">#{ds.onChainId}</span></div>
              <div><span className={styles.infoLabel}>Contributor</span><span className="address">{truncateAddress(ds.contributor)}</span></div>
              <div><span className={styles.infoLabel}>Storage Hash</span><span className="address">{ds.storageRootHash?.slice(0, 20)}...</span></div>
              <div><span className={styles.infoLabel}>Total Sales</span><span className="mono">{ds.totalSales}</span></div>
              <div><span className={styles.infoLabel}>Total Revenue</span><span className="mono">{formatWei(ds.totalRevenue)}</span></div>
              <div><span className={styles.infoLabel}>Validator</span><span className="address">{truncateAddress(ds.validatorAgent)}</span></div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={`card ${styles.purchaseCard}`}>
            <div className="section-title">Access Pricing</div>
            <div className={styles.priceItem}>
              <span className={styles.priceLabel}>Per Access</span>
              <span className={styles.priceValue}>{formatWei(ds.pricePerAccess)}</span>
            </div>
            <div className={styles.priceDivider} />
            <div className={styles.priceItem}>
              <span className={styles.priceLabel}>Subscription</span>
              <span className={styles.priceValue}>{formatWei(ds.subscriptionPrice)}</span>
            </div>

            <div className={styles.purchaseActions}>
              {hasAccess ? (
                <div className={styles.accessGranted}>
                  <span>✓</span> Access Granted
                </div>
              ) : isConnected ? (
                <>
                  <button className="btn btn-primary" style={{ width: '100%' }}>
                    Buy Access
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%' }}>
                    Subscribe
                  </button>
                </>
              ) : (
                <div className={styles.connectPrompt}>Connect wallet to purchase</div>
              )}
            </div>
          </div>

          <div className={`card ${styles.metaCard}`}>
            <div className="section-title">Details</div>
            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Type</span>
                <span className="badge badge-type">{ds.dataType}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Permission</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{ds.permission.replace('_', ' ')}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Agent Pricing</span>
                <span style={{ fontSize: 13, color: ds.agentPricingEnabled ? 'var(--success)' : 'var(--text-muted)' }}>
                  {ds.agentPricingEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaKey}>Created</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {new Date(ds.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
