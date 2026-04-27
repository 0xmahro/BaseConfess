// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Confessions {

    /// @notice Total number of confessions posted (also the next confession id).
    uint256 public totalConfessions;

    uint256 public confessionFee = 0.000025 ether;

    address public owner;

    mapping(uint256 => address) public confessionOwner;

    mapping(uint256 => mapping(address => int8)) public votes;

    // ─────────────────────────────────────────────────────────────────────────────
    // "Top Souls" leaderboard stats (per confession owner)
    // ─────────────────────────────────────────────────────────────────────────────
    mapping(address => uint256) public confessionCount;
    mapping(address => uint256) public totalLikes;
    mapping(address => uint256) public totalTips;
    mapping(address => uint256) public score;

    event ConfessionPosted(address indexed user);
    event ConfessionLiked(address indexed user);
    event ConfessionTipped(address indexed user, uint256 amount);

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

        totalConfessions++;

        confessionOwner[totalConfessions] = msg.sender;

        (bool feeSuccess, ) = payable(owner).call{value: msg.value}("");
        require(feeSuccess, "Fee transfer failed");

        // Leaderboard: +1 confession, +1 score.
        confessionCount[msg.sender] += 1;
        score[msg.sender] += 1;

        emit ConfessionPosted(msg.sender);
        emit ConfessionPosted(
            totalConfessions,
            msg.sender,
            confessionHash,
            block.timestamp
        );
    }

    function vote(uint256 confessionId, int8 voteType) external {
        require(voteType == 1 || voteType == -1, "Invalid vote");

        require(confessionOwner[confessionId] != address(0), "Confession not found");

        int8 prev = votes[confessionId][msg.sender];
        votes[confessionId][msg.sender] = voteType;

        // Leaderboard: track likes received by confession owner.
        // Only count +3 score on "like" (voteType == 1). Handle vote flips to prevent farming.
        address ownerAddr = confessionOwner[confessionId];
        if (ownerAddr != address(0) && ownerAddr != msg.sender) {
            if (prev == 1 && voteType != 1) {
                // remove a previously counted like
                if (totalLikes[ownerAddr] > 0) totalLikes[ownerAddr] -= 1;
                if (score[ownerAddr] >= 3) score[ownerAddr] -= 3;
            } else if (prev != 1 && voteType == 1) {
                // add a new like
                totalLikes[ownerAddr] += 1;
                score[ownerAddr] += 3;
                emit ConfessionLiked(ownerAddr);
            }
        }

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

        // Leaderboard: tips received by confession owner.
        totalTips[confessionOwnerAddr] += msg.value;
        score[confessionOwnerAddr] += 5;
        emit ConfessionTipped(confessionOwnerAddr, msg.value);

        emit ConfessionTipped(
            confessionId,
            msg.sender,
            confessionOwnerAddr,
            msg.value
        );
    }

    function getUserStats(address user)
        external
        view
        returns (uint256 _confessionCount, uint256 _totalLikes, uint256 _totalTips, uint256 _score)
    {
        return (confessionCount[user], totalLikes[user], totalTips[user], score[user]);
    }
}
