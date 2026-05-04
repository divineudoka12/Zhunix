// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC7857 {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isAuthorized(uint256 tokenId, address executor) external view returns (bool);
}

contract AgentRegistry {

    enum AgentStatus {
        ACTIVE,
        SUSPENDED,
        REVOKED
    }

    struct Agent {
        uint256 id;
        address agentAddress;
        address contributor;
        uint256 agenticTokenId;
        string metadataURI;
        AgentStatus status;
        uint256 totalPriceUpdates;
        uint256 totalNegotiations;
        uint256 registeredAt;
        uint256 updatedAt;
    }

    address public owner;
    uint256 private _nextAgentId;

    IERC7857 public agenticIdContract;

    mapping(uint256 => Agent) private _agents;
    mapping(address => uint256) private _agentAddressToId;
    mapping(address => uint256[]) private _contributorAgents;
    // ERC-7857 tokenId, agentId to prevent duplicate token registration
    mapping(uint256 => uint256) private _tokenIdToAgentId;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed agentAddress,
        address indexed contributor,
        uint256 agenticTokenId
    );

    event AgentStatusUpdated(uint256 indexed agentId, AgentStatus newStatus);

    event AgentActivityRecorded(uint256 indexed agentId, string activityType);

    event AgenticIdContractUpdated(address newContract);

    modifier onlyOwner() {
        require(msg.sender == owner, "AgentRegistry: not owner");
        _;
    }

    modifier onlyContributor(uint256 agentId) {
        require(_agents[agentId].contributor == msg.sender, "AgentRegistry: not contributor");
        _;
    }

    modifier agentExists(uint256 agentId) {
        require(_agents[agentId].agentAddress != address(0), "AgentRegistry: agent not found");
        _;
    }

    constructor(address agenticIdContractAddress) {
        require(agenticIdContractAddress != address(0), "AgentRegistry: zero address");
        owner = msg.sender;
        _nextAgentId = 1;
        agenticIdContract = IERC7857(agenticIdContractAddress);
    }

    function registerAgent(
        address agentAddress,
        uint256 agenticTokenId,
        string calldata metadataURI
    ) external returns (uint256 agentId) {
        require(agentAddress != address(0), "AgentRegistry: zero agent address");
        require(bytes(metadataURI).length > 0, "AgentRegistry: empty metadata URI");
        require(_agentAddressToId[agentAddress] == 0, "AgentRegistry: agent already registered");
        require(_tokenIdToAgentId[agenticTokenId] == 0, "AgentRegistry: token already registered");

        require(
            agenticIdContract.ownerOf(agenticTokenId) == msg.sender,
            "AgentRegistry: caller does not own this agentic ID"
        );

        require(
            agenticIdContract.isAuthorized(agenticTokenId, agentAddress),
            "AgentRegistry: agent wallet not authorized on agentic ID"
        );

        agentId = _nextAgentId++;

        _agents[agentId] = Agent({
            id: agentId,
            agentAddress: agentAddress,
            contributor: msg.sender,
            agenticTokenId: agenticTokenId,
            metadataURI: metadataURI,
            status: AgentStatus.ACTIVE,
            totalPriceUpdates: 0,
            totalNegotiations: 0,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _agentAddressToId[agentAddress] = agentId;
        _contributorAgents[msg.sender].push(agentId);
        _tokenIdToAgentId[agenticTokenId] = agentId;

        emit AgentRegistered(agentId, agentAddress, msg.sender, agenticTokenId);
    }

    // contributor suspends or revokes their own agent
    function updateAgentStatus(
        uint256 agentId,
        AgentStatus newStatus
    ) external onlyContributor(agentId) agentExists(agentId) {
        _agents[agentId].status = newStatus;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentStatusUpdated(agentId, newStatus);
    }

    // platform can kill any compromised agent globally
    function adminUpdateAgentStatus(
        uint256 agentId,
        AgentStatus newStatus
    ) external onlyOwner agentExists(agentId) {
        _agents[agentId].status = newStatus;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentStatusUpdated(agentId, newStatus);
    }

    // called by DataRegistry/Marketplace to log agent activity
    function recordPriceUpdate(uint256 agentId) external onlyOwner agentExists(agentId) {
        _agents[agentId].totalPriceUpdates += 1;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentActivityRecorded(agentId, "PRICE_UPDATE");
    }

    function recordNegotiation(uint256 agentId) external onlyOwner agentExists(agentId) {
        _agents[agentId].totalNegotiations += 1;
        _agents[agentId].updatedAt = block.timestamp;
        emit AgentActivityRecorded(agentId, "NEGOTIATION");
    }

    function isAgentActive(address agentAddress) external view returns (bool) {
        uint256 agentId = _agentAddressToId[agentAddress];
        if (agentId == 0) return false;
        return _agents[agentId].status == AgentStatus.ACTIVE;
    }

    // also checks ERC-7857 authorization is still valid live on chain
    function isAgentFullyAuthorized(address agentAddress) external view returns (bool) {
        uint256 agentId = _agentAddressToId[agentAddress];
        if (agentId == 0) return false;
        if (_agents[agentId].status != AgentStatus.ACTIVE) return false;

        // re-check live ERC-7857 authorization - contributor may have revoked it
        uint256 tokenId = _agents[agentId].agenticTokenId;
        return agenticIdContract.isAuthorized(tokenId, agentAddress);
    }

    function getAgent(uint256 agentId)
        external
        view
        agentExists(agentId)
        returns (Agent memory)
    {
        return _agents[agentId];
    }

    function getAgentByAddress(address agentAddress) external view returns (Agent memory) {
        uint256 agentId = _agentAddressToId[agentAddress];
        require(agentId != 0, "AgentRegistry: agent not found");
        return _agents[agentId];
    }

    function getAgentByTokenId(uint256 tokenId) external view returns (Agent memory) {
        uint256 agentId = _tokenIdToAgentId[tokenId];
        require(agentId != 0, "AgentRegistry: no agent for this token");
        return _agents[agentId];
    }

    function getContributorAgents(address contributor) external view returns (uint256[] memory) {
        return _contributorAgents[contributor];
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    // update ERC-7857 contract address if 0G deploys a new version
    function updateAgenticIdContract(address newContract) external onlyOwner {
        require(newContract != address(0), "AgentRegistry: zero address");
        agenticIdContract = IERC7857(newContract);
        emit AgenticIdContractUpdated(newContract);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AgentRegistry: zero address");
        owner = newOwner;
    }
}
