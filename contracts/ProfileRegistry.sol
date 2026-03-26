// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ProfileRegistry {
    struct UserProfile {
        bool exists;
        string username;
    }

    uint256 public usernameChangeFee = 0.00005 ether;

    address public owner;

    mapping(address => UserProfile) public users;
    mapping(bytes32 => address) public usernameOwner; // keccak256(lower(username)) -> owner

    event ProfileCreated(address indexed user, string username);
    event UsernameUpdated(address indexed user, string username, uint256 feePaid);
    event UsernameChangeFeeUpdated(uint256 newFee);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setUsernameChangeFee(uint256 newFee) external onlyOwner {
        usernameChangeFee = newFee;
        emit UsernameChangeFeeUpdated(newFee);
    }

    function setProfile(string calldata newUsername) external payable {
        require(bytes(newUsername).length > 0, "Username required");

        require(msg.value >= usernameChangeFee, "Username change requires 0.00005 ETH");

        bool wasExists = users[msg.sender].exists;

        bytes32 newKey = _usernameKey(newUsername);
        address currentOwner = usernameOwner[newKey];
        require(currentOwner == address(0) || currentOwner == msg.sender, "Username taken");

        // If overwriting an existing username, free the old one
        if (users[msg.sender].exists) {
            bytes32 oldKey = _usernameKey(users[msg.sender].username);
            if (oldKey != newKey && usernameOwner[oldKey] == msg.sender) {
                usernameOwner[oldKey] = address(0);
            }
        }

        users[msg.sender] = UserProfile({ exists: true, username: newUsername });
        usernameOwner[newKey] = msg.sender;

        (bool ok, ) = payable(owner).call{ value: msg.value }("");
        require(ok, "Fee transfer failed");

        if (wasExists) {
            emit UsernameUpdated(msg.sender, newUsername, msg.value);
        } else {
            emit ProfileCreated(msg.sender, newUsername);
        }
    }

    function getProfile(address user) external view returns (bool exists, string memory username) {
        UserProfile memory p = users[user];
        return (p.exists, p.username);
    }

    function _usernameKey(string memory username) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_toLower(username)));
    }

    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory b = bytes(str);
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c >= 65 && c <= 90) {
                b[i] = bytes1(c + 32);
            }
        }
        return string(b);
    }
}

