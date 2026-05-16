import { Contract, BrowserProvider, parseEther } from 'ethers';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://zhunix.vercel.app';
const OG_CHAIN_ID = Number(process.env.NEXT_PUBLIC_OG_CHAIN_ID || '16602');
const OG_CHAIN_ID_HEX = `0x${OG_CHAIN_ID.toString(16)}`;
export const OG_RPC_URL = process.env.NEXT_PUBLIC_OG_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_DATA_MARKETPLACE_ADDRESS || '';
const OG_CHAIN_NAME = '0G Galileo Testnet';
const OG_EXPLORER_URL = 'https://chainscan-galileo.0g.ai';

const MARKETPLACE_ABI = [
  'function purchaseAccess(uint256 datasetId) external payable',
  'function purchaseSubscription(uint256 datasetId) external payable',
  'function bulkPurchase(uint256[] datasetIds) external payable',
  'function hasActiveAccess(address buyer,uint256 datasetId) view returns (bool)',
  'function withdraw() external',
];

export type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zhunix_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Request failed');
  return data;
}

async function upload(path: string, formData: FormData) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 210000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData, signal: controller.signal });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('0G Storage is taking too long to respond. Please retry, or switch to a healthy storage node before starting the license pipeline again.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
}

// Auth
export const auth = {
  getNonce: (address: string) => request<{ success: true; nonce: string }>(`/api/auth/nonce/${address}`),
  verify: (message: string, signature: string) =>
    request<{ success: true; token: string; address: string }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    }),
};

