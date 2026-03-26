// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * BaseConfess ProfileSystem
 *
 * Notes:
 * - Confession content stored on-chain is expensive; this exists to satisfy the
 *   requested interface. In production you may want to store hashes only and
 *   index content off-chain (Supabase).
 * - activityScore can be computed off-chain using on-chain + Supabase data.
 */
contract ProfileSystem {
    uint256 public profileCreationFee = 0.00005 ether;

    // Fixed tag system: users can select up to 3 tags from this allowlist.
    mapping(bytes32 => bool) private allowedTag;

    struct Profile {
        address owner;
        string username;
        string[] tags; // max 3, no duplicates
        uint256 activityScore; // optional: can be set to 0 and computed off-chain
        uint256 totalTipsReceived; // in wei
        uint256 totalSpent; // in wei (profile creation fee + optional future spends)
        uint256 confessionCount;
        bool exists;
    }

    struct ConfessionData {
        string content;
        uint256 timestamp;
        uint256 totalLikes;
    }

    mapping(address => Profile) private profiles;
    mapping(address => ConfessionData[]) private confessionsByUser;
    mapping(bytes32 => address) public usernameOwner; // keccak256(lower(username)) -> owner

    event ProfileCreated(address indexed owner, string username);
    event TagsUpdated(address indexed owner, string[] tags);
    event TipSent(address indexed sender, address indexed receiver, uint256 amount);
    event ConfessionCreated(address indexed owner, string content, uint256 timestamp);

    constructor() {
        _allow("anon");
        _allow("toxic");
        _allow("lover");
        _allow("degen");
        _allow("dev");
        _allow("trader");
        _allow("shitposter");
        _allow("overthinker");
        _allow("lonely");
        _allow("savage");
    }

    function getProfile(address user)
        external
        view
        returns (
            bool exists,
            address owner,
            string memory username,
            string[] memory tags,
            uint256 activityScore,
            uint256 totalTipsReceived,
            uint256 totalSpent,
            uint256 confessionCount
        )
    {
        Profile storage p = profiles[user];
        return (
            p.exists,
            p.owner,
            p.username,
            p.tags,
            p.activityScore,
            p.totalTipsReceived,
            p.totalSpent,
            p.confessionCount
        );
    }

    function getConfessions(address user) external view returns (ConfessionData[] memory) {
        return confessionsByUser[user];
    }

    function createProfile(string calldata username, string[] calldata tags) external payable {
        require(!profiles[msg.sender].exists, "Profile already exists");
        require(msg.value >= profileCreationFee, "Profile creation requires 0.00005 ETH");
        _requireValidUsername(username);
        _requireValidTags(tags);

        bytes32 key = _usernameKey(username);
        require(usernameOwner[key] == address(0), "Username taken");

        Profile storage p = profiles[msg.sender];
        p.exists = true;
        p.owner = msg.sender;
        p.username = username;
        _setTags(p, tags);
        p.totalSpent += msg.value;

        usernameOwner[key] = msg.sender;

        emit ProfileCreated(msg.sender, username);
        emit TagsUpdated(msg.sender, p.tags);
    }

    function updateTags(string[] calldata tags) external {
        Profile storage p = profiles[msg.sender];
        require(p.exists, "Profile not found");
        _requireValidTags(tags);
        _setTags(p, tags);
        emit TagsUpdated(msg.sender, p.tags);
    }

    function sendTip(address to) external payable {
        require(msg.value > 0, "Tip must be > 0");
        require(to != address(0), "Invalid receiver");

        // Forward ETH to receiver (profile owner)
        (bool ok, ) = payable(to).call{ value: msg.value }("");
        require(ok, "Tip transfer failed");

        profiles[to].totalTipsReceived += msg.value;

        emit TipSent(msg.sender, to, msg.value);
    }

    /**
     * Records a confession for the given user.
     * For safety, only the user can record their own confession (prevents spoofing).
     */
    function recordConfession(address user, string calldata content) external {
        require(user == msg.sender, "Can only record own confession");
        require(bytes(content).length > 0, "Content required");

        confessionsByUser[user].push(
            ConfessionData({ content: content, timestamp: block.timestamp, totalLikes: 0 })
        );

        Profile storage p = profiles[user];
        if (p.exists) {
            p.confessionCount += 1;
        }

        emit ConfessionCreated(user, content, block.timestamp);
    }

    // -------------------------
    // Internal helpers
    // -------------------------

    function _setTags(Profile storage p, string[] calldata tags) internal {
        delete p.tags;
        for (uint256 i = 0; i < tags.length; i++) {
            p.tags.push(_toLower(tags[i]));
        }
    }

    function _requireValidUsername(string calldata username) internal pure {
        bytes memory b = bytes(username);
        require(b.length > 0, "Username required");
        require(b.length <= 32, "Username too long");
    }

    function _requireValidTags(string[] calldata tags) internal view {
        require(tags.length <= 3, "Max 3 tags");
        for (uint256 i = 0; i < tags.length; i++) {
            require(bytes(tags[i]).length > 0, "Empty tag");
            require(bytes(tags[i]).length <= 16, "Tag too long");
            string memory a = _toLower(tags[i]);
            require(allowedTag[keccak256(bytes(a))], "Tag not allowed");
            for (uint256 j = i + 1; j < tags.length; j++) {
                string memory b = _toLower(tags[j]);
                require(
                    keccak256(bytes(a)) != keccak256(bytes(b)),
                    "Duplicate tag"
                );
            }
        }
    }

    function _allow(string memory tag) internal {
        allowedTag[keccak256(bytes(tag))] = true;
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

