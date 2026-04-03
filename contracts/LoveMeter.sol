// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice On-chain Love Meter — fee per test, random 50–100 (same logic as Remix deploy).
/// @dev Include `totalTests` so the frontend can show how many tests ran without scanning logs.
contract LoveMeter {
    uint256 public fee = 0.000025 ether;
    address public owner;
    uint256 public totalTests;

    event LoveTested(
        address indexed user,
        bytes32 indexed name1Hash,
        bytes32 indexed name2Hash,
        uint8 percent,
        uint256 paid
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    /// @notice 50–100 (inclusive). On-chain randomness is not secure for high-value use.
    function test(string calldata name1, string calldata name2) external payable returns (uint8 percent) {
        require(bytes(name1).length > 0 && bytes(name2).length > 0, "Empty name");
        require(msg.value == fee, "Incorrect fee");

        bytes32 h1 = keccak256(bytes(name1));
        bytes32 h2 = keccak256(bytes(name2));

        uint256 r = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    h1,
                    h2,
                    address(this)
                )
            )
        );

        percent = uint8((r % 51) + 50);

        (bool ok, ) = payable(owner).call{value: msg.value}("");
        require(ok, "Fee transfer failed");

        totalTests++;

        emit LoveTested(msg.sender, h1, h2, percent, msg.value);
    }
}
