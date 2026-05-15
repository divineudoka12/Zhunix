'use client';

import { useState } from 'react';
import { Bot, Cpu, Plus, Search } from 'lucide-react';
import { Agent, agents, truncateAddress } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge, PageFrame, StatCard, badgeColor } from '@/components/ui/kit';

export default function AgentsPage() {
  const { isConnected, connect } = useAuth();
  const [agentAddress, setAgentAddress] = useState('');
  const [agenticTokenId, setAgenticTokenId] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [lookupAddress, setLookupAddress] = useState('');
  const [foundAgent, setFoundAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const registerAgent = async () => {
    setMessage('');
    setError('');
    if (!agentAddress || !agenticTokenId || !metadataURI) {
      setError('Agent address, Agentic Token ID, and metadata URI are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await agents.register({ agentAddress, agenticTokenId: Number(agenticTokenId), metadataURI });
      setMessage(`Agent registered. Tx: ${res.txHash}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const lookupAgent = async () => {
    setMessage('');
    setError('');
    setFoundAgent(null);
    if (!lookupAddress) {
      setError('Enter an agent address to look up.');
      return;
    }
    setLoading(true);
    try {
      const res = await agents.get(lookupAddress);
      setFoundAgent(res.agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent not found');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <PageFrame>
        <div className="connect-wall">
          <Bot size={42} color="var(--text-faint)" />
          <h2 style={{ color: 'var(--text)' }}>Connect Your Wallet</h2>
          <p>Connect to register and manage data agents.</p>
          <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Data Agents" subtitle="Your autonomous on-chain representatives for quality validation, pricing, and access management.">
      <div className="alert alert-blue" style={{ marginBottom: 28 }}>
        <Cpu size={19} color="var(--accent-light)" />
        <span><strong style={{ color: 'var(--text)' }}>Data Agents are user-owned on-chain representatives.</strong> Once assigned to a data license, an agent validates quality, updates prices, and records agent activity on your behalf.</span>
      </div>

      {error && <div className="alert alert-red" style={{ marginBottom: 18 }}>{error}</div>}
      {message && <div className="alert alert-green mono" style={{ marginBottom: 18, wordBreak: 'break-all' }}>{message}</div>}

      <div className="grid grid-2">
        <div className="card card-pad">
          <h2 style={{ color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>Register New Agent</h2>
          <label className="label">Agent Wallet Address</label>
          <input className="input mono" placeholder="0x..." value={agentAddress} onChange={(event) => setAgentAddress(event.target.value)} style={{ marginBottom: 14 }} />
          <label className="label">Agentic Token ID</label>
          <input className="input" type="number" placeholder="1" value={agenticTokenId} onChange={(event) => setAgenticTokenId(event.target.value)} style={{ marginBottom: 14 }} />
          <label className="label">Metadata URI</label>
          <input className="input" placeholder="https://..." value={metadataURI} onChange={(event) => setMetadataURI(event.target.value)} style={{ marginBottom: 18 }} />
          <button className="btn btn-primary" onClick={registerAgent} disabled={loading}>
            <Plus size={15} /> {loading ? 'Working...' : 'Register Agent'}
          </button>
        </div>

        <div className="card card-pad">
          <h2 style={{ color: 'var(--text)', fontSize: 15, marginBottom: 16 }}>Lookup Agent</h2>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <input className="input mono" placeholder="0x agent address..." value={lookupAddress} onChange={(event) => setLookupAddress(event.target.value)} />
            <button className="btn btn-primary" onClick={lookupAgent} disabled={loading}>
              <Search size={15} />
            </button>
          </div>

          {foundAgent ? (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(167,139,250,0.14)', display: 'grid', placeItems: 'center' }}>
                  <Bot size={22} color="var(--purple)" />
                </div>
                <div>
                  <div className="mono" style={{ color: 'var(--text)', fontSize: 13 }}>{truncateAddress(foundAgent.agentAddress)}</div>
                  <Badge color={badgeColor(foundAgent.status)}>{foundAgent.status}</Badge>
                </div>
              </div>
              <div className="grid grid-3">
                <StatCard icon={Bot} label="Token ID" value={`#${foundAgent.agenticTokenId}`} color="var(--purple)" />
                <StatCard icon={Cpu} label="Price Updates" value={foundAgent.totalPriceUpdates} color="var(--accent)" />
                <StatCard icon={Search} label="Negotiations" value={foundAgent.totalNegotiations} color="var(--cyan)" />
              </div>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>Search an agent address to see status, token ownership, price updates, and negotiation activity.</p>
          )}
        </div>
      </div>
    </PageFrame>
  );
}
