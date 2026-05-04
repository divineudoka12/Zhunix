// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DataRegistry {

    enum DataType {
        TEXT,
        CODE,
        AUDIO,
        VIDEO,
        IMAGE,
        BEHAVIORAL,
        FINANCIAL,
        DOMAIN
    }

    enum UsagePermission {
        AI_TRAINING,
        ANALYTICS,
        BOTH
    }

    enum DatasetStatus {
        ACTIVE,
        PAUSED,
        REMOVED
    }

    struct Dataset {
        uint256 id;
        address contributor;
        address agentAddress;
        string storageRootHash;
        string metadataURI;
        DataType dataType;
        UsagePermission permission;
        DatasetStatus status;
        uint256 pricePerAccess;
        uint256 subscriptionPrice;
        uint256 totalSales;
        uint256 totalRevenue;
        uint256 registeredAt;
        uint256 updatedAt;
        bool agentPricingEnabled;
    }

    address public owner;
    uint256 private _nextDatasetId;

    mapping(uint256 => Dataset) private _datasets;
    mapping(address => uint256[]) private _contributorDatasets;
    mapping(string => uint256) private _hashToDatasetId;
    mapping(uint256 => mapping(address => uint256)) private _subscriptions;

    event DatasetRegistered(
        uint256 indexed datasetId,
        address indexed contributor,
        DataType dataType,
        string storageRootHash,
        uint256 pricePerAccess
    );

    event DatasetUpdated(
        uint256 indexed datasetId,
        uint256 newPrice,
        DatasetStatus newStatus
    );

    event AgentAssigned(uint256 indexed datasetId, address indexed agent);

    event AgentPriceUpdated(
        uint256 indexed datasetId,
        uint256 newPrice,
        address indexed agent
    );

    event SaleRecorded(uint256 indexed datasetId, address indexed buyer, uint256 amount);

    event SubscriptionRecorded(
        uint256 indexed datasetId,
        address indexed buyer,
        uint256 expiresAt
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "DataRegistry: not owner");
        _;
    }

    modifier onlyContributor(uint256 datasetId) {
        require(_datasets[datasetId].contributor == msg.sender, "DataRegistry: not contributor");
        _;
    }

    modifier datasetExists(uint256 datasetId) {
        require(_datasets[datasetId].contributor != address(0), "DataRegistry: dataset not found");
        _;
    }

    constructor() {
        owner = msg.sender;
        _nextDatasetId = 1; // 0 means "not found" in hash lookups
    }

    function registerDataset(
        string calldata storageRootHash,
        string calldata metadataURI,
        DataType dataType,
        UsagePermission permission,
        uint256 pricePerAccess,
        uint256 subscriptionPrice,
        address agentAddress,
        bool agentPricingEnabled
    ) external returns (uint256 datasetId) {
        require(bytes(storageRootHash).length > 0, "DataRegistry: empty root hash");
        require(bytes(metadataURI).length > 0, "DataRegistry: empty metadata URI");
        require(pricePerAccess > 0, "DataRegistry: price must be > 0");
        require(_hashToDatasetId[storageRootHash] == 0, "DataRegistry: dataset already registered");

        datasetId = _nextDatasetId++;

        _datasets[datasetId] = Dataset({
            id: datasetId,
            contributor: msg.sender,
            agentAddress: agentAddress,
            storageRootHash: storageRootHash,
            metadataURI: metadataURI,
            dataType: dataType,
            permission: permission,
            status: DatasetStatus.ACTIVE,
            pricePerAccess: pricePerAccess,
            subscriptionPrice: subscriptionPrice,
            totalSales: 0,
            totalRevenue: 0,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            agentPricingEnabled: agentPricingEnabled
        });

        _contributorDatasets[msg.sender].push(datasetId);
        _hashToDatasetId[storageRootHash] = datasetId;

        emit DatasetRegistered(datasetId, msg.sender, dataType, storageRootHash, pricePerAccess);
    }

    function updateDataset(
        uint256 datasetId,
        uint256 newPrice,
        uint256 newSubscriptionPrice,
        DatasetStatus newStatus
    ) external onlyContributor(datasetId) datasetExists(datasetId) {
        require(newPrice > 0, "DataRegistry: price must be > 0");

        Dataset storage ds = _datasets[datasetId];
        ds.pricePerAccess = newPrice;
        ds.subscriptionPrice = newSubscriptionPrice;
        ds.status = newStatus;
        ds.updatedAt = block.timestamp;

        emit DatasetUpdated(datasetId, newPrice, newStatus);
    }

    function assignAgent(
        uint256 datasetId,
        address agentAddress,
        bool agentPricingEnabled
    ) external onlyContributor(datasetId) datasetExists(datasetId) {
        Dataset storage ds = _datasets[datasetId];
        ds.agentAddress = agentAddress;
        ds.agentPricingEnabled = agentPricingEnabled;
        ds.updatedAt = block.timestamp;

        emit AgentAssigned(datasetId, agentAddress);
    }

    function agentUpdatePrice(
        uint256 datasetId,
        uint256 newPrice
    ) external datasetExists(datasetId) {
        Dataset storage ds = _datasets[datasetId];
        require(ds.agentAddress == msg.sender, "DataRegistry: not the agent");
        require(ds.agentPricingEnabled, "DataRegistry: agent pricing disabled");
        require(newPrice > 0, "DataRegistry: price must be > 0");

        ds.pricePerAccess = newPrice;
        ds.updatedAt = block.timestamp;

        emit AgentPriceUpdated(datasetId, newPrice, msg.sender);
    }

    // only callable by DataMarketplace (owner) after ownership transfer
    function recordSale(
        uint256 datasetId,
        address buyer,
        uint256 amount,
        bool isSubscription
    ) external onlyOwner datasetExists(datasetId) {
        Dataset storage ds = _datasets[datasetId];
        ds.totalSales += 1;
        ds.totalRevenue += amount;
        ds.updatedAt = block.timestamp;

        if (isSubscription) {
            uint256 expiresAt = block.timestamp + 30 days;
            _subscriptions[datasetId][buyer] = expiresAt;
            emit SubscriptionRecorded(datasetId, buyer, expiresAt);
        } else {
            emit SaleRecorded(datasetId, buyer, amount);
        }
    }

    function getDataset(uint256 datasetId)
        external
        view
        datasetExists(datasetId)
        returns (Dataset memory)
    {
        return _datasets[datasetId];
    }

    function getContributorDatasets(address contributor)
        external
        view
        returns (uint256[] memory)
    {
        return _contributorDatasets[contributor];
    }

    function getDatasetByHash(string calldata rootHash) external view returns (uint256) {
        return _hashToDatasetId[rootHash];
    }

    function isSubscriptionActive(uint256 datasetId, address buyer) external view returns (bool) {
        return _subscriptions[datasetId][buyer] > block.timestamp;
    }

    function getSubscriptionExpiry(uint256 datasetId, address buyer) external view returns (uint256) {
        return _subscriptions[datasetId][buyer];
    }

    function totalDatasets() external view returns (uint256) {
        return _nextDatasetId - 1;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "DataRegistry: zero address");
        owner = newOwner;
    }
}
