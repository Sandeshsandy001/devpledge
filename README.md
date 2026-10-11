# DevPledge | Web3 Commitment Escrow

**Built for the Colosseum & Superteam Nepal Hackathons**

DevPledge is a trustless accountability dApp built on Solana Devnet. Developers commit funds (SOL) into an on-chain escrow to force themselves to ship code on GitHub.

- **100% Refund:** If you meet your target commits before the deadline, your locked SOL is refunded 100% plus rent.
- **Trustless Slashing:** If the deadline expires and you fail your target, your locked SOL is slashed and sent to the community treasury.

---

## ⚡ Architecture & On-Chain State

- **Program ID:** [`FD17pHenPk3MXow2BMqWWH6N31UgTRwQJ1c8zimPPM5G`](https://explorer.solana.com/address/FD17pHenPk3MXow2BMqWWH6N31UgTRwQJ1c8zimPPM5G?cluster=devnet)
- **Network:** Solana Devnet
- **Program Framework:** Anchor 0.30
- **PDA Derivation:** `seeds = [b"pledge", user_pubkey.as_ref()]`

### Instruction Specifications

| Instruction | Discriminator | Accounts | Description |
|---|---|---|---|
| `create_pledge` | `[86, 26, 21, 66, 130, 186, 102, 36]` | `pledge` (PDA, mut), `user` (signer, mut), `authority` (relayer), `treasury`, `system_program` | Initializes escrow PDA and locks SOL with target commits and deadline |
| `settle_pledge` | `[10, 255, 168, 255, 64, 232, 134, 135]` | `pledge` (mut), `user` (mut), `authority` (signer, mut) | Oracle relayer verifies GitHub commits and refunds 100% deposit + rent to user |
| `slash_pledge` | `[115, 17, 113, 41, 119, 112, 230, 114]` | `pledge` (mut), `treasury` (mut) | Slashing triggered after deadline expiry; sends all escrowed funds to community treasury |

### Pledge Account Layout (205 bytes)

1. `discriminator`: 8 bytes (`[161, 197, 121, 46, 99, 75, 169, 131]`)
2. `user`: 32 bytes (Developer Public Key)
3. `authority`: 32 bytes (Oracle Relayer Public Key)
4. `treasury`: 32 bytes (Community Treasury Destination)
5. `amount`: 8 bytes LE (Escrowed Lamports)
6. `github_username`: 4 bytes length LE + UTF-8 string (max 39 characters)
7. `start_time`: 8 bytes LE (Unix timestamp in seconds)
8. `deadline`: 8 bytes LE (Unix timestamp in seconds)
9. `target_commits`: 1 byte (Target GitHub commits count)
10. `bump`: 1 byte (PDA bump seed)

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router) & React 19
- **Solana Web3:** `@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`
- **Wallet Support:** Standard Wallet standard auto-detection (Phantom, Solflare, Backpack)
- **Styling:** Custom Obsidian Dark Web3 Design System with Solana Purple & Emerald Gradients
- **GitHub Oracle Relayer:** Serverless API endpoints on Next.js App Router:
  - `GET /api/oracle/info`: Relayer authority public key and status
  - `POST /api/oracle/settle`: Automated on-chain settlement & refund signer
  - `POST /api/oracle/slash`: Automated on-chain slashing executor
  - `POST /api/github/verify`: Real-time public events & commits validator
  - `POST /api/github/simulate-commit`: Hackathon demo tester to simulate commits
  - `GET /api/pledges`: Devnet-wide escrow explorer

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Open in browser
http://localhost:3000
```

---

## 🧪 Hackathon Demo Flow (Speedrun in 60s)

1. Connect your Phantom or Solflare wallet on Devnet.
2. Enter your GitHub username (`Sandeshsandy001`). The app previews your avatar and repo count.
3. Select **3 Commits**, **10 Mins (Speedrun Demo)**, and **0.05 SOL**.
4. Click **"Lock 0.05 SOL in Escrow"** and approve the transaction.
5. Your pledge appears in **"My Active Escrow"** with a live countdown timer!
6. Click **"Simulate Commit (Demo)"** 3 times to simulate shipping code.
7. Click **"Claim 100% Refund"** — the Oracle relayer verifies proof, signs `settle_pledge`, and deposits your SOL back into your wallet with a confetti celebration!
