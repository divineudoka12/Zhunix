'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, ChevronLeft, ChevronRight, DollarSign, ExternalLink, FileText, Package, TrendingUp, Wallet } from 'lucide-react';
import { Dataset, Purchase, contractActions, datasets, formatWei, purchases, truncateAddress } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge, PageFrame, StatCard, badgeColor, typeMeta } from '@/components/ui/kit';

export default function DashboardPage() {
  const { isConnected, address, connect } = useAuth();
  const [myPurchases, setMyPurchases] = useState<Purchase[]>([]);
  const [myDatasets, setMyDatasets] = useState<Dataset[]>([]);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawTx, setWithdrawTx] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [licensePage, setLicensePage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const licensePageSize = 10;
  const activityPageSize = 5;

  useEffect(() => {
    if (!isConnected || !address) return;
    const load = async () => {
      setLoading(true);
      try {
        const [purchaseRes, balanceRes, datasetRes] = await Promise.all([
          purchases.list(),
          purchases.balance(),
          datasets.list({ contributor: address, limit: '50' }),
        ]);
        setMyPurchases(purchaseRes.purchases || []);
        setBalance(balanceRes.balance || '0');
        setMyDatasets(datasetRes.datasets || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isConnected, address]);

  const totals = useMemo(() => {
    const sales = myDatasets.reduce((sum, item) => sum + (item.totalSales || 0), 0);
    const score = myDatasets.length ? Math.round(myDatasets.reduce((sum, item) => sum + (item.qualityScore || 0), 0) / myDatasets.length) : 0;
    return { sales, score };
  }, [myDatasets]);
  const agentStats = useMemo(() => {
    const approved = myDatasets.filter((item) => item.validationStatus === 'APPROVED').length;
    const rejected = myDatasets.filter((item) => item.validationStatus === 'REJECTED').length;
    const pending = myDatasets.filter((item) => item.validationStatus === 'PENDING').length;
    const pricingEnabled = myDatasets.filter((item) => item.agentPricingEnabled).length;
    return { approved, rejected, pending, pricingEnabled };
  }, [myDatasets]);
  const agentActivities = useMemo(() => myDatasets
    .map((item) => {
      const meta = typeMeta(item.dataType);
      const statusText = item.validationStatus === 'APPROVED'
        ? 'Validation agent approved this license for marketplace use'
        : item.validationStatus === 'REJECTED'
          ? 'Validation agent rejected this license'
          : 'Validation agent is reviewing this license';
      const pricingText = item.agentPricingEnabled
        ? 'Pricing agent enabled'
        : 'Pricing agent disabled';

      return {
        id: item._id,
        href: `/dataset/${item.onChainId}`,
        name: item.name || `License #${item.onChainId}`,
        icon: meta.icon,
        color: meta.color,
        status: item.validationStatus,
        score: item.qualityScore || 0,
        updatedAt: item.validationTimestamp || item.updatedAt || item.createdAt,
        summary: `${statusText}. ${pricingText}.`,
      };
    })
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()),
    [myDatasets]
  );
  const licensePages = Math.max(1, Math.ceil(myDatasets.length / licensePageSize));
  const activityPages = Math.max(1, Math.ceil(agentActivities.length / activityPageSize));
  const paginatedDatasets = useMemo(
    () => myDatasets.slice((licensePage - 1) * licensePageSize, licensePage * licensePageSize),
    [licensePage, myDatasets]
  );
  const paginatedActivities = useMemo(
    () => agentActivities.slice((activityPage - 1) * activityPageSize, activityPage * activityPageSize),
    [activityPage, agentActivities]
  );

  useEffect(() => {
    setLicensePage(1);
    setActivityPage(1);
  }, [myDatasets.length]);

  const withdraw = async () => {
    setWithdrawLoading(true);
    setWithdrawTx('');
    setWithdrawError('');
    try {
      const res = await contractActions.withdrawEarnings();
      setWithdrawTx(res.txHash);
      const balanceRes = await purchases.balance();
      setBalance(balanceRes.balance || '0');
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <PageFrame>
        <div className="connect-wall">
          <Wallet size={42} color="var(--text-faint)" />
          <h2 style={{ color: 'var(--text)' }}>Connect Your Wallet</h2>
          <p>View your data licenses, purchases, earnings, and agent activity.</p>
          <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
        </div>
      </PageFrame>
    );
  }

  if (loading) {
    return <PageFrame><div className="loading-state">Loading dashboard...</div></PageFrame>;
  }

  return (
    <PageFrame title="Dashboard" subtitle="Your data licensing activity, earnings, agent insights, and purchase history.">
      <div className="grid grid-5" style={{ marginBottom: 26 }}>
        <StatCard icon={FileText} label="Active Licenses" value={myDatasets.length} color="var(--accent)" />
        <StatCard icon={TrendingUp} label="Total Sales" value={totals.sales} color="var(--cyan)" />
        <StatCard icon={DollarSign} label="Earnings" value={formatWei(balance)} color="var(--amber)" sub="Ready to withdraw" />
        <StatCard icon={Package} label="Purchases" value={myPurchases.length} color="var(--purple)" />
        <StatCard icon={Award} label="Avg Quality Score" value={totals.score || '-'} color="var(--green)" sub="Across all licenses" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <section className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: 'var(--text)', fontSize: 15 }}>My Data Licenses</h2>
            <Link href="/upload" className="btn btn-ghost" style={{ minHeight: 30 }}>Create</Link>
          </div>
          {myDatasets.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No licenses yet. Create your first data license to start earning.</p>
          ) : (
            paginatedDatasets.map((item) => {
              const meta = typeMeta(item.dataType);
              return (
                <Link key={item._id} href={`/dataset/${item.onChainId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ color: meta.color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800 }}>{meta.icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ color: 'var(--text)', display: 'block', fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{item.name}</span>
                      <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>{item.totalSales} sales</span>
                    </span>
                  </div>
                  <Badge color={badgeColor(item.validationStatus)}>{item.validationStatus}</Badge>
                </Link>
              );
            })
          )}
          {myDatasets.length > licensePageSize && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 14 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Page {licensePage} of {licensePages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="icon-button" aria-label="Previous licenses page" onClick={() => setLicensePage((page) => Math.max(1, page - 1))} disabled={licensePage === 1}>
                  <ChevronLeft size={15} />
                </button>
                <button className="icon-button" aria-label="Next licenses page" onClick={() => setLicensePage((page) => Math.min(licensePages, page + 1))} disabled={licensePage === licensePages}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <h2 style={{ color: 'var(--text)', fontSize: 15 }}>Agent Activity</h2>
            <Badge color={agentStats.pending ? 'amber' : 'green'}>{agentStats.pending} pending</Badge>
          </div>

          <div className="grid grid-4" style={{ gap: 8, marginBottom: 12 }}>
            {[
              ['Approved', agentStats.approved, 'var(--green)'],
              ['Rejected', agentStats.rejected, 'var(--red)'],
              ['Avg Score', totals.score || '-', 'var(--cyan)'],
              ['Pricing', agentStats.pricingEnabled, 'var(--purple)'],
            ].map(([label, value, color]) => (
              <div key={String(label)} style={{ padding: 10, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 10.5, marginBottom: 4 }}>{String(label)}</div>
                <div style={{ color: String(color), fontSize: 16, fontWeight: 900 }}>{String(value)}</div>
              </div>
            ))}
          </div>

          {agentActivities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No agent activity yet. Create a data license to start validation and pricing workflows.</p>
          ) : (
            paginatedActivities.map((activity) => (
              <Link key={activity.id} href={activity.href} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: activity.color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, width: 34, flexShrink: 0 }}>{activity.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ color: 'var(--text)', fontSize: 12.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activity.name}</span>
                    <Badge color={badgeColor(activity.status)}>{activity.status}</Badge>
                  </span>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11.5, lineHeight: 1.45 }}>{activity.summary}</span>
                  <span style={{ display: 'block', color: 'var(--text-faint)', fontSize: 11, marginTop: 4 }}>
                    Quality score {activity.score}/100 / {new Date(activity.updatedAt).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            ))
          )}

          {agentActivities.length > activityPageSize && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 14 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Page {activityPage} of {activityPages}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="icon-button" aria-label="Previous agent activity page" onClick={() => setActivityPage((page) => Math.max(1, page - 1))} disabled={activityPage === 1}>
                  <ChevronLeft size={15} />
                </button>
                <button className="icon-button" aria-label="Next agent activity page" onClick={() => setActivityPage((page) => Math.min(activityPages, page + 1))} disabled={activityPage === activityPages}>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-2">
        <section className="card card-pad">
          <h2 style={{ color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>My Purchases</h2>
          {myPurchases.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No purchases yet. Browse the marketplace to access verified data licenses.</p>
          ) : (
            myPurchases.map((purchase) => (
              <div key={purchase._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>License #{purchase.datasetId}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{purchase.isSubscription ? 'Subscription' : 'One-time'} / {new Date(purchase.createdAt).toLocaleDateString()}</div>
                </div>
                <Link href={`/dataset/${purchase.datasetId}`} className="btn btn-ghost" style={{ minHeight: 30 }}>
                  <ExternalLink size={12} /> Access
                </Link>
              </div>
            ))
          )}
        </section>

        <section className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <h2 style={{ color: 'var(--text)', fontSize: 15 }}>Earnings & Withdrawals</h2>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginBottom: 5 }}>Available to withdraw</div>
          <div style={{ color: 'var(--green)', fontSize: 38, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 }}>{formatWei(balance)}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>Withdrawals are settled directly by the marketplace smart contract to your connected wallet.</p>
          <button className="btn btn-green" style={{ width: '100%', marginTop: 18 }} onClick={withdraw} disabled={withdrawLoading || Number(balance) <= 0}>
            <Wallet size={15} /> {withdrawLoading ? 'Confirming...' : 'Withdraw Earnings'}
          </button>
          {withdrawTx && <div className="alert alert-green mono" style={{ marginTop: 12 }}>Tx confirmed: {truncateAddress(withdrawTx)}</div>}
          {withdrawError && <div className="alert alert-red" style={{ marginTop: 12 }}>{withdrawError}</div>}
        </section>
      </div>
    </PageFrame>
  );
}
