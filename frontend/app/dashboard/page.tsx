'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { purchases, datasets, Purchase, Dataset, truncateAddress, formatWei } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './page.module.css';

export default function DashboardPage() {
  const { isConnected, address, connect } = useAuth();
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [myDatasets, setMyDatasets] = useState<Dataset[]>([]);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) return;
    const load = async () => {
      try {
        const [pRes, bRes, dRes] = await Promise.all([
          purchases.list(),
          purchases.balance(),
          datasets.list({ contributor: address!, limit: '50' }),
        ]);
        setMyPurchases(pRes.purchases);
        setBalance(bRes.balance);
        setMyDatasets(dRes.datasets);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isConnected, address]);

  if (!isConnected) {
    return (
      <div className={styles.connectWall}>
        <div className={styles.connectIcon}>◆</div>
        <h2>Connect Your Wallet</h2>
        <p>View your datasets, purchases, and earnings.</p>
        <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
      </div>
    );
  }

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>;

  const totalSales = myDatasets.reduce((acc, d) => acc + d.totalSales, 0);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className="section-title">Account</div>
          <h1 className={styles.title}>Dashboard</h1>
          <span className="address">{address}</span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className="stat-number">{myDatasets.length}</div>
          <div className="stat-label">My Datasets</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="stat-number">{totalSales}</div>
          <div className="stat-label">Total Sales</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="stat-number">{myPurchases.length}</div>
          <div className="stat-label">Purchases</div>
        </div>
        <div className={`card ${styles.statCard}`}>
          <div className="stat-number" style={{ fontSize: 20 }}>{formatWei(balance)}</div>
          <div className="stat-label">Pending Balance</div>
        </div>
      </div>

      {/* My Datasets */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className="section-title">My Datasets</div>
          <Link href="/upload" className="btn btn-outline-red" style={{ padding: '6px 14px', fontSize: '12px' }}>
            + Upload New
          </Link>
        </div>
        {myDatasets.length === 0 ? (
          <div className={styles.empty}>No datasets yet. <Link href="/upload" style={{ color: 'var(--red)' }}>Upload one →</Link></div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Validation</th>
                  <th>Score</th>
                  <th>Sales</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {myDatasets.map(ds => (
                  <tr key={ds._id}>
                    <td className={styles.dsName}>{ds.name}</td>
                    <td><span className="badge badge-type">{ds.dataType}</span></td>
                    <td><span className={`badge badge-${ds.status.toLowerCase()}`}>{ds.status}</span></td>
                    <td><span className={`badge badge-${ds.validationStatus.toLowerCase()}`}>{ds.validationStatus}</span></td>
                    <td className="mono" style={{ color: ds.qualityScore >= 60 ? 'var(--success)' : 'var(--red)' }}>{ds.qualityScore}</td>
                    <td className="mono">{ds.totalSales}</td>
                    <td>
                      <Link href={`/dataset/${ds.onChainId}`} className={styles.viewLink}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Purchases */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className="section-title">My Purchases</div>
        </div>
        {myPurchases.length === 0 ? (
          <div className={styles.empty}>No purchases yet. <Link href="/marketplace" style={{ color: 'var(--red)' }}>Browse marketplace →</Link></div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dataset ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Subscription</th>
                  <th>Expires</th>
                  <th>TX Hash</th>
                </tr>
              </thead>
              <tbody>
                {myPurchases.map(p => (
                  <tr key={p._id}>
                    <td className="mono">#{p.datasetId}</td>
                    <td><span className={`badge badge-${p.isSubscription ? 'pending' : 'type'}`}>{p.isSubscription ? 'Subscription' : 'One-time'}</span></td>
                    <td className="mono">{formatWei(p.amount)}</td>
                    <td>{p.isSubscription ? 'Yes' : '—'}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{p.subscriptionExpiresAt ? new Date(p.subscriptionExpiresAt).toLocaleDateString() : '—'}</td>
                    <td className="address">{truncateAddress(p.txHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
