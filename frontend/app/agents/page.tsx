'use client';
import { useState } from 'react';
import { agents, Agent, truncateAddress } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './page.module.css';

export default function AgentsPage() {
  const { isConnected, connect } = useAuth();
  const [tab, setTab] = useState<'register' | 'lookup'>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Register
  const [agentAddress, setAgentAddress] = useState('');
  const [agenticTokenId, setAgenticTokenId] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [txHash, setTxHash] = useState('');

  // Lookup
  const [lookupAddress, setLookupAddress] = useState('');
  const [foundAgent, setFoundAgent] = useState<Agent | null>(null);

  const handleRegister = async () => {
    setError(''); setSuccess('');
    if (!agentAddress || !agenticTokenId || !metadataURI) {
      setError('All fields are required.'); return;
    }
    setLoading(true);
    try {
      const res = await agents.register({ agentAddress, agenticTokenId: Number(agenticTokenId), metadataURI });
      setTxHash(res.txHash);
      setSuccess(`Agent registered! Tx: ${res.txHash}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    setError(''); setFoundAgent(null);
    if (!lookupAddress) { setError('Enter an address.'); return; }
    setLoading(true);
    try {
      const res = await agents.get(lookupAddress);
      setFoundAgent(res.agent);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent not found');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.connectWall}>
        <div className={styles.connectIcon}>◉</div>
        <h2>Connect Your Wallet</h2>
        <p>You need to connect your wallet to manage agents.</p>
        <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="section-title">Manage</div>
        <h1 className={styles.title}>Validator Agents</h1>
        <p className={styles.sub}>Register and manage AI agents for dataset validation and dynamic pricing.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'register' ? styles.tabActive : ''}`} onClick={() => setTab('register')}>
          Register Agent
        </button>
        <button className={`${styles.tab} ${tab === 'lookup' ? styles.tabActive : ''}`} onClick={() => setTab('lookup')}>
          Lookup Agent
        </button>
      </div>

      <div className={styles.content}>
        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}>{success}</div>}

        {tab === 'register' && (
          <div className={styles.form}>
            <div className={styles.field}>
              <label className="label">Agent Wallet Address *</label>
              <input className="input" placeholder="0x..." value={agentAddress} onChange={e => setAgentAddress(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className="label">Agentic Token ID *</label>
              <input className="input" type="number" placeholder="1" value={agenticTokenId} onChange={e => setAgenticTokenId(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className="label">Metadata URI *</label>
              <input className="input" placeholder="https://..." value={metadataURI} onChange={e => setMetadataURI(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
              {loading ? 'Registering...' : 'Register Agent'}
            </button>
            {txHash && (
              <div className={styles.txBox}>
                <span className="address">TX: {txHash}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'lookup' && (
          <div className={styles.form}>
            <div className={styles.searchRow}>
              <input className="input" placeholder="0x agent address..." value={lookupAddress} onChange={e => setLookupAddress(e.target.value)} style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={handleLookup} disabled={loading}>
                {loading ? '...' : 'Lookup'}
              </button>
            </div>

            {foundAgent && (
              <div className={`card ${styles.agentCard}`}>
                <div className={styles.agentHeader}>
                  <div className={styles.agentIcon}>◉</div>
                  <div>
                    <div className={styles.agentAddress}>{foundAgent.agentAddress}</div>
                    <span className={`badge badge-${foundAgent.status.toLowerCase()}`}>{foundAgent.status}</span>
                  </div>
                </div>
                <div className={styles.agentStats}>
                  <div className={styles.agentStat}>
                    <span className={styles.statNum}>{foundAgent.totalPriceUpdates}</span>
                    <span className={styles.statLbl}>Price Updates</span>
                  </div>
                  <div className={styles.agentStat}>
                    <span className={styles.statNum}>{foundAgent.totalNegotiations}</span>
                    <span className={styles.statLbl}>Negotiations</span>
                  </div>
                  <div className={styles.agentStat}>
                    <span className={styles.statNum}>#{foundAgent.agenticTokenId}</span>
                    <span className={styles.statLbl}>Token ID</span>
                  </div>
                </div>
                <div className={styles.agentMeta}>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>On-Chain ID</span>
                    <span className="mono">#{foundAgent.onChainAgentId}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Contributor</span>
                    <span className="address">{truncateAddress(foundAgent.contributor)}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <span className={styles.metaKey}>Registered</span>
                    <span className={styles.metaVal}>{new Date(foundAgent.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
