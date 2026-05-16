'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle, Database, Loader2, Plus, Search, ShoppingCart, Sparkles, X } from 'lucide-react';
import { Dataset, DataType, MarketplaceScoutResponse, UsagePermission, contractActions, datasets, formatWei, getExplorerTxUrl, purchases, truncateAddress } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge, PageFrame, QualityBar, badgeColor, permissionLabel, typeMeta } from '@/components/ui/kit';

const DATA_TYPES: Array<'All' | DataType> = ['All', 'TEXT', 'CODE', 'AUDIO', 'VIDEO', 'IMAGE', 'BEHAVIORAL', 'FINANCIAL', 'DOMAIN'];
const PERMISSIONS: Array<'All' | UsagePermission> = ['All', 'AI_TRAINING', 'ANALYTICS', 'BOTH'];
const MARKETPLACE_MIN_QUALITY_SCORE = 65;

function priceTo0G(price: string) {
  const parsed = Number(price || 0);
  if (!Number.isFinite(parsed)) return 0;
  return price.includes('.') || price.length < 13 ? parsed : parsed / 1e18;
}

function DatasetCard({ ds, isPurchased }: { ds: Dataset; isPurchased: boolean }) {
  const meta = typeMeta(ds.dataType);
  return (
    <Link href={`/dataset/${ds.onChainId}`} className="card card-pad" style={{ display: 'block', borderColor: ds.validationStatus === 'APPROVED' ? 'rgba(34,197,94,0.18)' : 'var(--border)' }}>
      <div style={{ display: 'flex', gap: 11, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${meta.color}22`, display: 'grid', placeItems: 'center', color: meta.color, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 7 }}>{ds.name}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge color={badgeColor(ds.dataType)}>{meta.label}</Badge>
            <Badge color={badgeColor(ds.permission)}>{permissionLabel(ds.permission)}</Badge>
            <Badge color={isPurchased ? 'green' : badgeColor(ds.validationStatus)}>
              {isPurchased ? 'PURCHASED' : ds.validationStatus}
            </Badge>
          </div>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.55, minHeight: 39, marginBottom: 14 }}>
        {(ds.description || 'No description provided.').slice(0, 118)}
        {(ds.description || '').length > 118 ? '...' : ''}
      </p>

      <QualityBar label="Quality Score" score={ds.qualityScore || 0} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 13, marginTop: 14, borderTop: '1px solid var(--border)' }}>
        <div>
          <span style={{ color: 'var(--text)', fontSize: 17, fontWeight: 800 }}>{formatWei(ds.pricePerAccess)}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> / access</span>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {ds.totalSales ? (
            <>
              {ds.totalSales} sales
            </>
          ) : (
            <span style={{ color: 'var(--text-faint)' }}>No sales yet</span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Bot size={12} color="var(--text-muted)" />
        <span className="mono" style={{ color: 'var(--text-faint)', fontSize: 11 }}>{truncateAddress(ds.agentAddress || ds.validatorAgent)}</span>
      </div>
    </Link>
  );
}

function MarketplaceScout({
  open,
  onClose,
  purchasedIds,
  onPurchased,
}: {
  open: boolean;
  onClose: () => void;
  purchasedIds: Set<number>;
  onPurchased: (datasetIds: number[]) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarketplaceScoutResponse | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkTxHash, setBulkTxHash] = useState('');

  const runScout = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await datasets.scout({
        prompt,
        budget: budget ? Number(budget) : undefined,
        limit: 10,
      });
      setResult(res);
      setBulkError('');
      setBulkTxHash('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Marketplace scout failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const bulkPurchase = async () => {
    const purchasableResults = result?.results.filter(({ dataset }) => !purchasedIds.has(dataset.onChainId)) || [];
    if (!purchasableResults.length) return;
    setBulkLoading(true);
    setBulkError('');
    setBulkTxHash('');
    try {
      const res = await contractActions.bulkPurchase(purchasableResults.map(({ dataset }) => ({
        datasetId: dataset.onChainId,
        pricePerAccess: dataset.pricePerAccess,
      })));
      setBulkTxHash(res.txHash);
      onPurchased(purchasableResults.map(({ dataset }) => dataset.onChainId));
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : 'Bulk purchase failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  if (!open) return null;
  const purchasableResults = result?.results.filter(({ dataset }) => !purchasedIds.has(dataset.onChainId)) || [];
  const purchasedResults = result?.results.filter(({ dataset }) => purchasedIds.has(dataset.onChainId)) || [];
  const purchasableTotal = purchasableResults.reduce((sum, item) => sum + priceTo0G(item.dataset.pricePerAccess), 0);

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(3,6,12,0.78)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', padding: 18 }}>
      <section className="card card-pad" style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-light)', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              <Sparkles size={15} /> MARKETPLACE SCOUT AGENT
            </div>
            <h2 style={{ color: 'var(--text)', fontSize: 20, letterSpacing: 0 }}>Prompt the scout to find buyer-ready data</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, marginTop: 6 }}>The scout only returns approved marketplace data with a quality score of {MARKETPLACE_MIN_QUALITY_SCORE} or higher.</p>
          </div>
          <button className="icon-button" aria-label="Close marketplace scout" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-2" style={{ alignItems: 'end', marginBottom: 14 }}>
          <div>
            <label className="label">Buyer prompt</label>
            <textarea
              className="textarea"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the exact data your company wants."
              style={{ minHeight: 104 }}
            />
          </div>
          <div>
            <label className="label">Budget in 0G <Badge color="gray">Optional</Badge></label>
            <input
              className="input"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              inputMode="decimal"
              placeholder="Example: 1.5"
              style={{ marginBottom: 12 }}
            />
            <button className="btn btn-primary" onClick={runScout} disabled={loading || prompt.trim().length < 3} style={{ width: '100%', minHeight: 44 }}>
              {loading ? <Loader2 size={16} className="spin" /> : <Bot size={16} />}
              {loading ? 'Scouting marketplace...' : 'Scout Data Matches'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-red" style={{ marginBottom: 14 }}>{error}</div>}

        {result && (
          <div>
            <div className="alert alert-blue" style={{ marginBottom: 14 }}>
              <CheckCircle size={15} color="var(--green)" />
              <span>
                <strong style={{ color: 'var(--text)' }}>{result.agent.name}</strong> found {result.count} matches above {result.minimumQualityScore}/100.
                {result.interpretedIntent?.dataTypes?.length ? (
                  <span style={{ display: 'block', marginTop: 4, color: 'var(--text)' }}>
                    Searching only: {result.interpretedIntent.dataTypes.map((item) => typeMeta(item).label).join(', ')}
                  </span>
                ) : null}
                <span className="mono" style={{ display: 'block', marginTop: 4 }}>Estimated new access total: {purchasableTotal.toFixed(4)} 0G</span>
              </span>
            </div>

            {result.results.length === 0 ? (
              <div className="card card-pad" style={{ textAlign: 'center' }}>
                <Database size={30} color="var(--text-faint)" style={{ marginBottom: 10 }} />
                <div style={{ color: 'var(--text)', fontWeight: 800, marginBottom: 6 }}>No matching data found</div>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55, marginBottom: 14 }}>
                  The scout did not find approved {MARKETPLACE_MIN_QUALITY_SCORE}+ score data for that exact category and prompt.
                </p>
                {(result.suggestions || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {(result.suggestions || []).map((suggestion) => (
                      <Badge key={suggestion.dataType} color={badgeColor(suggestion.dataType)}>
                        Try {typeMeta(suggestion.dataType).label}: {suggestion.count} available
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {purchasableResults.length > 0 ? (
                  <div className="card" style={{ padding: 14, marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800 }}>Scout Basket</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>{purchasableResults.length} new datasets / estimated {purchasableTotal.toFixed(4)} 0G</div>
                      {purchasedResults.length > 0 && (
                        <div style={{ color: 'var(--green)', fontSize: 11.5, marginTop: 4 }}>{purchasedResults.length} already purchased excluded</div>
                      )}
                    </div>
                    <button className="btn btn-primary" onClick={bulkPurchase} disabled={bulkLoading}>
                      {bulkLoading ? <Loader2 size={15} className="spin" /> : <ShoppingCart size={15} />}
                      {bulkLoading ? 'Confirming basket...' : 'Pay For New Matches'}
                    </button>
                  </div>
                ) : (
                  <div className="alert alert-green" style={{ marginBottom: 12 }}>
                    <CheckCircle size={15} /> All scout matches are already purchased.
                  </div>
                )}
                {bulkTxHash && (
                  <a className="alert alert-green mono" href={getExplorerTxUrl(bulkTxHash)} target="_blank" rel="noreferrer" style={{ marginBottom: 12, textDecoration: 'none', wordBreak: 'break-all' }}>
                    Bulk purchase confirmed: {truncateAddress(bulkTxHash)}
                  </a>
                )}
                {bulkError && <div className="alert alert-red" style={{ marginBottom: 12 }}>{bulkError}</div>}
                <div style={{ display: 'grid', gap: 10 }}>
                  {result.results.map(({ dataset, relevanceScore, matchReasons }) => (
                    <div key={dataset._id} className="card" style={{ padding: 14, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 12, alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
                          <Badge color="green">{dataset.qualityScore}/100 quality</Badge>
                          <Badge color="blue">{relevanceScore}/100 match</Badge>
                          <Badge color={badgeColor(dataset.dataType)}>{typeMeta(dataset.dataType).label}</Badge>
                          {purchasedIds.has(dataset.onChainId) && <Badge color="green">PURCHASED</Badge>}
                        </div>
                        <Link href={`/dataset/${dataset.onChainId}`} style={{ color: 'var(--text)', fontWeight: 800, fontSize: 14 }}>{dataset.name}</Link>
                        <p style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.55, marginTop: 5 }}>{dataset.description.slice(0, 150)}{dataset.description.length > 150 ? '...' : ''}</p>
                        <div style={{ color: 'var(--text-faint)', fontSize: 11.5, marginTop: 7 }}>{matchReasons.join(' / ')}</div>
                      </div>
                      <div style={{ display: 'grid', gap: 8, minWidth: 150 }}>
                        <div style={{ color: 'var(--green)', fontSize: 15, fontWeight: 900, textAlign: 'right' }}>{formatWei(dataset.pricePerAccess)}</div>
                        <Link href={`/dataset/${dataset.onChainId}`} className="btn btn-secondary" style={{ minHeight: 34, padding: '0 12px' }}>
                          {purchasedIds.has(dataset.onChainId) ? 'Open License' : 'Review Single'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function MarketplacePage() {
  const { isConnected } = useAuth();
  const [items, setItems] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [dataType, setDataType] = useState<'All' | DataType>('All');
  const [permission, setPermission] = useState<'All' | UsagePermission>('All');
  const [total, setTotal] = useState(0);
  const [scoutOpen, setScoutOpen] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50', validationStatus: 'APPROVED', minQualityScore: String(MARKETPLACE_MIN_QUALITY_SCORE) };
      if (dataType !== 'All') params.dataType = dataType;
      if (permission !== 'All') params.permission = permission;
      const res = await datasets.list(params);
      setItems(res.datasets || []);
      setTotal(res.pagination.total || 0);
    } catch (error) {
      console.error(error);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dataType, permission]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!isConnected) {
      setPurchasedIds(new Set());
      return;
    }
    const loadPurchases = async () => {
      try {
        const res = await purchases.list();
        setPurchasedIds(new Set((res.purchases || []).map((purchase) => purchase.datasetId)));
      } catch (error) {
        console.error(error);
      }
    };
    loadPurchases();
  }, [isConnected]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => [item.name, item.description, item.dataType, item.permission, ...(item.tags || [])].join(' ').toLowerCase().includes(term));
  }, [items, query]);

  return (
    <PageFrame title="Marketplace" subtitle="Browse verified data licenses for research, analytics, AI workflows, and business intelligence.">
      <MarketplaceScout
        open={scoutOpen}
        onClose={() => setScoutOpen(false)}
        purchasedIds={purchasedIds}
        onPurchased={(datasetIds) => setPurchasedIds((current) => new Set([...current, ...datasetIds]))}
      />

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '0 14px', minHeight: 40 }}>
          <Search size={14} color="var(--text-muted)" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search data licenses, types, tags..." style={{ background: 'transparent', border: 0, outline: 0, color: 'var(--text)', fontSize: 13.5, flex: 1 }} />
        </div>
        <button className="btn btn-primary" onClick={() => setScoutOpen(true)} title={`Ask the marketplace scout to find approved ${MARKETPLACE_MIN_QUALITY_SCORE}+ score data`}>
          <Sparkles size={14} /> AI Scout
        </button>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="section-kicker">Type</span>
          {DATA_TYPES.map((type) => (
            <button key={type} onClick={() => setDataType(type)} className="btn" style={{ minHeight: 28, padding: '0 12px', borderRadius: 999, background: dataType === type ? 'rgba(59,124,246,0.14)' : 'transparent', borderColor: dataType === type ? 'var(--accent)' : 'var(--border)', color: dataType === type ? 'var(--accent-light)' : 'var(--text-muted)', fontSize: 12 }}>
              {type === 'All' ? 'All' : typeMeta(type).label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="section-kicker">Usage</span>
          {PERMISSIONS.map((item) => (
            <button key={item} onClick={() => setPermission(item)} className="btn" style={{ minHeight: 28, padding: '0 12px', borderRadius: 999, background: permission === item ? 'rgba(6,182,212,0.12)' : 'transparent', borderColor: permission === item ? 'var(--cyan)' : 'var(--border)', color: permission === item ? 'var(--cyan)' : 'var(--text-muted)', fontSize: 12 }}>
              {item === 'All' ? 'All' : permissionLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>{filtered.length} of {total} data licenses shown</div>

      {loading ? (
        <div className="loading-state">Loading marketplace...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card">
          <Database size={36} color="var(--text-faint)" />
          <div style={{ color: 'var(--text)', fontWeight: 700 }}>No licenses found</div>
          <div>Be the first to create a data license in this category.</div>
          <Link href="/upload" className="btn btn-primary">
            <Plus size={15} /> Create Data License
          </Link>
        </div>
      ) : (
        <div className="grid grid-2">
          {filtered.map((item) => <DatasetCard key={item._id} ds={item} isPurchased={purchasedIds.has(item.onChainId)} />)}
        </div>
      )}
    </PageFrame>
  );
}
