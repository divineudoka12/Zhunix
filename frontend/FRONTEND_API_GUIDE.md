# Zhunix Frontend API Guide

This guide explains how the frontend should interact with the Zhunix backend. The current backend is agent-centered: datasets are not just uploaded and listed, they are assigned to validator/pricing agents that affect validation, marketplace readiness, and price updates.

## Base URL

Local development:

```text
http://localhost:5000
```

Deployed backend:

```text
https://zhunix.vercel.app
```

All API routes except health are prefixed with:

```text
/api
```

Health check:

```http
GET /health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-10T12:00:00.000Z"
}
```

## Response Format

Successful responses generally include:

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

Validation errors include field-level details:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": ["Too small: expected string to have >=1 characters"]
  }
}
```

## Core Marketplace Flow

The frontend should treat agents as part of the marketplace lifecycle, not as an optional add-on.

1. User connects wallet and signs in with SIWE.
2. Contributor registers or selects an agent.
3. Contributor uploads a dataset file with an agent address and data type.
4. Contributor registers the dataset metadata with the storage root hash and the same agent address.
5. Backend registers the dataset on-chain with agent pricing enabled.
6. Backend creates a MongoDB dataset record with `validationStatus: "PENDING"`.
7. Backend asynchronously asks the assigned validation agent to assess quality.
8. Dataset becomes `APPROVED` or `REJECTED` based on quality score.
9. Approved datasets can participate in agent pricing cycles.
10. Buyers purchase access on-chain; backend exposes indexed purchase/access state.

Frontend implication: marketplace cards should show both normal dataset data and agent/validation data: `agentAddress`, `agentPricingEnabled`, `validationStatus`, `qualityScore`, and price fields.

## Authentication

The backend uses SIWE wallet authentication and returns a JWT.

Protected endpoints require:

```http
Authorization: Bearer <token>
```

Store the JWT after SIWE verification and attach it to all protected calls.

### Get SIWE Nonce

```http
GET /api/auth/nonce/:address
```

Example:

```http
GET /api/auth/nonce/0x1234...
```

Response:

```json
{
  "success": true,
  "nonce": "abc123"
}
```

### Verify SIWE Signature

```http
POST /api/auth/verify
Content-Type: application/json
```

Body:

```json
{
  "message": "<SIWE message string>",
  "signature": "<wallet signature>"
}
```

Response:

```json
{
  "success": true,
  "token": "<jwt>",
  "address": "0x1234..."
}
```

## Shared Enums

Use these exact string values in forms, filters, and API requests.

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

type UsagePermission = "AI_TRAINING" | "ANALYTICS" | "BOTH";

type DatasetStatus = "ACTIVE" | "PAUSED" | "REMOVED";

type AgentStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

type ValidationStatus = "PENDING" | "APPROVED" | "REJECTED";
```

## Agents

Agents are registered on-chain and stored in MongoDB. A dataset requires an `agentAddress` during upload and registration. That assigned agent is used for quality validation and agent-driven pricing.

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

Body:

```json
{
  "agentAddress": "0xagent...",
  "agenticTokenId": 1,
  "metadataURI": "https://example.com/agent.json"
}
```

Response:

```json
{
  "success": true,
  "agent": {},
  "txHash": "0xtransaction..."
}
```

Possible errors:

- `401 Unauthorized`
- `409 Agent already registered`

### Get Agent By Address

Public route.

```http
GET /api/agents/:address
```

Response:

```json
{
  "success": true,
  "agent": {}
}
```

Use this before dataset creation if the UI lets users paste/select an agent. If the agent is missing, prompt the contributor to register it first.

### Trigger Agent Pricing Cycle

Protected route.

```http
POST /api/agents/:datasetId/price-cycle
Authorization: Bearer <token>
```

`:datasetId` is the on-chain dataset id.

Response:

```json
{
  "success": true,
  "message": "Pricing cycle triggered"
}
```

Backend behavior:

- Only runs if the dataset exists.
- Only runs if `agentPricingEnabled` is true.
- Only runs if an `agentAddress` is assigned.
- Only runs if `validationStatus` is `APPROVED`.
- Uses the compute service to recommend a new ETH price.
- Calls the registry contract's agent price update function.
- Updates `dataset.pricePerAccess` in MongoDB.

Frontend note: this endpoint returns success even if no price changed. Refresh the dataset after calling it.

## Upload And Dataset Registration

Dataset creation is a two-step process.

1. Upload file to storage with `/api/upload`.
2. Register dataset metadata with `/api/datasets`.

Use the same `agentAddress`, `dataType`, file name, and file size across the flow so validation has useful context.

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
| `agentAddress` | string | Yes | Validator/pricing agent address. |
| `dataType` | DataType | Yes | Dataset type. |
| `description` | string | No | Accepted by upload controller. |

Response:

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

### Register Dataset

Protected route.

```http
POST /api/datasets
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "storageRootHash": "<root hash from upload>",
  "metadataURI": "https://example.com/metadata.json",
  "name": "Dataset name",
  "description": "Dataset description",
  "dataType": "TEXT",
  "permission": "AI_TRAINING",
  "pricePerAccess": "0.01",
  "subscriptionPrice": "0.1",
  "agentAddress": "0xagent...",
  "tags": ["finance", "news"],
  "samplePreview": "Optional short preview",
  "fileSize": 123456,
  "fileName": "dataset.csv"
}
```

