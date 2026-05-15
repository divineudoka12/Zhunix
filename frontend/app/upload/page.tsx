'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Bot,
  Check,
  CheckCircle,
  ExternalLink,
  FileSearch,
  Globe,
  Hash,
  Loader2,
  Lock,
  Shield,
  Upload,
} from 'lucide-react';
import { DataType, UsagePermission, datasets, uploadFile, validation } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Badge, PageFrame, QualityBar, permissionLabel, scoreAverage, typeMeta } from '@/components/ui/kit';

type PipelineStatus = 'idle' | 'active' | 'done' | 'error';
type PipelineStep = {
  key: string;
  title: string;
  detail: string;
  status: PipelineStatus;
};

const STORAGE_SCAN_BASE_URL = 'https://storagescan-galileo.0g.ai/submission';
const DEFAULT_AGENT = {
  name: process.env.NEXT_PUBLIC_DEFAULT_AGENT_NAME || 'Zhunix Default Agent',
  address: process.env.NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS || '',
  tokenId: process.env.NEXT_PUBLIC_DEFAULT_AGENT_TOKEN_ID || '',
};

const PIPELINE_TEMPLATE: PipelineStep[] = [
  { key: 'classify', title: 'Classify data', detail: 'Detecting type, privacy mode, and buyer context.', status: 'idle' },
  { key: 'agent', title: 'Assign agent', detail: 'Using the default Zhunix data agent.', status: 'idle' },
  { key: 'upload', title: 'Upload data', detail: 'Securing the file on 0G Storage.', status: 'idle' },
  { key: 'license', title: 'Draft license', detail: 'Generating title, usage rights, tags, and pricing.', status: 'idle' },
  { key: 'list', title: 'List on-chain', detail: 'Publishing the data license to the marketplace.', status: 'idle' },
  { key: 'validate', title: 'Validate quality', detail: 'Scoring completeness, accuracy, authenticity, and consistency.', status: 'idle' },
];

const EXTENSION_TYPE_MAP: Record<string, DataType> = {
  txt: 'TEXT',
  md: 'TEXT',
  pdf: 'TEXT',
  doc: 'TEXT',
  docx: 'TEXT',
  csv: 'DOMAIN',
  tsv: 'DOMAIN',
  xls: 'FINANCIAL',
  xlsx: 'FINANCIAL',
  json: 'DOMAIN',
  jsonl: 'DOMAIN',
  js: 'CODE',
  jsx: 'CODE',
  ts: 'CODE',
  tsx: 'CODE',
  py: 'CODE',
  sol: 'CODE',
  java: 'CODE',
  go: 'CODE',
  rs: 'CODE',
  png: 'IMAGE',
  jpg: 'IMAGE',
  jpeg: 'IMAGE',
  gif: 'IMAGE',
  webp: 'IMAGE',
  svg: 'IMAGE',
  mp3: 'AUDIO',
  wav: 'AUDIO',
  m4a: 'AUDIO',
  ogg: 'AUDIO',
  mp4: 'VIDEO',
  mov: 'VIDEO',
  webm: 'VIDEO',
  avi: 'VIDEO',
};

function hasAnyTerm(value: string, terms: string[]) {
  return terms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(value));
}

function inferTabularDataType(sample: string): DataType {
  const header = sample.split(/\r?\n/)[0]?.toLowerCase() || '';
  const text = sample.toLowerCase().slice(0, 4000);
  const financialTerms = ['amount', 'price', 'cost', 'revenue', 'profit', 'payment', 'transaction', 'invoice', 'balance', 'currency', 'total', 'subtotal', 'tax', 'sales'];
  const peopleTerms = ['person', 'people', 'name', 'first_name', 'last_name', 'fullname', 'age', 'gender', 'email', 'phone', 'address', 'city', 'country', 'occupation', 'job', 'company', 'customer', 'user', 'profile', 'segment'];
  const behavioralTerms = ['event', 'session', 'click', 'view', 'page', 'conversion', 'timestamp', 'duration', 'device', 'browser', 'retention', 'activity'];

  if (hasAnyTerm(header, financialTerms)) return 'FINANCIAL';
  if (hasAnyTerm(header, behavioralTerms)) return 'BEHAVIORAL';
  if (hasAnyTerm(header, peopleTerms) || hasAnyTerm(text, peopleTerms)) return 'BEHAVIORAL';
  return 'DOMAIN';
}

