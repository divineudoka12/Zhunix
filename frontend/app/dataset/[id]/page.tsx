'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, AlertTriangle, Award, Bot, CheckCircle, Database, FileText, Globe, Hash, KeyRound, Shield, Wallet } from 'lucide-react';
import {
  Dataset,
  LicensedAccess,
  LicensedQueryFormat,
  LicensedQueryResult,
  LicensedUseAction,
  LicensedUseResult,
  ShareAttemptResult,
  contractActions,
  datasets,
  formatWei,
  getExplorerTxUrl,
  purchases,
  truncateAddress,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge, PageFrame, QualityBar, badgeColor, permissionLabel, typeMeta } from '@/components/ui/kit';

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected, address, connect } = useAuth();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [licensedAccess, setLicensedAccess] = useState<LicensedAccess | null>(null);
  const [useLoading, setUseLoading] = useState<LicensedUseAction | null>(null);
  const [useResult, setUseResult] = useState<LicensedUseResult | null>(null);
  const [useError, setUseError] = useState('');
  const [queryPrompt, setQueryPrompt] = useState('Give me an anonymized, license-safe summary of this dataset.');
  const [queryFormat, setQueryFormat] = useState<LicensedQueryFormat>('CSV');
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<LicensedQueryResult | null>(null);
  const [queryError, setQueryError] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareResult, setShareResult] = useState<ShareAttemptResult | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await datasets.get(id);
        setDataset(res.dataset);
        if (isConnected) {
          const access = await purchases.checkAccess(id);
          setHasAccess(access.hasAccess);
          if (access.hasAccess) {
            const licensed = await purchases.licensed(id);
            setLicensedAccess(licensed.access);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isConnected]);

  if (loading) return <PageFrame><div className="loading-state">Loading data license...</div></PageFrame>;
  if (!dataset) return <PageFrame><div className="empty-state">Data license not found.</div></PageFrame>;

  const meta = typeMeta(dataset.dataType);
  const details = dataset.validationDetails;
  const validationIssues = details?.issues?.filter(Boolean) || [];
  const validationRecommendations = details?.recommendations?.filter(Boolean) || [];
  const isContributor = Boolean(address && dataset.contributor?.toLowerCase() === address.toLowerCase());
  const qualitySummary = dataset.validationStatus === 'APPROVED'
    ? validationIssues.length > 0 || validationRecommendations.length > 0
      ? 'Approved for marketplace use with minor cleanup recommendations.'
      : 'Approved for marketplace use with no major quality concerns detected.'
    : dataset.validationStatus === 'PENDING'
      ? 'Quality review is still processing. Marketplace visibility may update after validation.'
      : 'This dataset did not meet the current marketplace quality or compliance threshold.';
  const purchaseTxHash = licensedAccess?.purchaseTxHash || txHash;

  const refreshAccess = async () => {
    if (!isConnected) return;
    const access = await purchases.checkAccess(id);
    setHasAccess(access.hasAccess);
    if (access.hasAccess) {
      const licensed = await purchases.licensed(id);
      setLicensedAccess(licensed.access);
    }
  };

  const buyAccess = async () => {
    if (!isConnected) {
      await connect();
      return;
    }
    setTxLoading(true);
    setTxError('');
    setTxHash('');
    try {
      const res = await contractActions.purchaseAccess(dataset.onChainId, dataset.pricePerAccess);
      setTxHash(res.txHash);
      await refreshAccess();
      setLicensedAccess((current) => current ? { ...current, purchaseTxHash: current.purchaseTxHash || res.txHash } : current);
      window.setTimeout(() => setTxHash(''), 18000);
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setTxLoading(false);
    }
  };

  const runLicensedUse = async (action: LicensedUseAction) => {
    setUseLoading(action);
    setUseError('');
    try {
      const res = await purchases.useLicensed(dataset.onChainId, action);
      setUseResult(res.result);
      setLicensedAccess((current) => current
        ? { ...current, usageLog: [res.result.auditEvent, ...current.usageLog] }
        : current
      );
    } catch (err) {
      setUseError(err instanceof Error ? err.message : 'Licensed use failed');
    } finally {
      setUseLoading(null);
    }
  };

  const runLicensedQuery = async () => {
    setQueryLoading(true);
    setQueryError('');
    try {
      const res = await purchases.queryLicensed(dataset.onChainId, queryPrompt, queryFormat);
      setQueryResult(res.result);
      setLicensedAccess((current) => current
        ? { ...current, usageLog: [res.result.auditEvent, ...current.usageLog] }
        : current
      );
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : 'Licensed query failed');
    } finally {
      setQueryLoading(false);
    }
  };

  const simulateShareAttempt = async () => {
    setShareLoading(true);
    try {
      const res = await purchases.checkShare(dataset.onChainId);
      setShareResult(res.result);
      setLicensedAccess((current) => current
        ? { ...current, usageLog: [res.result.auditEvent, ...current.usageLog] }
        : current
      );
    } finally {
      setShareLoading(false);
    }
  };

  return (
    <PageFrame title={dataset.name} subtitle={`Data License / ${permissionLabel(dataset.permission)} / ${meta.label}`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 22, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
            <Badge color={badgeColor(dataset.validationStatus)}><CheckCircle size={10} /> {dataset.validationStatus}</Badge>
            <Badge color={badgeColor(dataset.dataType)}>{meta.label}</Badge>
            <Badge color={badgeColor(dataset.permission)}>{permissionLabel(dataset.permission)}</Badge>
            {(dataset.tags || []).slice(0, 4).map((tag) => <Badge key={tag} color="gray">{tag}</Badge>)}
          </div>

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.75 }}>{dataset.description}</p>
          </div>

          {hasAccess && licensedAccess && (
            <div className="card card-pad" style={{ marginBottom: 16, borderColor: 'rgba(34,197,94,0.25)' }}>
              <h2 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color="var(--green)" /> Licensed Data Room
              </h2>
              <div className="alert alert-green" style={{ marginBottom: 14 }}>
                <Shield size={15} /> This access is wallet-bound and non-transferable. Only {truncateAddress(licensedAccess.licenseHolder)} can use this license.
              </div>

              <div style={{ border: '1px solid rgba(59,124,246,0.22)', borderRadius: 8, padding: 16, marginBottom: 14, background: 'rgba(59,124,246,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div className="label">License Certificate</div>
                    <div style={{ color: 'var(--text)', fontSize: 20, fontWeight: 900 }}>{licensedAccess.certificateId}</div>
                  </div>
                  <Badge color="green">{licensedAccess.certificateStatus}</Badge>
                </div>
                <div className="grid grid-2" style={{ gap: 10 }}>
                  <div>
                    <div className="label">Certificate Holder</div>
                    <div className="mono" style={{ color: 'var(--text)', fontSize: 12 }}>{truncateAddress(licensedAccess.licenseHolder)}</div>
                  </div>
                  <div>
                    <div className="label">Data Owner</div>
                    <div className="mono" style={{ color: 'var(--text)', fontSize: 12 }}>{truncateAddress(licensedAccess.contributor)}</div>
                  </div>
                  <div>
                    <div className="label">Issued</div>
                    <div style={{ color: 'var(--text)', fontSize: 12 }}>{new Date(licensedAccess.certificateIssuedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="label">Transfer</div>
                    <div style={{ color: 'var(--green)', fontSize: 12, fontWeight: 800 }}>{licensedAccess.nonTransferable ? 'Non-transferable' : 'Transferable'}</div>
                  </div>
                  <div>
                    <div className="label">Purchase Tx</div>
                    {purchaseTxHash ? (
                      <a
                        className="mono"
                        href={getExplorerTxUrl(purchaseTxHash)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-light)', fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3 }}
                      >
                        {truncateAddress(purchaseTxHash)}
                      </a>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Indexing on-chain purchase</div>
                    )}
                  </div>
                  <div>
                    <div className="label">Expiry</div>
                    <div style={{ color: 'var(--text)', fontSize: 12 }}>
                      {licensedAccess.subscriptionExpiresAt ? new Date(licensedAccess.subscriptionExpiresAt).toLocaleDateString() : 'No subscription expiry'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12, marginBottom: 14 }}>
                <div style={{ padding: 13, background: 'var(--surface-3)', borderRadius: 8 }}>
                  <div className="label">Access Token</div>
                  <div className="mono" style={{ color: 'var(--green)', fontSize: 12, wordBreak: 'break-all' }}>{licensedAccess.accessToken}</div>
                </div>
                <div style={{ padding: 13, background: 'var(--surface-3)', borderRadius: 8 }}>
                  <div className="label">Allowed Use</div>
                  <div style={{ color: 'var(--text)', fontWeight: 800 }}>{permissionLabel(licensedAccess.usagePermission)}</div>
                </div>
                <div style={{ padding: 13, background: 'var(--surface-3)', borderRadius: 8 }}>
                  <div className="label">Access Mode</div>
                  <div style={{ color: 'var(--text)', fontWeight: 800 }}>{licensedAccess.accessMode}</div>
                </div>
                <div style={{ padding: 13, background: 'var(--surface-3)', borderRadius: 8 }}>
                  <div className="label">Purchase Type</div>
                  <div style={{ color: 'var(--text)', fontWeight: 800 }}>{licensedAccess.purchaseType.replace('_', ' ')}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                {licensedAccess.policy.map((policy) => (
                  <div key={policy} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.55 }}>
                    <KeyRound size={14} color="var(--cyan)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <span>{policy}</span>
                  </div>
                ))}
              </div>
              {licensedAccess.storageSubmissionUrl ? (
                <a className="btn btn-secondary" href={licensedAccess.storageSubmissionUrl} target="_blank" rel="noreferrer" style={{ width: '100%', marginBottom: 12 }}>
                  <Globe size={15} /> Open 0G Storage Proof
                </a>
              ) : (
                <div className="alert alert-blue mono" style={{ marginBottom: 12, wordBreak: 'break-all' }}>
                  <Hash size={14} /> {licensedAccess.storageRootHash}
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 2, marginBottom: 14 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Company Use Simulation</div>
                <div className="grid grid-3" style={{ gap: 10 }}>
                  {[
                    ['AI_TRAINING_JOB', 'Run AI Training Job', Bot],
                    ['ANALYTICS_QUERY', 'Run Analytics Query', Activity],
                    ['DERIVED_INSIGHT', 'Request Derived Insight', Database],
                  ].map(([action, label, Icon]) => (
                    <button
                      key={String(action)}
                      className="btn btn-secondary"
                      onClick={() => runLicensedUse(action as LicensedUseAction)}
                      disabled={!!useLoading}
                      style={{ minHeight: 42, padding: '0 10px' }}
                    >
                      {typeof Icon !== 'string' && <Icon size={14} />}
                      {useLoading === action ? 'Running...' : String(label)}
                    </button>
                  ))}
                </div>
                {useResult && (
                  <div className="alert alert-blue" style={{ marginTop: 12 }}>
                    <Shield size={15} />
                    <span>
                      <strong style={{ color: 'var(--text)' }}>{useResult.actionLabel} complete:</strong> {useResult.message}
                      <span className="mono" style={{ display: 'block', marginTop: 6, color: 'var(--accent-light)' }}>
                        {useResult.runId} / {useResult.outputType} / Shareable: {useResult.shareable ? 'Yes' : 'No'}
                      </span>
                    </span>
                  </div>
                )}
                {useError && <div className="alert alert-red" style={{ marginTop: 12 }}>{useError}</div>}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                  <FileText size={15} color="var(--accent-light)" /> Controlled AI Query
                </div>
                <textarea
                  className="textarea"
                  value={queryPrompt}
                  onChange={(event) => setQueryPrompt(event.target.value)}
                  placeholder="Ask for a licensed, anonymized output. Source data stays with the owner."
                  style={{ marginBottom: 10, minHeight: 82 }}
                />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  {(['CSV', 'TSV', 'JSON', 'JSONL', 'SQL'] as LicensedQueryFormat[]).map((format) => (
                    <button
                      key={format}
                      className="btn"
                      onClick={() => setQueryFormat(format)}
                      style={{
                        minHeight: 32,
                        background: queryFormat === format ? 'rgba(59,124,246,0.16)' : 'var(--surface-3)',
                        borderColor: queryFormat === format ? 'var(--accent)' : 'var(--border)',
                        color: queryFormat === format ? 'var(--accent-light)' : 'var(--text-muted)',
                      }}
                    >
                      {format}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={runLicensedQuery} disabled={queryLoading || !queryPrompt.trim()} style={{ width: '100%', marginBottom: 10 }}>
                  <Database size={15} /> {queryLoading ? 'Running licensed query...' : 'Run Licensed Query'}
                </button>
                {queryResult && (
                  <div style={{ background: 'var(--surface-3)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 800 }}>{queryResult.queryId}</span>
                      <span style={{ color: 'var(--green)', fontSize: 12, fontWeight: 800 }}>Source transferred: {queryResult.sourceDataTransferred ? 'Yes' : 'No'}</span>
                    </div>
                    <pre className="mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, padding: 12, color: 'var(--text-muted)', fontSize: 11.5, lineHeight: 1.55, maxHeight: 260, overflow: 'auto' }}>{queryResult.output}</pre>
                  </div>
                )}
                {queryError && <div className="alert alert-red" style={{ marginTop: 10 }}>{queryError}</div>}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Transfer Protection Demo</div>
                <button className="btn btn-secondary" onClick={simulateShareAttempt} disabled={shareLoading} style={{ width: '100%' }}>
                  <Shield size={15} /> {shareLoading ? 'Checking another wallet...' : 'Simulate Another Company Access'}
                </button>
                {shareResult && (
                  <div className={shareResult.allowed ? 'alert alert-green' : 'alert alert-red'} style={{ marginTop: 10 }}>
                    <Shield size={15} />
                    <span>
                      <strong>{shareResult.allowed ? 'Access allowed' : 'Access denied'}:</strong> {shareResult.reason}
                      <span className="mono" style={{ display: 'block', marginTop: 6 }}>
                        holder {truncateAddress(shareResult.licenseHolder)} / attempted {truncateAddress(shareResult.attemptedWallet)}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ color: 'var(--text)', fontSize: 13, fontWeight: 800, marginBottom: 8, display: 'flex', gap: 7, alignItems: 'center' }}>
                  <Activity size={15} color="var(--accent-light)" /> Usage Audit Trail
                </div>
                {licensedAccess.usageLog.map((event) => (
                  <div key={`${event.action}-${event.timestamp}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text)' }}>{event.action.replaceAll('_', ' ')}</span>
                    <span className="mono" style={{ color: 'var(--text-muted)' }}>{truncateAddress(event.actor)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            {[
              ['Total Sales', String(dataset.totalSales), 'var(--accent)'],
              ['Quality Score', `${dataset.qualityScore || 0}/100`, 'var(--green)'],
              ['Status', dataset.status, 'var(--text-muted)'],
            ].map(([label, value, color]) => (
              <div key={label} className="card" style={{ padding: '13px 14px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 5 }}>{label}</div>
                <div style={{ color, fontSize: 17, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>

          {dataset.samplePreview && (
            <div className="card card-pad" style={{ marginBottom: 16 }}>
              <h2 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 12 }}>Sample Preview</h2>
              <pre className="mono" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>{dataset.samplePreview}</pre>
            </div>
          )}

          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <h2 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={16} color="var(--amber)" /> Quality Validation
            </h2>
            <div className={dataset.validationStatus === 'REJECTED' ? 'alert alert-red' : 'alert alert-blue'} style={{ marginBottom: 14 }}>
              {dataset.validationStatus === 'APPROVED' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
              <span>
                <strong style={{ color: 'var(--text)' }}>{dataset.validationStatus}</strong>
                <span style={{ display: 'block', marginTop: 4 }}>{qualitySummary}</span>
              </span>
            </div>
            <QualityBar label="Completeness" score={details?.completeness || 0} />
            <QualityBar label="Accuracy" score={details?.accuracy || 0} />
            <QualityBar label="Authenticity" score={details?.authenticity || 0} />
            <QualityBar label="Consistency" score={details?.consistency || 0} />
            {dataset.validationStatus === 'REJECTED' && isContributor && (
              <div className="alert alert-red" style={{ marginTop: 14 }}>
                <AlertTriangle size={15} />
                <span>
                  <strong style={{ color: 'var(--text)' }}>Contributor validation details.</strong>
                  <span style={{ display: 'block', marginTop: 4 }}>
                    {validationIssues.length > 0
                      ? validationIssues.slice(0, 4).join(' ')
                      : 'This data did not meet the marketplace quality or compliance threshold.'}
                  </span>
                </span>
              </div>
            )}
            {dataset.validationStatus !== 'REJECTED' && isContributor && validationIssues.length > 0 && (
              <div className="alert alert-blue" style={{ marginTop: 14 }}>
                <AlertTriangle size={15} />
                {validationIssues.slice(0, 3).join(' ')}
              </div>
            )}
            {isContributor && validationRecommendations.length > 0 && (
              <div className="alert alert-blue" style={{ marginTop: 14 }}>
                {validationRecommendations.slice(0, 2).join(' ')}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <h2 style={{ color: 'var(--text)', fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={15} color="var(--cyan)" /> Provenance
            </h2>
            {[
              ['Stored on 0G', dataset.storageRootHash ? `${dataset.storageRootHash.slice(0, 24)}...` : 'Pending hash', Hash],
              ['Registered on-chain', `License #${dataset.onChainId}`, Globe],
              ['Validated by agent', truncateAddress(dataset.validatorAgent || dataset.agentAddress), Bot],
              ['Access tracked by smart contract', `${dataset.totalSales} access events`, Shield],
            ].map(([label, value, Icon]) => (
              <div key={String(label)} style={{ display: 'flex', gap: 11, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                {typeof Icon !== 'string' && <Icon size={15} color="var(--cyan)" />}
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>{String(label)}</span>
                  <span className="mono" style={{ display: 'block', color: 'var(--text-muted)', fontSize: 11.5, marginTop: 2 }}>{String(value)}</span>
                </span>
                <CheckCircle size={14} color="var(--green)" />
              </div>
            ))}
          </div>
        </div>

        <aside className="card card-pad" style={{ position: 'sticky', top: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 11.5, marginBottom: 4 }}>Licensed Access</div>
            <div style={{ color: 'var(--text)', fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em' }}>{formatWei(dataset.pricePerAccess)}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            {[
              ['License', permissionLabel(dataset.permission)],
              ['Access Type', 'Wallet-bound use'],
              ['Privacy Mode', dataset.privacyMode || 'Encrypted File'],
              ['Data Type', meta.label],
              ['Transfer', 'Non-transferable'],
              ['Agent Pricing', dataset.agentPricingEnabled ? 'Enabled' : 'Disabled'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 12.5 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
          {hasAccess ? (
            <div className="alert alert-green" style={{ justifyContent: 'center' }}><CheckCircle size={14} /> Licensed access granted</div>
          ) : (
            <>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={buyAccess} disabled={txLoading || dataset.status !== 'ACTIVE'}>
                <Wallet size={15} /> {txLoading ? 'Confirming...' : 'Buy Licensed Access'}
              </button>
            </>
          )}
          {txHash && (
            <div className="alert alert-green mono" style={{ marginTop: 12, wordBreak: 'break-all' }}>
              Tx confirmed: <a href={getExplorerTxUrl(txHash)} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}>{truncateAddress(txHash)}</a>
            </div>
          )}
          {txError && (
            <div className="alert alert-red" style={{ marginTop: 12 }}>
              {txError}
            </div>
          )}
          <div style={{ marginTop: 16, padding: 13, background: 'var(--surface-3)', borderRadius: 9 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, width: 76 }}>Contributor</div>
              <div className="mono" style={{ color: 'var(--text)', fontSize: 11.5 }}>{truncateAddress(dataset.contributor)}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, width: 76 }}>Data Agent</div>
              <div className="mono" style={{ color: 'var(--purple)', fontSize: 11.5 }}>{truncateAddress(dataset.agentAddress || dataset.validatorAgent)}</div>
            </div>
          </div>
          <Link href="/marketplace" className="btn btn-ghost" style={{ width: '100%', marginTop: 14 }}>Back to Marketplace</Link>
        </aside>
      </div>
    </PageFrame>
  );
}
