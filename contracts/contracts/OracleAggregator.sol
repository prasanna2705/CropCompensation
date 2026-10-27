// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPolicyManager {
    enum PolicyStatus { Active, Paid, Expired }

    function executePayout(uint _policyId) external;
    function getPoliciesByRegion(uint _regionId) external view returns (uint[] memory);

    function templates(uint) external view returns (
        uint threshold, uint premium, uint payoutAmount,
        uint seasonStart, uint seasonEnd, uint regionId, bool active
    );

    function getPolicy(uint _policyId) external view returns (
        address farmer, uint templateId, uint purchasedAt, uint regionId, PolicyStatus status
    );
}

/// @title OracleAggregator - Multi-signer oracle consensus for weather-triggered payouts
contract OracleAggregator {
    address public owner;
    IPolicyManager public policyManager;
    uint public requiredConfirmations;

    mapping(address => bool) public isAuthorizedOracle;
    uint public authorizedOracleCount;

    // eventKey = keccak256(regionId, windowStart, rainfallMM) => confirmations
    mapping(bytes32 => uint) public confirmationsForEvent;
    mapping(bytes32 => mapping(address => bool)) public hasConfirmed;
    mapping(bytes32 => bool) public eventTriggered;

    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event ReadingSubmitted(address indexed oracle, uint regionId, uint rainfallMM, uint windowStart);
    event ThresholdTriggered(uint regionId, uint rainfallMM, uint windowStart);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedOracle() {
        require(isAuthorizedOracle[msg.sender], "Not an authorized oracle");
        _;
    }

    constructor(address _policyManager, uint _requiredConfirmations) {
        require(_policyManager != address(0), "Zero address");
        require(_requiredConfirmations > 0, "Need at least 1 confirmation");
        owner = msg.sender;
        policyManager = IPolicyManager(_policyManager);
        requiredConfirmations = _requiredConfirmations;
    }

    function addOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Zero address");
        require(!isAuthorizedOracle[_oracle], "Already authorized");
        isAuthorizedOracle[_oracle] = true;
        authorizedOracleCount++;
        emit OracleAdded(_oracle);
    }

    function removeOracle(address _oracle) external onlyOwner {
        require(isAuthorizedOracle[_oracle], "Not authorized");
        isAuthorizedOracle[_oracle] = false;
        authorizedOracleCount--;
        emit OracleRemoved(_oracle);
    }

    /// @notice Oracle nodes call this with a rainfall reading for a region + time window.
    /// @dev Uses a simple N-of-M confirmation model instead of trusting a single data source.
    function submitReading(uint _regionId, uint _rainfallMM, uint _windowStart) external onlyAuthorizedOracle {
        emit ReadingSubmitted(msg.sender, _regionId, _rainfallMM, _windowStart);

        bytes32 eventKey = keccak256(abi.encodePacked(_regionId, _windowStart, _rainfallMM));
        require(!hasConfirmed[eventKey][msg.sender], "Already confirmed by this oracle");

        hasConfirmed[eventKey][msg.sender] = true;
        confirmationsForEvent[eventKey]++;

        if (confirmationsForEvent[eventKey] >= requiredConfirmations && !eventTriggered[eventKey]) {
            eventTriggered[eventKey] = true;
            _checkAndTrigger(_regionId, _rainfallMM, _windowStart);
        }
    }

    function _checkAndTrigger(uint _regionId, uint _rainfallMM, uint _windowStart) internal {
        uint[] memory ids = policyManager.getPoliciesByRegion(_regionId);
        for (uint i = 0; i < ids.length; i++) {
            (, uint templateId, , , IPolicyManager.PolicyStatus status) = policyManager.getPolicy(ids[i]);
            if (status != IPolicyManager.PolicyStatus.Active) continue;

            (uint threshold, , , , , , bool active) = policyManager.templates(templateId);
            if (active && _rainfallMM < threshold) {
                policyManager.executePayout(ids[i]);
            }
        }
        emit ThresholdTriggered(_regionId, _rainfallMM, _windowStart);
    }
}
