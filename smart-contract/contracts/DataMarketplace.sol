// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DataRegistry.sol";

contract DataMarketplace {

    struct Purchase {
        uint256 id;
        uint256 datasetId;
        address buyer;
        address contributor;
        uint256 amount;
        uint256 platformFee;
        uint256 contributorPayout;
        bool isSubscription;
        bool settled;
        uint256 purchasedAt;
    }

    DataRegistry public registry;
    address public platformWallet;
    address public owner;

    uint256 public platformFeeBps;
    uint256 private _nextPurchaseId;

    mapping(uint256 => Purchase) private _purchases;
    mapping(address => uint256[]) private _buyerPurchases;
    mapping(address => uint256) private _pendingWithdrawals;
    mapping(address => mapping(uint256 => bool)) private _hasPurchased;

    event PurchaseCreated(
        uint256 indexed purchaseId,
        uint256 indexed datasetId,
        address indexed buyer,
        uint256 amount,
        bool isSubscription
    );

    event PurchaseSettled(
        uint256 indexed purchaseId,
        address indexed contributor,
        uint256 contributorPayout,
        uint256 platformFee
    );

    event Withdrawn(address indexed contributor, uint256 amount);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event PlatformWalletUpdated(address newWallet);

    modifier onlyOwner() {
        require(msg.sender == owner, "Marketplace: not owner");
        _;
    }

    constructor(
        address registryAddress,
        address _platformWallet,
        uint256 _platformFeeBps
    ) {
        require(registryAddress != address(0), "Marketplace: zero registry");
        require(_platformWallet != address(0), "Marketplace: zero wallet");
        require(_platformFeeBps <= 2000, "Marketplace: fee too high"); // max 20%

        registry = DataRegistry(registryAddress);
        platformWallet = _platformWallet;
        platformFeeBps = _platformFeeBps;
        owner = msg.sender;
        _nextPurchaseId = 1;
    }

    function purchaseAccess(uint256 datasetId) external payable {
        DataRegistry.Dataset memory ds = registry.getDataset(datasetId);

        require(ds.status == DataRegistry.DatasetStatus.ACTIVE, "Marketplace: dataset not active");
        require(msg.value == ds.pricePerAccess, "Marketplace: incorrect payment amount");
        require(msg.sender != ds.contributor, "Marketplace: contributor cannot buy own dataset");
        require(!_hasActiveAccess(msg.sender, datasetId), "Marketplace: access already purchased");

        _settle(datasetId, ds.contributor, msg.value, false);
    }

    function purchaseSubscription(uint256 datasetId) external payable {
        DataRegistry.Dataset memory ds = registry.getDataset(datasetId);

        require(ds.status == DataRegistry.DatasetStatus.ACTIVE, "Marketplace: dataset not active");
        require(ds.subscriptionPrice > 0, "Marketplace: subscriptions not available");
        require(msg.value == ds.subscriptionPrice, "Marketplace: incorrect subscription amount");
        require(msg.sender != ds.contributor, "Marketplace: contributor cannot subscribe to own dataset");
        require(!registry.isSubscriptionActive(datasetId, msg.sender), "Marketplace: subscription already active");

        _settle(datasetId, ds.contributor, msg.value, true);
    }

    function bulkPurchase(uint256[] calldata datasetIds) external payable {
        require(datasetIds.length > 0, "Marketplace: empty basket");

        uint256 totalRequired = 0;
        DataRegistry.Dataset[] memory datasets = new DataRegistry.Dataset[](datasetIds.length);

        // validate all datasets and sum total cost before touching money
        for (uint256 i = 0; i < datasetIds.length; i++) {
            require(!_hasActiveAccess(msg.sender, datasetIds[i]), "Marketplace: access already purchased");
            for (uint256 j = 0; j < i; j++) {
                require(datasetIds[i] != datasetIds[j], "Marketplace: duplicate dataset");
            }
            DataRegistry.Dataset memory ds = registry.getDataset(datasetIds[i]);
            require(ds.status == DataRegistry.DatasetStatus.ACTIVE, "Marketplace: a dataset is not active");
            require(msg.sender != ds.contributor, "Marketplace: cannot buy own dataset");
            datasets[i] = ds;
            totalRequired += ds.pricePerAccess;
        }

        require(msg.value == totalRequired, "Marketplace: incorrect bulk payment");

        for (uint256 i = 0; i < datasetIds.length; i++) {
            _settle(datasetIds[i], datasets[i].contributor, datasets[i].pricePerAccess, false);
        }
    }

    function _settle(
        uint256 datasetId,
        address contributor,
        uint256 amount,
        bool isSubscription
    ) internal {
        uint256 fee = (amount * platformFeeBps) / 10_000;
        uint256 payout = amount - fee;

        uint256 purchaseId = _nextPurchaseId++;

        _purchases[purchaseId] = Purchase({
            id: purchaseId,
            datasetId: datasetId,
            buyer: msg.sender,
            contributor: contributor,
            amount: amount,
            platformFee: fee,
            contributorPayout: payout,
            isSubscription: isSubscription,
            settled: true,
            purchasedAt: block.timestamp
        });

        _buyerPurchases[msg.sender].push(purchaseId);
        _hasPurchased[msg.sender][datasetId] = true;

        // accumulate contributor earnings — they pull via withdraw()
        _pendingWithdrawals[contributor] += payout;

        // platform fee goes out immediately
        if (fee > 0) {
            (bool sent, ) = platformWallet.call{value: fee}("");
            require(sent, "Marketplace: platform fee transfer failed");
        }

        registry.recordSale(datasetId, msg.sender, amount, isSubscription);

        emit PurchaseCreated(purchaseId, datasetId, msg.sender, amount, isSubscription);
        emit PurchaseSettled(purchaseId, contributor, payout, fee);
    }

    function withdraw() external {
        uint256 amount = _pendingWithdrawals[msg.sender];
        require(amount > 0, "Marketplace: nothing to withdraw");

        // zero out before transfer to prevent reentrancy
        _pendingWithdrawals[msg.sender] = 0;

        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Marketplace: withdrawal failed");

        emit Withdrawn(msg.sender, amount);
    }

    function getPurchase(uint256 purchaseId) external view returns (Purchase memory) {
        return _purchases[purchaseId];
    }

    function getBuyerPurchases(address buyer) external view returns (uint256[] memory) {
        return _buyerPurchases[buyer];
    }

    function getPendingBalance(address contributor) external view returns (uint256) {
        return _pendingWithdrawals[contributor];
    }

    function hasPurchased(address buyer, uint256 datasetId) external view returns (bool) {
        return _hasPurchased[buyer][datasetId];
    }

    function hasActiveAccess(address buyer, uint256 datasetId) external view returns (bool) {
        return _hasActiveAccess(buyer, datasetId);
    }

    function _hasActiveAccess(address buyer, uint256 datasetId) internal view returns (bool) {
        return _hasPurchased[buyer][datasetId] || registry.isSubscriptionActive(datasetId, buyer);
    }

    function updatePlatformFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 2000, "Marketplace: fee too high");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function updatePlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Marketplace: zero address");
        platformWallet = newWallet;
        emit PlatformWalletUpdated(newWallet);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Marketplace: zero address");
        owner = newOwner;
    }

    receive() external payable {}
}