async function inferDataType(file: File): Promise<DataType> {
  const mime = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (extension === 'csv' || extension === 'tsv' || mime.includes('csv')) {
    const sample = await file.slice(0, 4000).text().catch(() => '');
    return inferTabularDataType(sample);
  }

  const extensionType = EXTENSION_TYPE_MAP[extension];

  if (extensionType) return extensionType;

  if (mime.startsWith('image/')) return 'IMAGE';
  if (mime.startsWith('audio/')) return 'AUDIO';
  if (mime.startsWith('video/')) return 'VIDEO';
  if (mime.includes('json')) return 'DOMAIN';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'DOMAIN';
  if (mime.includes('text') || mime.includes('pdf') || mime.includes('document')) return 'TEXT';

  return 'TEXT';
}

function choosePrivacyMode(dataType: DataType) {
  if (dataType === 'FINANCIAL' || dataType === 'BEHAVIORAL') return 'Derived Insight';
  return 'Encrypted File';
}

function formatPrice(value: number) {
  return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function suggestedPermission(dataType: DataType): UsagePermission {
  if (dataType === 'FINANCIAL' || dataType === 'BEHAVIORAL') return 'ANALYTICS';
  if (dataType === 'TEXT' || dataType === 'CODE') return 'AI_TRAINING';
  return 'BOTH';
}

function localDraft(params: {
  file: File;
  dataType: DataType;
  description: string;
  rootHash: string;
  storageSubmissionUrl: string;
  privacyMode: string;
}) {
  const basePrices: Record<DataType, number> = {
    TEXT: 0.01,
    CODE: 0.02,
    AUDIO: 0.025,
    VIDEO: 0.04,
    IMAGE: 0.018,
    BEHAVIORAL: 0.035,
    FINANCIAL: 0.05,
    DOMAIN: 0.03,
  };
  const baseName = params.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
  const sizeMb = params.file.size / 1024 / 1024;
  const price = basePrices[params.dataType] * (1 + Math.min(0.65, Math.log10(sizeMb + 1) * 0.18));
  const description = params.description || `Agent-generated ${params.dataType.toLowerCase()} data license for controlled marketplace access.`;
  const tags = [
    params.dataType.toLowerCase(),
    ...baseName.toLowerCase().split(/\s+/).filter((tag) => tag.length > 3).slice(0, 3),
  ];

  return {
    name: `${baseName || params.dataType} Data License`,
    description,
    metadataURI: params.storageSubmissionUrl || `0g://${params.rootHash}`,
    permission: suggestedPermission(params.dataType),
    pricePerAccess: formatPrice(price),
    subscriptionPrice: formatPrice(price * 8),
    tags: Array.from(new Set(tags)),
    samplePreview: description,
    metadata: {
      dataType: params.dataType,
      privacyMode: params.privacyMode,
      storageRootHash: params.rootHash,
      storageSubmissionUrl: params.storageSubmissionUrl,
      automatedBy: DEFAULT_AGENT.name,
    },
    usedFallback: true,
  };
}

export default function UploadPage() {
  const { isConnected, connect } = useAuth();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [creatorNote, setCreatorNote] = useState('');
  const [pipeline, setPipeline] = useState<PipelineStep[]>(PIPELINE_TEMPLATE);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [dataType, setDataType] = useState<DataType | null>(null);
  const [privacyMode, setPrivacyMode] = useState('Encrypted File');
  const [rootHash, setRootHash] = useState('');
  const [storageSubmissionUrl, setStorageSubmissionUrl] = useState('');
  const [license, setLicense] = useState<{
    name: string;
    description: string;
    metadataURI: string;
    permission: UsagePermission;
    pricePerAccess: string;
    subscriptionPrice: string;
    tags: string[];
    samplePreview: string;
    metadata: Record<string, unknown>;
    usedFallback?: boolean;
  } | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);

  const progress = useMemo(() => {
    const done = pipeline.filter((item) => item.status === 'done').length;
    const active = pipeline.some((item) => item.status === 'active') ? 0.5 : 0;
    return Math.round(((done + active) / pipeline.length) * 100);
  }, [pipeline]);

  const setStepStatus = (key: string, status: PipelineStatus) => {
    setPipeline((current) => current.map((item) => (item.key === key ? { ...item, status } : item)));
  };

  const startPipeline = async () => {
    if (!file) {
      setError('Choose a data file first.');
      return;
    }
    if (!DEFAULT_AGENT.address) {
      setError('Missing NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS. Add the default agent address before publishing.');
      return;
    }

    setRunning(true);
    setError('');
    setNotice('');
    setDatasetId(null);
    setValidationResult(null);
    setPipeline(PIPELINE_TEMPLATE.map((item) => ({ ...item, status: 'idle' })));

    let activeKey = '';
    try {
      activeKey = 'classify';
      setStepStatus('classify', 'active');
      const inferredType = await inferDataType(file);
      const inferredPrivacyMode = choosePrivacyMode(inferredType);
      setDataType(inferredType);
      setPrivacyMode(inferredPrivacyMode);
      setStepStatus('classify', 'done');

      activeKey = 'agent';
      setStepStatus('agent', 'active');
      setStepStatus('agent', 'done');

      activeKey = 'upload';
      setStepStatus('upload', 'active');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('agentAddress', DEFAULT_AGENT.address);
      formData.append('dataType', inferredType);
      formData.append('description', creatorNote);
      const uploadRes = await uploadFile(formData) as {
        rootHash: string;
        storageSubmissionUrl?: string;
        storageTxSeq?: number;
      };
      const scanUrl = uploadRes.storageSubmissionUrl || (
        uploadRes.storageTxSeq !== undefined ? `${STORAGE_SCAN_BASE_URL}/${uploadRes.storageTxSeq}` : ''
      );
      setRootHash(uploadRes.rootHash);
      setStorageSubmissionUrl(scanUrl);
      setStepStatus('upload', 'done');

      activeKey = 'license';
      setStepStatus('license', 'active');
      const fallback = localDraft({
        file,
        dataType: inferredType,
        description: creatorNote,
        rootHash: uploadRes.rootHash,
        storageSubmissionUrl: scanUrl,
        privacyMode: inferredPrivacyMode,
      });
      const draftRes = await datasets.draft({
        fileName: file.name,
        fileSize: file.size,
        dataType: inferredType,
        description: creatorNote,
        storageRootHash: uploadRes.rootHash,
        storageSubmissionUrl: scanUrl,
        privacyMode: inferredPrivacyMode,
      }).catch(() => ({ draft: fallback }));
      const draft = {
        ...fallback,
        ...(draftRes.draft as Partial<typeof fallback>),
      };
      const normalizedLicense = {
        name: String(draft.name || fallback.name),
        description: String(draft.description || fallback.description),
        metadataURI: String(draft.metadataURI || fallback.metadataURI),
        permission: (draft.permission || fallback.permission) as UsagePermission,
        pricePerAccess: String(draft.pricePerAccess || fallback.pricePerAccess),
        subscriptionPrice: String(draft.subscriptionPrice || fallback.subscriptionPrice),
        tags: Array.isArray(draft.tags) ? draft.tags : fallback.tags,
        samplePreview: String(draft.samplePreview || fallback.samplePreview),
        metadata: {
          ...fallback.metadata,
          ...(draft.metadata || {}),
          defaultAgent: DEFAULT_AGENT.address,
          automation: 'upload-to-licensed-listing',
        },
        usedFallback: Boolean(draft.usedFallback),
      };
      setLicense(normalizedLicense);
      setStepStatus('license', 'done');

      activeKey = 'list';
      setStepStatus('list', 'active');
      const registerRes = await datasets.register({
        storageRootHash: uploadRes.rootHash,
        metadataURI: normalizedLicense.metadataURI,
        name: normalizedLicense.name,
        description: normalizedLicense.description,
        dataType: inferredType,
        permission: normalizedLicense.permission,
        pricePerAccess: normalizedLicense.pricePerAccess,
        subscriptionPrice: normalizedLicense.subscriptionPrice,
        agentAddress: DEFAULT_AGENT.address,
        agentPricingEnabled: true,
        tags: normalizedLicense.tags,
        samplePreview: normalizedLicense.samplePreview,
        fileSize: file.size,
        fileName: file.name,
        privacyMode: inferredPrivacyMode,
        storageSubmissionUrl: scanUrl,
        storageTxSeq: uploadRes.storageTxSeq ?? null,
        licenseMetadata: normalizedLicense.metadata,
      }) as { dataset: { onChainId: number } };
      setDatasetId(registerRes.dataset.onChainId);
      setStepStatus('list', 'done');

      activeKey = 'validate';
      setStepStatus('validate', 'active');
      try {
        const validationRes = await validation.trigger(registerRes.dataset.onChainId, {
          agentAddress: DEFAULT_AGENT.address,
          fileSize: file.size,
          fileName: file.name,
          description: normalizedLicense.description,
          dataType: inferredType,
        }) as { result?: Record<string, unknown> };
        setValidationResult(validationRes.result || null);
        setStepStatus('validate', 'done');
      } catch (validationErr) {
        setStepStatus('validate', 'done');
        const message = validationErr instanceof Error ? validationErr.message : 'Validation is still processing.';
        setNotice(message.includes('insufficient balance')
          ? 'The license was listed, but quality scoring is pending because the 0G Compute account needs funds.'
          : 'The license was listed. Quality scoring is still processing and will update on the dataset page.'
        );
      }
    } catch (err) {
      if (activeKey) setStepStatus(activeKey, 'error');
      setError(err instanceof Error ? err.message : 'The automated license pipeline failed.');
    } finally {
      setRunning(false);
    }
  };

  const scores = validationResult?.assessment as Record<string, number> | undefined;
  const average = scoreAverage([
    Number(scores?.completeness || 0),
    Number(scores?.accuracy || 0),
    Number(scores?.authenticity || 0),
    Number(scores?.consistency || 0),
  ]);
  const meta = typeMeta(dataType || undefined);

  if (!isConnected) {
    return (
      <PageFrame>
        <div className="connect-wall">
          <Lock size={42} color="var(--text-faint)" />
          <h2 style={{ color: 'var(--text)' }}>Connect Your Wallet</h2>
          <p>Connect to let the default agent license, validate, and list your data for you.</p>
          <button className="btn btn-primary" onClick={connect}>Connect Wallet</button>
        </div>
      </PageFrame>
    );
  }

  return (
    <PageFrame title="Create Data License" subtitle="Upload once. Zhunix agents classify, license, validate, and list the data automatically.">
      {error && <div className="alert alert-red" style={{ marginBottom: 18 }}>{error}</div>}
      {notice && <div className="alert alert-blue" style={{ marginBottom: 18 }}>{notice}</div>}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <section className="card card-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Bot size={18} color="var(--accent-light)" />
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 16 }}>Agent automated listing</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>The creator only provides the data. The agent handles the protocol work.</p>
            </div>
          </div>

          <div onClick={() => !running && document.getElementById('licenseFile')?.click()} style={{ border: '2px dashed var(--border-med)', borderRadius: 8, padding: '38px 22px', textAlign: 'center', marginBottom: 18, cursor: running ? 'default' : 'pointer', opacity: running ? 0.78 : 1 }}>
            <input id="licenseFile" type="file" hidden disabled={running} onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Upload size={30} color="var(--text-muted)" style={{ marginBottom: 10 }} />
            <div style={{ color: 'var(--text)', fontSize: 15, fontWeight: 800, marginBottom: 5 }}>{file ? file.name : 'Choose the data file'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'The agent will infer the data type automatically.'}</div>
          </div>

          <label className="label">Creator note <Badge color="gray">Optional</Badge></label>
          <textarea
            className="textarea"
            placeholder="Add context only if you want. The agent can draft the license without it."
            value={creatorNote}
            disabled={running}
            onChange={(event) => setCreatorNote(event.target.value)}
            style={{ marginBottom: 16 }}
          />

          <div className="alert alert-blue" style={{ marginBottom: 18 }}>
            <Shield size={15} />
            <span><strong style={{ color: 'var(--text)' }}>Default agent:</strong> {DEFAULT_AGENT.name} {DEFAULT_AGENT.tokenId ? `(Agentic ID #${DEFAULT_AGENT.tokenId})` : ''}</span>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', minHeight: 46 }} onClick={startPipeline} disabled={running || !file}>
            {running ? <Loader2 size={17} className="spin" /> : <FileSearch size={17} />}
            {running ? 'Agent pipeline running...' : 'Start Automated License'}
          </button>
        </section>

        <section className="card card-pad">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ color: 'var(--text)', fontSize: 16 }}>Progress</h2>
            <Badge color={progress === 100 ? 'green' : 'blue'}>{progress}%</Badge>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden', marginBottom: 18 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: progress === 100 ? 'var(--green)' : 'var(--accent)', transition: 'width 250ms ease' }} />
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {pipeline.map((item) => (
              <div key={item.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: item.status === 'done' ? 'rgba(34,197,94,0.16)' : item.status === 'active' ? 'rgba(59,124,246,0.16)' : item.status === 'error' ? 'rgba(239,68,68,0.16)' : 'var(--surface-3)', color: item.status === 'done' ? 'var(--green)' : item.status === 'active' ? 'var(--accent-light)' : item.status === 'error' ? 'var(--red)' : 'var(--text-muted)' }}>
                  {item.status === 'done' ? <Check size={14} /> : item.status === 'active' ? <Loader2 size={14} className="spin" /> : item.key === 'agent' ? <Bot size={14} /> : <span style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor' }} />}
                </span>
                <span>
                  <span style={{ color: 'var(--text)', display: 'block', fontSize: 13, fontWeight: 800 }}>{item.title}</span>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 12, lineHeight: 1.5 }}>{item.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {(license || datasetId) && (
        <section className="card card-pad" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <h2 style={{ color: 'var(--text)', fontSize: 16 }}>Generated License</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>These terms were created and listed by the default agent.</p>
            </div>
            {dataType && <Badge color={meta.label === 'Image' ? 'green' : undefined}>{meta.label}</Badge>}
          </div>

          {storageSubmissionUrl && (
            <a className="alert alert-blue" href={storageSubmissionUrl} target="_blank" rel="noreferrer" style={{ marginBottom: 18, textDecoration: 'none' }}>
              <Hash size={14} color="var(--accent-light)" />
              <span className="mono" style={{ flex: 1, wordBreak: 'break-all' }}>{storageSubmissionUrl}</span>
              <ExternalLink size={14} color="var(--accent-light)" />
            </a>
          )}
          {!storageSubmissionUrl && rootHash && (
            <div className="alert alert-blue" style={{ marginBottom: 18 }}>
              <Hash size={14} color="var(--accent-light)" />
              <span className="mono" style={{ wordBreak: 'break-all' }}>{rootHash}</span>
            </div>
          )}

          {license && (
            <div className="grid grid-2" style={{ gap: 16 }}>
              <div><div className="label">License</div><div style={{ color: 'var(--text)', fontWeight: 800 }}>{license.name}</div></div>
              <div><div className="label">Usage</div><div style={{ color: 'var(--text)', fontWeight: 800 }}>{permissionLabel(license.permission)}</div></div>
              <div><div className="label">Access Price</div><div style={{ color: 'var(--green)', fontWeight: 900 }}>{license.pricePerAccess} 0G</div></div>
              <div><div className="label">Privacy</div><div style={{ color: 'var(--text)', fontWeight: 800 }}>{privacyMode}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><div className="label">Buyer Preview</div><div style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.55 }}>{license.samplePreview}</div></div>
            </div>
          )}

          {average > 0 && (
            <div style={{ marginTop: 22 }}>
              <QualityBar label="Completeness" score={Number(scores?.completeness || 0)} />
              <QualityBar label="Accuracy" score={Number(scores?.accuracy || 0)} />
              <QualityBar label="Authenticity" score={Number(scores?.authenticity || 0)} />
              <QualityBar label="Consistency" score={Number(scores?.consistency || 0)} />
              <div className="card" style={{ padding: '16px 18px', marginTop: 18, display: 'flex', alignItems: 'center', gap: 14, borderColor: 'rgba(34,197,94,0.25)' }}>
                <Award size={30} color="var(--green)" />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Overall Quality Score</div>
                  <div style={{ color: 'var(--green)', fontSize: 30, fontWeight: 900 }}>{average}<span style={{ color: 'var(--text-muted)', fontSize: 14 }}>/100</span></div>
                </div>
                <Badge color="green" size="lg"><CheckCircle size={12} /> {String(validationResult?.validationStatus || 'APPROVED')}</Badge>
              </div>
            </div>
          )}

          {datasetId && (
            <button className="btn btn-primary" style={{ width: '100%', minHeight: 46, marginTop: 20 }} onClick={() => router.push(`/dataset/${datasetId}`)}>
              <Globe size={17} /> View Listed License
            </button>
          )}
        </section>
      )}
    </PageFrame>
  );
}
