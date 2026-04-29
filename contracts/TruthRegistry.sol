// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TruthRegistry
/// @notice Cross-contract truth (real/fake) voting registry for BaseConfess.
///         Confession ids are the *namespaced* Supabase ids, so a single registry
///         can serve confessions originating from any historical Confessions
///         deployment on Base. The registry intentionally has no existence
///         check on the confession id — eligibility is enforced off-chain by
///         the frontend (which only exposes ids that are already in the DB).
///         Each address can cast one vote per id; the choice cannot be changed.
contract TruthRegistry {
    /// @notice Number of "real" votes received per confession id.
    mapping(uint256 => uint256) public realVotes;
    /// @notice Number of "fake" votes received per confession id.
    mapping(uint256 => uint256) public fakeVotes;
    /// @notice Whether `voter` already voted on `confessionId`.
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event TruthVoted(
        uint256 indexed confessionId,
        address indexed voter,
        bool isReal
    );

    /// @notice Cast a single (real|fake) vote on `confessionId`.
    /// @dev    Reverts if the sender already voted on this id.
    function voteTruth(uint256 confessionId, bool isReal) external {
        require(!hasVoted[confessionId][msg.sender], "Already voted");
        hasVoted[confessionId][msg.sender] = true;

        if (isReal) {
            realVotes[confessionId] += 1;
        } else {
            fakeVotes[confessionId] += 1;
        }

        emit TruthVoted(confessionId, msg.sender, isReal);
    }

    /// @notice Convenience getter returning both counters for a confession id.
    function getTruthStats(uint256 confessionId)
        external
        view
        returns (uint256 real, uint256 fake)
    {
        return (realVotes[confessionId], fakeVotes[confessionId]);
    }
}
