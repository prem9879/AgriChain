# AgriChain Blockchain Backend

Node.js + Express backend for AgriChain's blockchain trust layer.

This service implements the blockchain API routes used by the mobile app:

- `GET /health`
- `GET /blockchain/stats?user_id=1`
- `GET /blockchain/trade/list?user_id=1`
- `GET /blockchain/trade/status?trade_id=TRD-...`
- `POST /blockchain/trade/create`
- `POST /blockchain/trade/confirm-delivery`
- `POST /blockchain/settlement/lock`
- `POST /blockchain/settlement/release`
- `GET /blockchain/proof/list?user_id=1`
- `POST /blockchain/proof/create`

## 1. Install

```bash
cd agrichain-backend
npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Important vars:

- `BLOCKCHAIN_MODE=simulation` for local development without wallet/RPC.
- `BLOCKCHAIN_MODE=live` to write to chain with `ethers`.
- `BLOCKCHAIN_RPC_URL`, `BLOCKCHAIN_PRIVATE_KEY`, `BLOCKCHAIN_CONTRACT_ADDRESS` are required for live mode.

## 3. Run API

```bash
npm run dev
```

Backend starts on `http://localhost:8000` by default.

## 4. Deploy smart contract (optional)

Contract file: `contracts/AgriEscrow.sol`

```bash
npx hardhat compile
npm run deploy:contract:amoy
```

The deploy command prints:

- `NETWORK=...`
- `CONTRACT_ADDRESS=...`

Put the deployed address into `.env` as `BLOCKCHAIN_CONTRACT_ADDRESS`.

## Sample API calls

Create trade:

```bash
curl -X POST http://localhost:8000/blockchain/trade/create \
  -H "Content-Type: application/json" \
  -d "{\"seller_user_id\":1,\"buyer_user_id\":2,\"crop\":\"onion\",\"quantity_kg\":1200,\"price_per_kg\":22.5,\"quality_grade\":\"A\"}"
```

Lock escrow:

```bash
curl -X POST http://localhost:8000/blockchain/settlement/lock \
  -H "Content-Type: application/json" \
  -d "{\"trade_id\":\"TRD-XXXX\"}"
```

Release escrow:

```bash
curl -X POST http://localhost:8000/blockchain/settlement/release \
  -H "Content-Type: application/json" \
  -d "{\"trade_id\":\"TRD-XXXX\"}"
```
