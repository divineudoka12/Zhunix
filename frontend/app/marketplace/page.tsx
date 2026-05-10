'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { datasets, Dataset, DataType, UsagePermission, truncateAddress, formatWei } from '@/lib/api';
import styles from './page.module.css';

const DATA_TYPES: DataType[] = ['TEXT', 'CODE', 'AUDIO', 'VIDEO', 'IMAGE', 'BEHAVIORAL', 'FINANCIAL', 'DOMAIN'];
const PERMISSIONS: UsagePermission[] = ['AI_TRAINING', 'ANALYTICS', 'BOTH'];

function ScoreMeter({ score }: { score: number }) {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#e8192c';
  return (
    <div className={styles.score}>
      <div className={styles.scoreMeter}>
        <div className={styles.scoreFill} style={{ width: `${score}%`, background: color }} />
      </div>
      <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{score}</span>
    </div>
  );
}

function DatasetCard({ ds }: { ds: Dataset }) {
  return (
    <Link href={`/dataset/${ds.onChainId}`} className={`card card-red-hover ${styles.card}`}>
      <div className={styles.cardTop}>
        <span className={`badge badge-type`}>{ds.dataType}</span>
        <span className={`badge badge-${ds.validationStatus.toLowerCase()}`}>{ds.validationStatus}</span>
      </div>
      <h3 className={styles.cardName}>{ds.name}</h3>
      <p className={styles.cardDesc}>{ds.description?.slice(0, 100)}{ds.description?.length > 100 ? '...' : ''}</p>

      <div className={styles.cardMeta}>
        <div className={styles.cardMetaItem}>
          <span className={styles.metaLabel}>Quality</span>
          <ScoreMeter score={ds.qualityScore} />
        </div>
        <div className={styles.cardMetaItem}>
          <span className={styles.metaLabel}>Access</span>
          <span className={styles.metaValue}>{formatWei(ds.pricePerAccess)}</span>
        </div>
        <div className={styles.cardMetaItem}>
          <span className={styles.metaLabel}>Sales</span>
          <span className={styles.metaValue}>{ds.totalSales}</span>
        </div>
      </div>

      {ds.tags?.length > 0 && (
        <div className={styles.tags}>
          {ds.tags.slice(0, 4).map(t => (
            <span key={t} className={styles.tag}>{t}</span>
          ))}
        </div>
      )}

      <div className={styles.cardFooter}>
        <span className="address">{truncateAddress(ds.contributor)}</span>
        <span className={`badge badge-${ds.status.toLowerCase()}`}>{ds.status}</span>
      </div>
    </Link>
  );
}

export default function MarketplacePage() {
  const [data, setData] = useState<Dataset[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ dataType: '', permission: '', page: '1' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: filters.page, limit: '12' };
      if (filters.dataType) params.dataType = filters.dataType;
      if (filters.permission) params.permission = filters.permission;
      const res = await datasets.list(params);
      setData(res.datasets);
      setPagination(res.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className="section-title">Browse</div>
          <h1 className={styles.title}>Data Marketplace</h1>
          <p className={styles.sub}>{pagination.total} datasets available</p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className="input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={filters.dataType}
          onChange={e => setFilters(f => ({ ...f, dataType: e.target.value, page: '1' }))}
        >
          <option value="">All Types</option>
          {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          className="input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={filters.permission}
          onChange={e => setFilters(f => ({ ...f, permission: e.target.value, page: '1' }))}
        >
          <option value="">All Permissions</option>
          {PERMISSIONS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
        </select>
        <button className="btn btn-ghost" onClick={() => setFilters({ dataType: '', permission: '', page: '1' })}>
          Clear
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className={styles.loadingGrid}>
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className={`card ${styles.skeleton}`} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>◈</div>
          <p>No datasets found</p>
          <Link href="/upload" className="btn btn-primary">Upload the first one</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {data.map(ds => <DatasetCard key={ds._id} ds={ds} />)}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className={styles.pagination}>
          <button
            className="btn btn-ghost"
            disabled={filters.page === '1'}
            onClick={() => setFilters(f => ({ ...f, page: String(+f.page - 1) }))}
          >← Prev</button>
          <span className={styles.pageInfo}>
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={+filters.page >= pagination.pages}
            onClick={() => setFilters(f => ({ ...f, page: String(+f.page + 1) }))}
          >Next →</button>
        </div>
      )}
    </div>
  );
}