Important pricing note: the backend passes `pricePerAccess` and `subscriptionPrice` through `ethers.parseEther`, so send ETH-denominated strings like `"0.01"`, not wei strings.

Backend behavior:

- `agentAddress` is mandatory.
- `agentPricingEnabled` is forced to `true`.
- Dataset is registered on-chain.
- Dataset is saved in MongoDB.
- Validation is triggered asynchronously.
- Response returns before validation finishes.

Response:

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

Frontend recommendation: after successful registration, navigate to the dataset detail page and poll `/api/validation/:datasetId` until the status changes from `PENDING`.

## Datasets

### Dataset Shape

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

Response:

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

`:id` is the on-chain dataset id, not MongoDB `_id`.

Response:

```json
{
  "success": true,
  "dataset": {}
}
```

### Update Dataset

Protected route. Only the original contributor can update.

```http
PUT /api/datasets/:id
Authorization: Bearer <token>
Content-Type: application/json
```

`:id` is the on-chain dataset id.

Body:

```json
{
  "pricePerAccess": "0.012",
  "subscriptionPrice": "0.12",
  "status": "ACTIVE"
}
```

Response:

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

Validation is performed by the assigned validation agent after dataset registration. A score of `60` or higher is approved; below `60` is rejected.

### Get Dataset Validation

Public route.

```http
GET /api/validation/:datasetId
```

`:datasetId` is the on-chain dataset id.

Response:

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

Public in current code.

```http
GET /api/validation/pending/list?limit=50
```

Response:

```json
{
  "success": true,
  "count": 1,
  "datasets": []
}
```

### Trigger Validation Manually

Protected route.

```http
POST /api/validation/:datasetId/validate
Authorization: Bearer <token>
Content-Type: application/json
```

Body:

```json
{
  "agentAddress": "0xagent...",
  "fileSize": 123456,
  "fileName": "dataset.csv",
  "description": "Dataset description",
  "dataType": "TEXT"
}
```

Only `agentAddress` is required. Other values fall back to the stored dataset.

Response:

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

## Marketplace And Purchases

The backend does not expose a direct REST endpoint to create purchases. Purchase transactions should happen on-chain from the frontend or another wallet flow. The backend exposes indexed purchase history, access checks, and pending balances.

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

Response:

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

`:id` is the on-chain purchase id.

Response:

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

Response:

```json
{
  "success": true,
  "hasAccess": true,
  "datasetId": 1
}
```

Use this on dataset detail pages after wallet login to decide whether to show locked, purchase, or access UI.

### Get Pending Balance

Protected route.

```http
GET /api/purchases/balance
Authorization: Bearer <token>
```

Response:

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
- Verify with `/api/auth/verify`.
- Store JWT and wallet address.
- Attach `Authorization: Bearer <token>` to protected requests.

### Agent Directory

- Let contributors register agents with `/api/agents`.
- Let users look up agents with `/api/agents/:address`.
- Show agent status, agentic token id, owner/contributor, and marketplace activity fields.

### Dataset Upload Wizard

- Step 1: choose or register an agent.
- Step 2: collect file, data type, and description.
- Step 3: upload with `/api/upload`.
- Step 4: collect metadata URI, title, permission, price, tags, and preview.
- Step 5: register with `/api/datasets`.
- Step 6: poll `/api/validation/:datasetId`.

### Marketplace Listing

- List with `/api/datasets`.
- Show `validationStatus`, `qualityScore`, `agentAddress`, `pricePerAccess`, and `subscriptionPrice`.
- Treat `PENDING` and `REJECTED` as not fully marketplace-ready unless the product intentionally displays them.
- Use `/api/purchases/access/:datasetId` after login to gate buyer actions.

### Dataset Detail

- Fetch `/api/datasets/:id`.
- Fetch `/api/validation/:datasetId`.
- Fetch `/api/agents/:agentAddress`.
- If logged in, fetch `/api/purchases/access/:datasetId`.
- Contributors can update price/status with `PUT /api/datasets/:id`.
- Contributors can trigger agent pricing with `POST /api/agents/:datasetId/price-cycle`.

### Purchases

- Read purchase history from `/api/purchases`.
- Check a specific purchase with `/api/purchases/:id`.
- Show contributor balance from `/api/purchases/balance`.
- Execute purchase transactions through the marketplace contract from the frontend wallet flow, then rely on backend indexing for records and access checks.

## Frontend Implementation Notes

- Use on-chain ids for dataset and purchase route params.
- Use MongoDB `_id` only for display/debugging unless a specific UI needs it.
- Normalize wallet addresses to lowercase when comparing locally.
- Send ETH string prices like `"0.01"` because the backend uses `ethers.parseEther`.
- Keep `agentAddress` required in dataset forms.
- Poll validation status after registration because validation is async.
- Refresh dataset details after a pricing cycle because the endpoint does not return the updated dataset.
- Keep marketplace UI aware of validation state; an uploaded dataset is not necessarily approved yet.
