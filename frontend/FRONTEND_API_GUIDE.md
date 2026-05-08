# Zhunix Frontend API Guide

This document describes how the frontend should integrate with the current Zhunix backend API.

## Base URL

Local development:

```text
http://localhost:5000
```

All API routes, except health check, are prefixed with:

```text
/api
```

Health check:

```http
GET /health
```

Success response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-08T12:00:00.000Z"
}
```

## Response Conventions

Successful API responses generally include:

```json
{
  "success": true
}
```

Error responses generally include:

```json
{
  "success": false,
  "message": "Error message"
}
```

Validation errors include field-level errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": ["Too small: expected string to have >=1 characters"]
  }
}
```

## Authentication

The backend uses SIWE wallet authentication and returns a JWT.

Authenticated requests must include:

```http
Authorization: Bearer <token>
```

The token payload identifies the connected wallet address. Store the token on the frontend after signature verification and attach it to protected endpoints.

### 1. Get SIWE Nonce

```http
GET /api/auth/nonce/:address
```

Example:

```http
GET /api/auth/nonce/0x1234...
```

Success response:

```json
{
  "success": true,
  "nonce": "abc123"
}
```

Frontend use:

- Request a nonce for the connected wallet address.
- Build a SIWE message with that nonce.
- Ask the wallet to sign the SIWE message.
- Send the message and signature to `/api/auth/verify`.

### 2. Verify SIWE Signature

```http
POST /api/auth/verify
Content-Type: application/json
```

Request body:

```json
{
  "message": "<SIWE message string>",
  "signature": "<wallet signature>"
}
```

Success response:

```json
{
  "success": true,
  "token": "<jwt>",
  "address": "0x1234..."
}
```

Possible errors:

- `401 Invalid signature`
- `401 Invalid or expired nonce`
- `400 Validation failed`

## Enums

Use these exact string values in frontend forms and API requests.

### DataType

```ts
type DataType =
  | "TEXT"
  | "CODE"
  | "AUDIO"
  | "VIDEO"
  | "IMAGE"
  | "BEHAVIORAL"
  | "FINANCIAL"
  | "DOMAIN";
```

### UsagePermission

```ts
type UsagePermission = "AI_TRAINING" | "ANALYTICS" | "BOTH";
```

### DatasetStatus

```ts
type DatasetStatus = "ACTIVE" | "PAUSED" | "REMOVED";
```

### AgentStatus

```ts
type AgentStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";
```

### ValidationStatus

```ts
type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";
```

## Upload Flow

The frontend dataset creation flow should be split into two backend calls:

1. Upload the file to storage with `/api/upload`.
2. Register the dataset metadata and returned root hash with `/api/datasets`.

The backend requires an agent address for both upload and registration because validation is tied to a validator agent.

### Upload Dataset File

Protected route.

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Form fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `file` | File | Yes | Max size is 500 MB. |
| `agentAddress` | string | Yes | Validator agent address. |
| `dataType` | DataType | Yes | Dataset type. |
| `description` | string | No | Accepted by controller but not currently used by upload response. |

Success response:

```json
{
  "success": true,
  "rootHash": "<storage root hash>",
  "originalName": "dataset.csv",
  "size": 123456,
  "message": "File uploaded successfully. Validation pending assignment to dataset registration.",
  "validatorAgent": "0xagent...",
  "dataType": "TEXT"
}
```

Possible errors:

- `400 No file provided`
- `400 Agent address is mandatory for data validation`
- `400 Data type is required`
- `401 Unauthorized`

## Datasets

### Dataset Shape

Dataset objects returned by the API include these main fields:

```ts
interface Dataset {
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
```

### List Datasets

Public route.

```http
GET /api/datasets
```

Query parameters:

| Query | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `dataType` | DataType | No | - | Filter by dataset type. |
| `permission` | UsagePermission | No | - | Filter by usage permission. |
| `status` | DatasetStatus | No | `ACTIVE` | Defaults to active datasets. |
| `contributor` | string | No | - | Wallet address. |
| `tags` | string | No | - | Comma-separated tags. |
| `page` | number | No | `1` | Pagination page. |
| `limit` | number | No | `20` | Pagination size. |

Example:

```http
GET /api/datasets?dataType=TEXT&tags=finance,news&page=1&limit=12
```

Success response:

```json
{
  "success": true,
  "datasets": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "pages": 0
  }
}
```

### Get Dataset

Public route.

```http
GET /api/datasets/:id
```

Important: `:id` is the on-chain dataset id, not MongoDB `_id`.

