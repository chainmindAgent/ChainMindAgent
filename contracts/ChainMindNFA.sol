// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainMindNFA
 * @dev BAP-578 Non-Fungible Agent implementation for ChainMindX
 * @notice This contract creates an on-chain identity for the ChainMindX AI agent
 */
contract ChainMindNFA is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    // Agent state structure following BAP-578 specification
    struct AgentState {
        bool active;
        uint256 lastAction;
        uint256 actionCount;
        bytes32 stateHash;
    }

    // Mappings for agent data
    mapping(uint256 => AgentState) public agentStates;
    mapping(uint256 => string[]) private _agentCapabilities;
    mapping(uint256 => bool) public learningEnabled;
    mapping(uint256 => uint256) public agentFunds;

    // Events following BAP-578 specification
    event ActionExecuted(uint256 indexed tokenId, bytes32 actionHash, uint256 timestamp);
    event StateUpdated(uint256 indexed tokenId, bytes32 newStateHash);
    event LearningUpdated(uint256 indexed tokenId, bytes32 learningHash);
    event FundsDeposited(uint256 indexed tokenId, uint256 amount);
    event FundsWithdrawn(uint256 indexed tokenId, uint256 amount);

    constructor() ERC721("ChainMind Agent", "CMXA") Ownable(msg.sender) {}

    /**
     * @dev Mint a new NFA with metadata and capabilities
     * @param to Address to mint the NFA to
     * @param metadataURI IPFS URI containing agent metadata
     * @param capabilities Array of capability strings
     */
    function mint(
        address to, 
        string memory metadataURI, 
        string[] memory capabilities
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        // Initialize agent state
        agentStates[tokenId] = AgentState({
            active: true,
            lastAction: block.timestamp,
            actionCount: 0,
            stateHash: keccak256(abi.encodePacked(metadataURI, block.timestamp))
        });
        
        // Store capabilities
        _agentCapabilities[tokenId] = capabilities;
        
        return tokenId;
    }

    /**
     * @dev Execute an action on behalf of the agent
     * @param tokenId The NFA token ID
     * @param actionData Encoded action data
     */
    function executeAction(uint256 tokenId, bytes calldata actionData) public returns (bool) {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(agentStates[tokenId].active, "Agent not active");
        
        AgentState storage state = agentStates[tokenId];
        state.lastAction = block.timestamp;
        state.actionCount++;
        state.stateHash = keccak256(abi.encodePacked(state.stateHash, actionData));
        
        emit ActionExecuted(tokenId, keccak256(actionData), block.timestamp);
        emit StateUpdated(tokenId, state.stateHash);
        
        return true;
    }

    /**
     * @dev Propose an action (for multi-sig or delayed execution)
     */
    function proposeAction(uint256 tokenId, bytes calldata actionData) public returns (bytes32) {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        return keccak256(abi.encodePacked(tokenId, actionData, block.timestamp));
    }

    /**
     * @dev Get agent state
     */
    function getAgentState(uint256 tokenId) public view returns (AgentState memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return agentStates[tokenId];
    }

    /**
     * @dev Get agent capabilities
     */
    function getAgentCapabilities(uint256 tokenId) public view returns (string[] memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _agentCapabilities[tokenId];
    }

    /**
     * @dev Check if learning is enabled for agent
     */
    function isLearningEnabled(uint256 tokenId) public view returns (bool) {
        return learningEnabled[tokenId];
    }

    /**
     * @dev Enable/disable learning for agent
     */
    function setLearningEnabled(uint256 tokenId, bool enabled) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        learningEnabled[tokenId] = enabled;
    }

    /**
     * @dev Update agent learning state
     */
    function updateLearning(uint256 tokenId, bytes calldata learningData) public returns (bool) {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(learningEnabled[tokenId], "Learning not enabled");
        
        emit LearningUpdated(tokenId, keccak256(learningData));
        return true;
    }

    /**
     * @dev Deposit BNB to agent vault
     */
    function depositFunds(uint256 tokenId) public payable {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        agentFunds[tokenId] += msg.value;
        emit FundsDeposited(tokenId, msg.value);
    }

    /**
     * @dev Withdraw BNB from agent vault
     */
    function withdrawFunds(uint256 tokenId, uint256 amount) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        require(agentFunds[tokenId] >= amount, "Insufficient funds");
        
        agentFunds[tokenId] -= amount;
        payable(msg.sender).transfer(amount);
        emit FundsWithdrawn(tokenId, amount);
    }

    /**
     * @dev Set agent active status
     */
    function setAgentActive(uint256 tokenId, bool active) public {
        require(ownerOf(tokenId) == msg.sender, "Not owner");
        agentStates[tokenId].active = active;
    }

    // Required overrides
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Allow contract to receive BNB
    receive() external payable {}
}
