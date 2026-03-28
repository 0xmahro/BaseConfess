// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract WishBox {

    struct Wish {
        address creator;
        string category;
        uint256 timestamp;
    }

    Wish[] public wishes;

    uint256 public fee = 0.00003 ether;
    uint256 public totalWishes;

    mapping(string => uint256) public categoryCount;

    event WishCreated(address indexed user, string category, uint256 timestamp);

    function createWish(string calldata category) external payable {
        require(msg.value >= fee, "Fee required");

        wishes.push(Wish({
            creator: msg.sender,
            category: category,
            timestamp: block.timestamp
        }));

        totalWishes += 1;
        categoryCount[category] += 1;

        emit WishCreated(msg.sender, category, block.timestamp);
    }

    function getWishes() external view returns (Wish[] memory) {
        return wishes;
    }
}
