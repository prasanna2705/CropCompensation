// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PolicyManager - Parametric crop insurance policy & payout logic
contract PolicyManager {
    address public owner;
    address public oracleAggregator;
    uint public templateCount;
    uint public policyCount;

    struct PolicyTemplate {
        uint threshold;       // rainfall (mm) below which payout triggers
        uint premium;         // wei
        uint payoutAmount;    // wei
        uint seasonStart;
        uint seasonEnd;
        uint regionId;
        bool active;
    }

    enum PolicyStatus { Active, Paid, Expired }

    struct Policy {
        address farmer;
        uint templateId;
        uint purchasedAt;
        uint regionId;
        PolicyStatus status;
    }

    mapping(uint => PolicyTemplate) public templates;
    mapping(uint => Policy) public policies;
    mapping(address => uint[]) public farmerPolicies;
    mapping(uint => uint[]) public regionPolicies; // regionId => policyIds

    event TemplateCreated(uint indexed templateId, uint threshold, uint premium, uint payoutAmount, uint regionId);
    event PolicyPurchased(uint indexed policyId, address indexed farmer, uint templateId);
    event PayoutExecuted(uint indexed policyId, address indexed farmer, uint amount);
    event ReserveFunded(address indexed from, uint amount);
    event OracleAggregatorSet(address indexed aggregator);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracleAggregator() {
        require(msg.sender == oracleAggregator, "Not authorized oracle contract");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOracleAggregator(address _aggregator) external onlyOwner {
        require(_aggregator != address(0), "Zero address");
        oracleAggregator = _aggregator;
        emit OracleAggregatorSet(_aggregator);
    }

    function createTemplate(
        uint _threshold,
        uint _premium,
        uint _payoutAmount,
        uint _seasonStart,
        uint _seasonEnd,
        uint _regionId
    ) external onlyOwner returns (uint) {
        require(_seasonEnd > _seasonStart, "Invalid season window");
        templateCount++;
        templates[templateCount] = PolicyTemplate(
            _threshold, _premium, _payoutAmount, _seasonStart, _seasonEnd, _regionId, true
        );
        emit TemplateCreated(templateCount, _threshold, _premium, _payoutAmount, _regionId);
        return templateCount;
    }

    function deactivateTemplate(uint _templateId) external onlyOwner {
        templates[_templateId].active = false;
    }

    function purchasePolicy(uint _templateId) external payable returns (uint) {
        PolicyTemplate memory t = templates[_templateId];
        require(t.active, "Template not active");
        require(msg.value == t.premium, "Incorrect premium amount");
        require(block.timestamp <= t.seasonEnd, "Season already ended");

        policyCount++;
        policies[policyCount] = Policy(msg.sender, _templateId, block.timestamp, t.regionId, PolicyStatus.Active);
        farmerPolicies[msg.sender].push(policyCount);
        regionPolicies[t.regionId].push(policyCount);

        emit PolicyPurchased(policyCount, msg.sender, _templateId);
        return policyCount;
    }

    function fundReserve() external payable onlyOwner {
        emit ReserveFunded(msg.sender, msg.value);
    }

    /// @notice Called only by the OracleAggregator contract when a policy's trigger condition is met.
    function executePayout(uint _policyId) external onlyOracleAggregator {
        Policy storage p = policies[_policyId];
        require(p.status == PolicyStatus.Active, "Policy not active");

        PolicyTemplate memory t = templates[p.templateId];
        require(address(this).balance >= t.payoutAmount, "Insufficient reserve");

        // Effects before interaction (reentrancy protection)
        p.status = PolicyStatus.Paid;

        (bool sent, ) = payable(p.farmer).call{value: t.payoutAmount}("");
        require(sent, "Payout transfer failed");

        emit PayoutExecuted(_policyId, p.farmer, t.payoutAmount);
    }

    function getPoliciesByRegion(uint _regionId) external view returns (uint[] memory) {
        return regionPolicies[_regionId];
    }

    function getFarmerPolicies(address _farmer) external view returns (uint[] memory) {
        return farmerPolicies[_farmer];
    }

    function getPolicy(uint _policyId) external view returns (
        address farmer, uint templateId, uint purchasedAt, uint regionId, PolicyStatus status
    ) {
        Policy memory p = policies[_policyId];
        return (p.farmer, p.templateId, p.purchasedAt, p.regionId, p.status);
    }

    receive() external payable {
        emit ReserveFunded(msg.sender, msg.value);
    }
}
