const BASE_URL = 'https://zhunix.vercel.app';

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
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: formData });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Upload failed');
  return data;
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

export const purchases = {
  list: () => request<{ success: true; purchases: Purchase[] }>('/api/purchases'),
  get: (id: number | string) => request<{ success: true; purchase: Purchase }>(`/api/purchases/${id}`),
  checkAccess: (datasetId: number | string) =>
    request<{ success: true; hasAccess: boolean; datasetId: number }>(`/api/purchases/access/${datasetId}`),
  balance: () => request<{ success: true; balance: string }>('/api/purchases/balance'),
};

// Helpers
export function truncateAddress(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export function formatWei(wei: string): string {
  try {
    const eth = parseFloat(wei) / 1e18;
    return eth.toFixed(4) + ' ETH';
  } catch {
    return wei;
  }
}
