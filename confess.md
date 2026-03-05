# On‑Chain Confessions App – Full Architecture Guide

This document explains the full architecture for building an **On‑Chain Confession Social App** that runs on the Base network. The application allows users to post anonymous confessions, vote (like/dislike), and send tips.

The application will be developed using Cursor and built with a modern Web3 stack.

---

# 1. Product Concept

Users can:

* Write anonymous confessions
* Submit them through a blockchain transaction
* Pay a small posting fee
* Receive tips from other users
* Like or dislike confessions

Core rules:

1. Posting a confession costs **0.000025 ETH**
2. This fee is sent directly to the **contract owner**
3. The owner must be able to **change this fee later**
4. A wallet can vote **only once per confession**
5. A vote can be **like or dislike**
6. Users can **tip confession owners**

Blockchain interactions are stored via events and mirrored into Supabase for fast UI queries.

---

# 2. Tech Stack

Frontend

* Next.js
* React
* Wagmi
* Viem
* Tailwind

Blockchain

* Base Network
* Solidity

Backend

* Node.js event listener

Database

* Supabase

---

# 3. System Architecture

User Flow

User
↓
Write confession
↓
Hash confession text
↓
Send transaction
↓
Smart Contract
↓
Emit event
↓
Backend Event Listener
↓
Store data in Supabase
↓
Frontend reads from Supabase

Why this architecture:

* Blockchain = proof of interaction
* Supabase = fast social feed

---

# 4. Smart Contract Design

Contract Responsibilities

* Accept confession posts
* Charge posting fee
* Track confession owner
* Handle voting
* Handle tips
* Emit events

---

# 5. Smart Contract Implementation

```solidity
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

        payable(owner).transfer(msg.value);

        emit ConfessionPosted(
            confessionCount,
            msg.sender,
            confessionHash,
            block.timestamp
        );
    }

    function vote(uint256 confessionId, int8 voteType) external {

        require(voteType == 1 || voteType == -1, "Invalid vote");

        votes[confessionId][msg.sender] = voteType;

        emit ConfessionVoted(
            confessionId,
            msg.sender,
            voteType
        );
    }

    function tip(uint256 confessionId) external payable {

        address confessionOwnerAddr = confessionOwner[confessionId];

        require(confessionOwnerAddr != address(0), "Confession not found");

        payable(confessionOwnerAddr).transfer(msg.value);

        emit ConfessionTipped(
            confessionId,
            msg.sender,
            confessionOwnerAddr,
            msg.value
        );
    }
}
```

---

# 6. Database Schema (Supabase)

Table: confessions

columns

id
wallet
text
hash
timestamp
likes
dislikes
tips_received

Table: votes

id
confession_id
wallet
vote
timestamp

vote values

1 = like

-1 = dislike

Table: tips

id
confession_id
from_wallet
to_wallet
amount
timestamp

---

# 7. Event Listener Server

The backend listens to smart contract events and updates the database.

Libraries

* viem
* ethers

Example listener logic

```javascript
watchContractEvent({

  eventName: 'ConfessionPosted',

  onLogs: async (logs) => {

    const { confessionId, user, confessionHash } = logs.args

    await supabase.from('confessions').insert({
      id: confessionId,
      wallet: user,
      hash: confessionHash
    })

  }
})
```

Vote listener

```javascript
watchContractEvent({

  eventName: 'ConfessionVoted',

  onLogs: async (logs) => {

    const { confessionId, voter, vote } = logs.args

    await supabase.from('votes').insert({
      confession_id: confessionId,
      wallet: voter,
      vote
    })

  }
})
```

Tip listener

```javascript
watchContractEvent({

  eventName: 'ConfessionTipped',

  onLogs: async (logs) => {

    const { confessionId, from, to, amount } = logs.args

    await supabase.from('tips').insert({
      confession_id: confessionId,
      from_wallet: from,
      to_wallet: to,
      amount
    })

  }
})
```

---

# 8. Frontend Logic

User submits confession

1 User writes confession

2 Frontend hashes text

Example

```javascript
import { keccak256, toBytes } from 'viem'

const hash = keccak256(toBytes(confessionText))
```

3 Send transaction

```javascript
writeContract({

  address: contractAddress,

  abi,

  functionName: 'postConfession',

  args: [hash],

  value: parseEther('0.000025')

})
```

---

# 9. Voting Flow

User clicks like

↓

Wallet transaction

↓

vote(confessionId, 1)

Dislike

vote(confessionId, -1)

---

# 10. Tip Flow

User clicks tip

↓

Wallet transaction

↓

call tip(confessionId)

↓

ETH sent directly to confession owner

---

# 11. UI Layout

Confession Card

Wallet

0x34...af2

Text

"I skipped my final exam and blamed the professor"

Buttons

Like

Dislike

Tip

---

# 12. Feed Algorithm

Trending score

score = likes - dislikes + tips_received

Sorting query

ORDER BY score DESC

---

# 13. Project Folder Structure

```
project

contracts

Confessions.sol

frontend

app
components
lib

backend

listener

supabase

schema.sql
```

---

# 14. Future Features

Anonymous replies

Trending daily confession

Confession NFTs

Token reward system

Farcaster mini app integration

---

# 15. MVP Build Order

Step 1

Deploy smart contract

Step 2

Setup Supabase database

Step 3

Create event listener server

Step 4

Build Next.js frontend

Step 5

Integrate wallet + contract

Step 6

Launch MVP

---

End of architecture guide