Success response:

```json
{
  "success": true,
  "dataset": {}
}
```

Possible errors:

- `404 Dataset not found`

### Register Dataset

Protected route.

```http
POST /api/datasets
Authorization: Bearer <token>
Content-Type: application/json
```

Request body:

```json
{
  "storageRootHash": "<root hash from upload>",
  "metadataURI": "https://example.com/metadata.json",
  "name": "Dataset name",
  "description": "Dataset description",
  "dataType": "TEXT",
  "permission": "AI_TRAINING",
  "pricePerAccess": "1000000000000000000",
  "subscriptionPrice": "10000000000000000000",
  "agentAddress": "0xagent...",
  "agentPricingEnabled": true,
  "tags": ["finance", "news"],
  "samplePreview": "Optional short preview"
}
```

Frontend notes:

- `agentAddress` is required by the controller, even though the route schema currently marks it optional.
- `agentPricingEnabled` is forced to `true` by the backend.
- `pricePerAccess` and `subscriptionPrice` are strings, suitable for wei-like values.
- `metadataURI` must be a valid URL.
- After registration, the backend triggers async validation and returns immediately.
- The controller reads `fileSize` and `fileName` from the request body for validation, but the route schema currently does not allow those fields through. See backend blockers below.

Success response:

```json
{
  "success": true,
  "dataset": {},
  "txHash": "0xtransaction...",
  "message": "Dataset registered. Quality validation in progress."
}
```

Possible errors:

- `400 Agent address is mandatory for quality validation`
- `400 Validation failed`
- `401 Unauthorized`
- `409 Dataset with this root hash already exists`

### Update Dataset

Protected route. Only the original contributor can update.