// Datasets
export type DataType = 'TEXT' | 'CODE' | 'AUDIO' | 'VIDEO' | 'IMAGE' | 'BEHAVIORAL' | 'FINANCIAL' | 'DOMAIN';
export type UsagePermission = 'AI_TRAINING' | 'ANALYTICS' | 'BOTH';
export type DatasetStatus = 'ACTIVE' | 'PAUSED' | 'REMOVED';
export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Dataset {
  _id: string;
  onChainId: number;
  contributor: string;
  name: string;
  description: string;
  storageRootHash: string;
  metadataURI: string;
  dataType: DataType;
  permission: UsagePermission;
  status: DatasetStatus;
  pricePerAccess: string;
  subscriptionPrice: string;
  agentAddress: string;
  agentPricingEnabled: boolean;
  tags: string[];
  samplePreview: string;
  privacyMode: string;
  storageSubmissionUrl: string;
  storageTxSeq: number | null;
  licenseMetadata: Record<string, unknown>;
  qualityScore: number;
  totalSales: number;
  totalRevenue: string;
  validationStatus: ValidationStatus;
  validatorAgent: string;
  validationTimestamp: string | null;
  validationDetails: {
    completeness: number;
    accuracy: number;
    authenticity: number;
    consistency: number;
    issues: string[];
    recommendations: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface DatasetsResponse {
  success: true;
  datasets: Dataset[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface MarketplaceScoutResult {
  dataset: Dataset;
  relevanceScore: number;
  matchReasons: string[];
}

export interface MarketplaceScoutResponse {
  success: true;
  prompt: string;
  minimumQualityScore: number;
  interpretedIntent?: {
    dataTypes: DataType[];
    permissions: UsagePermission[];
    searchTerms: string[];
  };
  budget: number | null;
  estimatedTotal: number;
  count: number;
  results: MarketplaceScoutResult[];
  suggestions?: Array<{ dataType: DataType; count: number; bestQualityScore: number }>;
  agent: { name: string; role: string };
}

export const datasets = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<DatasetsResponse>(`/api/datasets${qs}`);
  },
  get: (id: number | string) => request<{ success: true; dataset: Dataset }>(`/api/datasets/${id}`),
  register: (body: Record<string, unknown>) =>
    request<{ success: true; dataset: Dataset; txHash: string; message: string }>('/api/datasets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  draft: (body: Record<string, unknown>) =>
    request<{ success: true; draft: Record<string, unknown> }>('/api/datasets/draft', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  scout: (body: { prompt: string; budget?: number; limit?: number }) =>
    request<MarketplaceScoutResponse>('/api/datasets/scout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (id: number | string, body: Record<string, unknown>) =>
    request<{ success: true; dataset: Dataset }>(`/api/datasets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};

// Upload
export const uploadFile = (formData: FormData) => upload('/api/upload', formData);

// Validation
export const validation = {
  get: (datasetId: number | string) => request<{ success: true; validation: unknown }>(`/api/validation/${datasetId}`),
  pending: (limit = 50) => request<{ success: true; count: number; datasets: Dataset[] }>(`/api/validation/pending/list?limit=${limit}`),
  trigger: (datasetId: number | string, body: Record<string, unknown>) =>
    request(`/api/validation/${datasetId}/validate`, { method: 'POST', body: JSON.stringify(body) }),
};

// Agents
export interface Agent {
  _id: string;
  onChainAgentId: number;
  agentAddress: string;
  contributor: string;
  agenticTokenId: number;
  metadataURI: string;
  status: string;
  totalPriceUpdates: number;
  totalNegotiations: number;
  createdAt: string;
  updatedAt: string;
}

export const agents = {
  register: (body: Record<string, unknown>) =>
    request<{ success: true; agent: Agent; txHash: string }>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  get: (address: string) => request<{ success: true; agent: Agent }>(`/api/agents/${address}`),
  priceCycle: (datasetId: number | string) =>
    request(`/api/agents/${datasetId}/price-cycle`, { method: 'POST' }),
};

// Purchases
export interface Purchase {
  _id: string;
  onChainPurchaseId: number;
  datasetId: number;
  buyer: string;
  contributor: string;
  amount: string;
  platformFee: string;
  contributorPayout: string;
  isSubscription: boolean;
  subscriptionExpiresAt: string | null;
  txHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface LicensedAccess {
  datasetId: number;
  buyer: string;
  contributor: string;
  licenseHolder: string;
  nonTransferable: boolean;
  certificateId: string;
  certificateIssuedAt: string;
  certificateStatus: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  accessToken: string;
  accessMode: string;
  usagePermission: UsagePermission;
  storageRootHash: string;
  storageSubmissionUrl: string;
  metadataURI: string;
  samplePreview: string;
  purchaseTxHash: string;
  purchaseType: 'ONE_TIME' | 'SUBSCRIPTION';
  subscriptionExpiresAt: string | null;
  policy: string[];
  usageLog: { action: string; actor: string; timestamp: string }[];
}

export type LicensedUseAction = 'AI_TRAINING_JOB' | 'ANALYTICS_QUERY' | 'DERIVED_INSIGHT';
export type LicensedQueryFormat = 'CSV' | 'TSV' | 'JSON' | 'JSONL' | 'SQL';

export interface LicensedUseResult {
  runId: string;
  action: LicensedUseAction;
  actionLabel: string;
  message: string;
  datasetId: number;
  datasetName: string;
  licenseHolder: string;
  contributor: string;
  certificateId: string;
  accessToken: string;
  purchaseTxHash: string;
  outputType: string;
  generatedAt: string;
  shareable: boolean;
  exportRestricted: boolean;
  auditEvent: { action: string; actor: string; timestamp: string };
}

export interface LicensedQueryResult {
  queryId: string;
  prompt: string;
  format: LicensedQueryFormat;
  output: string;
  datasetId: number;
  datasetName: string;
  licenseHolder: string;
  contributor: string;
  certificateId: string;
  accessToken: string;
  generatedAt: string;
  sourceDataTransferred: boolean;
  shareable: boolean;
  auditEvent: { action: string; actor: string; timestamp: string };
}

export interface ShareAttemptResult {
  allowed: boolean;
  certificateId: string;
  licenseHolder: string;
  attemptedWallet: string;
  reason: string;
  auditEvent: { action: string; actor: string; attemptedWallet: string; timestamp: string };
}

export const purchases = {
  list: () => request<{ success: true; purchases: Purchase[] }>('/api/purchases'),
  get: (id: number | string) => request<{ success: true; purchase: Purchase }>(`/api/purchases/${id}`),
  checkAccess: (datasetId: number | string) =>
    request<{ success: true; hasAccess: boolean; datasetId: number }>(`/api/purchases/access/${datasetId}`),
  licensed: (datasetId: number | string) =>
    request<{ success: true; access: LicensedAccess }>(`/api/purchases/licensed/${datasetId}`),
  useLicensed: (datasetId: number | string, action: LicensedUseAction) =>
    request<{ success: true; result: LicensedUseResult }>(`/api/purchases/licensed/${datasetId}/use`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  queryLicensed: (datasetId: number | string, prompt: string, format: LicensedQueryFormat) =>
    request<{ success: true; result: LicensedQueryResult }>(`/api/purchases/licensed/${datasetId}/query`, {
      method: 'POST',
      body: JSON.stringify({ prompt, format }),
    }),
  checkShare: (datasetId: number | string, attemptedWallet?: string) =>
    request<{ success: true; result: ShareAttemptResult }>(`/api/purchases/licensed/${datasetId}/share-check`, {
      method: 'POST',
      body: JSON.stringify({ attemptedWallet }),
    }),
  balance: () => request<{ success: true; balance: string }>('/api/purchases/balance'),
};

export async function ensure0GNetwork(provider: Eip1193Provider = window.ethereum!) {
  if (!provider) throw new Error('No wallet provider found.');
  const currentChainId = await provider.request({ method: 'eth_chainId' }).catch(() => null);
  if (typeof currentChainId === 'string' && currentChainId.toLowerCase() === OG_CHAIN_ID_HEX.toLowerCase()) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: OG_CHAIN_ID_HEX }],
    });
  } catch (err) {
    const code = typeof err === 'object' && err && 'code' in err ? (err as { code?: number | string }).code : undefined;
    if (code !== 4902) throw err;
    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: OG_CHAIN_ID_HEX,
          chainName: OG_CHAIN_NAME,
          nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
          rpcUrls: [OG_RPC_URL],
          blockExplorerUrls: [OG_EXPLORER_URL],
        }],
      });
    } catch (addErr) {
      const message = typeof addErr === 'object' && addErr && 'message' in addErr
        ? String((addErr as { message?: unknown }).message || '')
        : '';
      if (message.toLowerCase().includes('same rpc endpoint')) {
        throw new Error(
          `MetaMask already has a different network using ${OG_RPC_URL}. Remove the old 0G-Galileo-Testnet entry from MetaMask networks, then reconnect so Zhunix can add ${OG_CHAIN_NAME} (${OG_CHAIN_ID_HEX}).`
        );
      }
      throw addErr;
    }
  }
}

export async function assert0GNetwork(provider: Eip1193Provider = window.ethereum!) {
  const chainId = await provider.request({ method: 'eth_chainId' }) as string;
  if (chainId.toLowerCase() !== OG_CHAIN_ID_HEX.toLowerCase()) {
    throw new Error('Wallet is not connected to 0G Galileo Testnet. Please switch to 0G and try again.');
  }
}

function toPaymentValue(amount: string) {
  const trimmed = String(amount || '0').trim();
  if (!trimmed) return BigInt(0);
  if (trimmed.includes('.')) return parseEther(trimmed);
  if (trimmed.length > 12) return BigInt(trimmed);
  return parseEther(trimmed);
}

function sumPaymentValues(amounts: string[]) {
  return amounts.reduce((sum, amount) => sum + toPaymentValue(amount), BigInt(0));
}

async function getMarketplaceContract() {
  if (!MARKETPLACE_ADDRESS) {
    throw new Error('Missing NEXT_PUBLIC_DATA_MARKETPLACE_ADDRESS');
  }
  await ensure0GNetwork();
  const provider = new BrowserProvider(window.ethereum!);
  const signer = await provider.getSigner();
  return new Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);
}

async function getContractBuyer(contract: Contract) {
  const runner = contract.runner as { getAddress?: () => Promise<string> } | null;
  return runner?.getAddress ? runner.getAddress() : null;
}

export const contractActions = {
  purchaseAccess: async (datasetId: number | string, pricePerAccess: string) => {
    const contract = await getMarketplaceContract();
    const buyer = await getContractBuyer(contract);
    if (buyer && await contract.hasActiveAccess(buyer, datasetId)) {
      throw new Error('You already purchased this data license.');
    }
    const tx = await contract.purchaseAccess(datasetId, { value: toPaymentValue(pricePerAccess) });
    const receipt = await tx.wait();
    return { txHash: receipt.hash as string };
  },
  purchaseSubscription: async (datasetId: number | string, subscriptionPrice: string) => {
    const contract = await getMarketplaceContract();
    const tx = await contract.purchaseSubscription(datasetId, { value: toPaymentValue(subscriptionPrice) });
    const receipt = await tx.wait();
    return { txHash: receipt.hash as string };
  },
  bulkPurchase: async (items: Array<{ datasetId: number | string; pricePerAccess: string }>) => {
    if (!items.length) throw new Error('There are no new data licenses to purchase.');
    const contract = await getMarketplaceContract();
    const buyer = await getContractBuyer(contract);
    if (buyer) {
      const accessChecks = await Promise.all(items.map((item) => contract.hasActiveAccess(buyer, item.datasetId)));
      if (accessChecks.some(Boolean)) {
        throw new Error('Remove already purchased data licenses from the basket before paying.');
      }
    }
    const tx = await contract.bulkPurchase(
      items.map((item) => item.datasetId),
      { value: sumPaymentValues(items.map((item) => item.pricePerAccess)) }
    );
    const receipt = await tx.wait();
    return { txHash: receipt.hash as string };
  },
  withdrawEarnings: async () => {
    const contract = await getMarketplaceContract();
    const tx = await contract.withdraw();
    const receipt = await tx.wait();
    return { txHash: receipt.hash as string };
  },
};

// Helpers
export function truncateAddress(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function formatWei(wei: string): string {
  try {
    if (wei.includes('.')) return `${Number(wei).toFixed(4)} 0G`;
    const og = parseFloat(wei) / 1e18;
    return og.toFixed(4) + ' 0G';
  } catch {
    return wei;
  }
}

export function getExplorerTxUrl(txHash: string): string {
  return `${OG_EXPLORER_URL}/tx/${txHash}`;
}
