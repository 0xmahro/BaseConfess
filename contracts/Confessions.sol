// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Confessions {

    uint256 public confessionCount;

    uint256 public confessionFee = 0.000025 ether;

    address public owner;

    mapping(uint256 => address) public confessionOwner;

    mapping(uint256 => mapping(address => int8)) public votes;

    event ConfessionPosted(
        uint256 indexed confessionId,
        address indexed user,
        bytes32 confessionHash,
        uint256 timestamp
    );

    event ConfessionVoted(
        uint256 indexed confessionId,
        address indexed voter,
        int8 vote
    );

    event ConfessionTipped(
        uint256 indexed confessionId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    event FeeUpdated(uint256 newFee);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setConfessionFee(uint256 newFee) external onlyOwner {
        confessionFee = newFee;
        emit FeeUpdated(newFee);
    }

    function postConfession(bytes32 confessionHash) external payable {
        require(msg.value == confessionFee, "Incorrect fee");

        confessionCount++;

        confessionOwner[confessionCount] = msg.sender;

        (bool feeSuccess, ) = payable(owner).call{value: msg.value}("");
        require(feeSuccess, "Fee transfer failed");

        emit ConfessionPosted(
            confessionCount,
            msg.sender,
            confessionHash,
            block.timestamp
        );
    }

    function vote(uint256 confessionId, int8 voteType) external {
        require(voteType == 1 || voteType == -1, "Invalid vote");

        require(confessionOwner[confessionId] != address(0), "Confession not found");

        votes[confessionId][msg.sender] = voteType;

        emit ConfessionVoted(
            confessionId,
            msg.sender,
            voteType
        );
    }

    function tip(uint256 confessionId) external payable {
        require(msg.value > 0, "Tip must be greater than 0");

        address confessionOwnerAddr = confessionOwner[confessionId];

        require(confessionOwnerAddr != address(0), "Confession not found");

        (bool tipSuccess, ) = payable(confessionOwnerAddr).call{value: msg.value}("");
        require(tipSuccess, "Tip transfer failed");

        emit ConfessionTipped(
            confessionId,
            msg.sender,
            confessionOwnerAddr,
            msg.value
        );
    }
}