```http
PUT /api/datasets/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Important: `:id` is the on-chain dataset id.

Request body:

```json
{
  "pricePerAccess": "1200000000000000000",
  "subscriptionPrice": "12000000000000000000",
  "status": "ACTIVE"
}
```

Success response:

```json
{
  "success": true,
  "dataset": {}
}
```

Possible errors:

- `401 Unauthorized`
- `403 Forbidden`
- `404 Dataset not found`

## Validation

Validation checks dataset quality with an assigned validation agent. A score of `60` or higher is approved; below `60` is rejected.

### Get Dataset Validation

Public route.

```http
GET /api/validation/:datasetId
```

Important: `:datasetId` is the on-chain dataset id.

Success response:

```json
{
  "success": true,
  "validation": {
    "_id": "...",
    "validationStatus": "PENDING",
    "validatorAgent": "0xagent...",
    "validationTimestamp": null,
    "qualityScore": 0,
    "validationDetails": {
      "completeness": 0,
      "accuracy": 0,
      "authenticity": 0,
      "consistency": 0,
      "issues": [],
      "recommendations": []
    }
  }
}
```

Possible errors:

- `404 Dataset not found`

### Get Pending Validations

Public in current code, though comments say admin/agent.

```http
GET /api/validation/pending/list?limit=50
```

Query parameters:

| Query | Type | Required | Default | Max |
| --- | --- | --- | --- | --- |
| `limit` | number | No | `50` | `100` |

Success response:

```json
{
  "success": true,
  "count": 1,
  "datasets": []
}
```

### Trigger Validation

Protected route.

```http
POST /api/validation/:datasetId/validate
Authorization: Bearer <token>
Content-Type: application/json
```

Request body:

```json
{
  "agentAddress": "0xagent...",
  "fileSize": 123456,
  "fileName": "dataset.csv",
  "description": "Dataset description",
  "dataType": "TEXT"
}
```

Only `agentAddress` is required. Other fields fall back to the stored dataset.

Success response:

```json
{
  "success": true,
  "result": {
    "validationStatus": "APPROVED",
    "qualityScore": 82,
    "assessment": {
      "overallScore": 82,
      "completeness": 80,
      "accuracy": 85,
      "authenticity": 81,
      "consistency": 82,
      "issues": [],
      "recommendations": []
    }
  }
}
```

Possible errors:

- `400 Agent address is required`
- `401 Unauthorized`
- `404 Dataset not found`

## Agents

### Agent Shape

```ts
interface Agent {
  _id: string;
  onChainAgentId: number;
  agentAddress: string;
  contributor: string;
  agenticTokenId: number;
  metadataURI: string;
  status: AgentStatus;
  totalPriceUpdates: number;
  totalNegotiations: number;
  createdAt: string;
  updatedAt: string;
}
```

### Register Agent

Protected route.

```http
POST /api/agents
Authorization: Bearer <token>
Content-Type: application/json
```

Request body:

```json
{
  "agentAddress": "0xagent...",
  "agenticTokenId": 1,
  "metadataURI": "https://example.com/agent.json"
}
```

Success response:

```json
{
  "success": true,
  "agent": {},
  "txHash": "0xtransaction..."
}
```

Possible errors:

- `400 Validation failed`
- `401 Unauthorized`
- `409 Agent already registered`

### Get Agent By Address

Public route.

```http
GET /api/agents/:address
```

Success response:

```json
{
  "success": true,
  "agent": {}
}
```

Possible errors:

- `404 Agent not found`

### Trigger Agent Pricing Cycle

Protected route.

```http
POST /api/agents/:datasetId/price-cycle
Authorization: Bearer <token>
```

Success response:

```json
{
  "success": true,
  "message": "Pricing cycle triggered"
}
```

## Purchases

Purchase records are indexed from on-chain marketplace events. The current backend exposes read/access routes, but no direct purchase creation endpoint.

### Purchase Shape

```ts
interface Purchase {
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
```

### List My Purchases

Protected route.

```http
GET /api/purchases
Authorization: Bearer <token>
```

Success response:

```json
{
  "success": true,
  "purchases": []
}
```

### Get My Purchase

Protected route.

```http
GET /api/purchases/:id
Authorization: Bearer <token>
```

Important: `:id` is the on-chain purchase id.

Success response:

```json
{
  "success": true,
  "purchase": {}
}
```

Possible errors:

- `401 Unauthorized`
- `403 Forbidden`
- `404 Purchase not found`

### Check Dataset Access

Protected route.

```http
GET /api/purchases/access/:datasetId
Authorization: Bearer <token>
```

Success response:

```json
{
  "success": true,
  "hasAccess": true,
  "datasetId": 1
}
```

### Get Pending Balance

Protected route.

```http
GET /api/purchases/balance
Authorization: Bearer <token>
```

Success response:

```json
{
  "success": true,
  "balance": "0"
}
```

## Suggested Frontend Screens

### Wallet Auth

- Connect wallet.
- Request nonce with `/api/auth/nonce/:address`.
- Sign SIWE message.
- Verify signature with `/api/auth/verify`.
- Store JWT and wallet address.
- Add `Authorization: Bearer <token>` to protected requests.

### Dataset Marketplace

- Use `/api/datasets` for listing and filters.
- Use `dataType`, `permission`, `status`, `tags`, `page`, and `limit` query params.
- Show `qualityScore`, `validationStatus`, price fields, tags, and contributor.
- Use `/api/datasets/:id` for details.
- Use `/api/purchases/access/:datasetId` to gate protected dataset actions after wallet login.

### Dataset Upload/Register

- Step 1: collect file, data type, description, validator agent address.
- Step 2: call `/api/upload` with multipart form data.
- Step 3: collect metadata URL, name, permission, pricing, tags, sample preview.
- Step 4: call `/api/datasets` with the upload `rootHash`.
- Step 5: poll `/api/validation/:datasetId` until status is no longer `PENDING`.

### Agent Management

- Register agents with `/api/agents`.
- Look up agent profiles with `/api/agents/:address`.
- Trigger dataset-specific pricing cycles with `/api/agents/:datasetId/price-cycle`.

### Purchases

- Display current user's purchase history from `/api/purchases`.
- Display pending balance from `/api/purchases/balance`.
- Do blockchain purchase transactions on the frontend or another service, then rely on backend indexing to expose purchase records.

## Backend Blockers To Confirm Before Frontend Integration

These issues were found while preparing this guide and may block frontend testing:

1. `src/controllers/dataset.controller.ts` has an extra duplicate response/catch block around line 91. `npm run build` reports TypeScript syntax errors there.
2. `src/routes/validation.routes.ts` imports `authMiddleware`, but `src/middleware/auth.middleware.ts` exports `authenticate`. The protected validation trigger route should likely use `authenticate`.
3. `POST /api/datasets` reads `fileSize` and `fileName` for async validation, but the Zod route schema does not include those fields. They will be stripped from `req.body` by validation unless added to the schema.
4. `POST /api/datasets` route schema currently marks `agentAddress` optional, but the controller requires it. Frontend should treat it as required.
5. `GET /api/validation/pending/list` is public in current code, even though comments say admin/agent only.
6. `npm run build` also hit sandbox write permission errors against `dist` in this environment, so a clean local build should be run outside the sandbox after the syntax issues are fixed.
