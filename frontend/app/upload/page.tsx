'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadFile, datasets, validation, DataType, UsagePermission } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import styles from './page.module.css';

const DATA_TYPES: DataType[] = ['TEXT', 'CODE', 'AUDIO', 'VIDEO', 'IMAGE', 'BEHAVIORAL', 'FINANCIAL', 'DOMAIN'];
const PERMISSIONS: UsagePermission[] = ['AI_TRAINING', 'ANALYTICS', 'BOTH'];

const steps = ['Upload File', 'Register Dataset', 'Review & Submit', 'Validation'];

export default function UploadPage() {
  const { isConnected, connect } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [dataType, setDataType] = useState<DataType>('TEXT');
  const [agentAddress, setAgentAddress] = useState('');
  const [description, setDescription] = useState('');
  const [rootHash, setRootHash] = useState('');

  // Step 2
  const [name, setName] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [permission, setPermission] = useState<UsagePermission>('AI_TRAINING');
  const [pricePerAccess, setPricePerAccess] = useState('');
  const [subscriptionPrice, setSubscriptionPrice] = useState('');
  const [tags, setTags] = useState('');
  const [samplePreview, setSamplePreview] = useState('');

  // Step 4
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  const handleUpload = async () => {
    if (!file || !agentAddress || !dataType) {
      setError('File, agent address, and data type are required.'); return;
    }
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('agentAddress', agentAddress);
      fd.append('dataType', dataType);
      if (description) fd.append('description', description);
      const res = await uploadFile(fd) as { rootHash: string };
      setRootHash(res.rootHash);
      setStep(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !metadataURI || !pricePerAccess || !subscriptionPrice) {
      setError('Name, metadata URI, and pricing are required.'); return;
    }
    setLoading(true); setError('');
    try {
      const body = {
        storageRootHash: rootHash,
        metadataURI,
        name,
        description,
        dataType,
        permission,
        pricePerAccess,        // already a string like "0.01"
        subscriptionPrice,     // already a string like "0.1"
        agentAddress,
        agentPricingEnabled: true,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        samplePreview,
        fileSize: file?.size,       // ADD THIS
        fileName: file?.name,       // ADD THIS
      };
      const res = await datasets.register(body) as { dataset: { onChainId: number } };
      setDatasetId(res.dataset.onChainId);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!datasetId) return;
    setLoading(true); setError('');
    setStep(3);
    try {
      const res = await validation.trigger(datasetId, {
        agentAddress,
        description,
        dataType,
      }) as { result: Record<string, unknown> };
      setValidationResult(res.result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.connectWall}>
        <div className={styles.connectIcon}>◈</div>
        <h2>Connect Your Wallet</h2>
        <p>You need to connect your wallet to upload datasets.</p>
        <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="section-title">Contribute</div>
        <h1 className={styles.title}>Upload Dataset</h1>
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        {steps.map((s, i) => (
          <div key={s} className={`${styles.stepItem} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}>
            <div className={styles.stepNum}>{i < step ? '✓' : i + 1}</div>
            <span className={styles.stepLabel}>{s}</span>
            {i < steps.length - 1 && <div className={styles.stepLine} />}
          </div>
        ))}
      </div>

      <div className={styles.formWrapper}>
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* STEP 0: Upload file */}
        {step === 0 && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Upload File</h2>

            <div className={styles.field}>
              <label className="label">Dataset File *</label>
              <div className={styles.dropzone} onClick={() => document.getElementById('fileInput')?.click()}>
                <input id="fileInput" type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <div className={styles.fileInfo}>
                    <span className={styles.fileIcon}>◈</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.dropContent}>
                    <span className={styles.dropIcon}>⊕</span>
                    <span>Click to select file</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Max 500MB</span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">Data Type *</label>
              <select className="input" value={dataType} onChange={e => setDataType(e.target.value as DataType)}>
                {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className={styles.field}>
              <label className="label">Validator Agent Address *</label>
              <input className="input" placeholder="0x..." value={agentAddress} onChange={e => setAgentAddress(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Describe your dataset..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            <button className="btn btn-primary" onClick={handleUpload} disabled={loading}>
              {loading ? 'Uploading...' : 'Upload & Continue →'}
            </button>
          </div>
        )}

        {/* STEP 1: Register */}
        {step === 1 && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Register Dataset</h2>
            <div className={styles.hashDisplay}>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Root Hash</span>
              <span className="address">{rootHash}</span>
            </div>

            <div className={styles.field}>
              <label className="label">Dataset Name *</label>
              <input className="input" placeholder="e.g. Financial News 2024 Q1" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className="label">Metadata URI *</label>
              <input className="input" placeholder="https://..." value={metadataURI} onChange={e => setMetadataURI(e.target.value)} />
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className="label">Usage Permission *</label>
                <select className="input" value={permission} onChange={e => setPermission(e.target.value as UsagePermission)}>
                  {PERMISSIONS.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">Price Per Access (ETH) *</label>
              <input className="input" placeholder="0.01" value={pricePerAccess} onChange={e => setPricePerAccess(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className="label">Subscription Price (ETH) *</label>
              <input className="input" placeholder="0.1" value={subscriptionPrice} onChange={e => setSubscriptionPrice(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className="label">Tags (comma-separated)</label>
              <input className="input" placeholder="finance, news, 2024" value={tags} onChange={e => setTags(e.target.value)} />
            </div>

            <div className={styles.field}>
              <label className="label">Sample Preview</label>
              <textarea className="input" rows={3} placeholder="Short preview of your dataset..." value={samplePreview} onChange={e => setSamplePreview(e.target.value)} style={{ resize: 'vertical' }} />
            </div>

            <div className={styles.btnRow}>
              <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
              <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
                {loading ? 'Registering...' : 'Register & Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Review */}
        {step === 2 && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Review & Submit</h2>
            <div className={`card ${styles.reviewCard}`}>
              <div className={styles.reviewRow}><span className={styles.reviewKey}>Name</span><span>{name}</span></div>
              <div className={styles.reviewRow}><span className={styles.reviewKey}>Type</span><span className="badge badge-type">{dataType}</span></div>
              <div className={styles.reviewRow}><span className={styles.reviewKey}>Permission</span><span>{permission.replace('_', ' ')}</span></div>
              <div className={styles.reviewRow}><span className={styles.reviewKey}>Price/Access</span><span className="mono">{pricePerAccess} wei</span></div>
              <div className={styles.reviewRow}><span className={styles.reviewKey}>Subscription</span><span className="mono">{subscriptionPrice} wei</span></div>
              <div className={styles.reviewRow}><span className={styles.reviewKey}>Root Hash</span><span className="address">{rootHash?.slice(0, 24)}...</span></div>
              {tags && <div className={styles.reviewRow}><span className={styles.reviewKey}>Tags</span><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{tags}</span></div>}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Your dataset is registered on-chain. Trigger AI validation to get a quality score before it goes live.
            </p>
            <div className={styles.btnRow}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={handleValidate} disabled={loading}>
                {loading ? 'Triggering...' : 'Trigger Validation →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Validation result */}
        {step === 3 && (
          <div className={styles.form}>
            <h2 className={styles.formTitle}>Validation Result</h2>
            {loading ? (
              <div className={styles.validatingState}>
                <div className={styles.spinner} />
                <p>Running AI quality scoring...</p>
              </div>
            ) : validationResult ? (
              <>
                <div className={styles.scoreDisplay}>
                  <div className={styles.bigScore}>{String((validationResult.assessment as Record<string, unknown>)?.overallScore ?? validationResult.qualityScore ?? 0)}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>Quality Score</div>
                    <div className={`badge badge-${String(validationResult.validationStatus).toLowerCase()}`} style={{ marginTop: 8 }}>
                      {String(validationResult.validationStatus)}
                    </div>
                  </div>
                </div>
                <div className={styles.btnRow}>
                  <button className="btn btn-primary" onClick={() => router.push(`/dataset/${datasetId}`)}>
                    View Dataset →
                  </button>
                  <button className="btn btn-ghost" onClick={() => router.push('/marketplace')}>
                    Browse Marketplace
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>Validation triggered. Check back on your dataset page.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
