# 🔗 AgriChain — Blockchain-Powered Agricultural Supply Chain

> Decentralized agricultural supply chain management built on Ethereum/Polygon with Solidity smart contracts, enabling transparent farm-to-consumer traceability, tokenized incentives, and parametric crop insurance.

[![Solidity](https://img.shields.io/badge/Solidity-0.8.19-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19-yellow?logo=ethereum)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-4.9-blue?logo=openzeppelin)](https://www.openzeppelin.com/)
[![Polygon](https://img.shields.io/badge/Polygon-Mainnet-8247E5?logo=polygon)](https://polygon.technology/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

AgriChain is a **blockchain-based agricultural supply chain platform** that combines:

- **Smart Contracts (Solidity)** — On-chain supply chain tracking, escrow payments, crop insurance, and ERC-20 reward tokens
- **React Native Mobile App** — Farmer and buyer interface with wallet integration
- **Decentralized Oracle Network** — Weather data feeds for parametric insurance triggers
- **Token Economics** — AGRI utility token with staking rewards for ecosystem participants

### Core Blockchain Features

| Smart Contract | Purpose | Network |
|---|---|---|
| `AgriChain.sol` | Supply chain traceability — farm registration, batch tracking, marketplace | Polygon / Sepolia |
| `CropInsurance.sol` | Parametric crop insurance with oracle-fed weather triggers | Polygon / Sepolia |
| `AgriToken.sol` | ERC-20 utility token (AGRI) with staking & reward mechanics | Polygon / Sepolia |

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                   React Native App                   │
│          (Farmer / Buyer / Inspector UI)             │
└──────────────────────┬──────────────────────────────┘
                       │ ethers.js
┌──────────────────────▼──────────────────────────────┐
│              Blockchain Layer (EVM)                   │
│  ┌──────────────┐ ┌────────────┐ ┌───────────────┐  │
│  │ AgriChain.sol│ │AgriToken   │ │CropInsurance  │  │
│  │ Supply Chain │ │  (ERC-20)  │ │  + Oracles    │  │
│  └──────────────┘ └────────────┘ └───────────────┘  │
│           Polygon / Ethereum Sepolia                 │
└─────────────────────────────────────────────────────┘
```

## Smart Contracts

### AgriChain.sol — Supply Chain
- Farm registration & verification
- Produce batch creation with crop metadata
- Full supply chain event tracking (temperature, humidity, location)
- On-chain marketplace with escrow payments
- Quality grading by verified inspectors
- 2% platform fee with `ReentrancyGuard` protection

### CropInsurance.sol — Parametric Insurance
- Decentralized crop insurance policies
- Weather oracle integration for automated claims
- Parametric triggers: drought, flood, hailstorm, frost, cyclone
- Claim filing and DAO-governed approval

### AgriToken.sol — Token Economics
- ERC-20 utility token (AGRI) with 100M max supply
- Staking mechanism with 5% APY rewards
- Ecosystem rewards: 100 AGRI/batch, 50 AGRI/purchase, 25 AGRI/inspection
- Burn mechanism for deflationary pressure

## Quick Start — Blockchain

```bash
# Install blockchain dependencies
cd blockchain
npm install

# Start local Hardhat node
npx hardhat node

# Deploy contracts (new terminal)
npx hardhat run scripts/deploy.js --network localhost

# Run tests
npx hardhat test

# Gas report
REPORT_GAS=true npx hardhat test

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.js --network sepolia
```

## Mobile App (Expo React Native)

The mobile app integrates with the blockchain layer via `ethers.js` for:
- Wallet creation & import (mnemonic-based)
- On-chain batch registration & tracking
- Token staking & rewards dashboard
- Insurance policy purchase & claim filing

AGRI-मित्र is a farmer decision-support platform with:
- an Expo React Native mobile app (`AgriChain/`)
- a FastAPI + ML backend (`agrichain-backend/`)
- Solidity smart contracts for on-chain supply chain (`blockchain/`)

## Mobile App (Expo React Native)

### Tech Stack
- Expo SDK 55
- React Native
- React Navigation (bottom tabs + stack)
- React Native Paper
- Axios
- OpenWeatherMap API
- data.gov.in Agmarknet API

### Current Features
- Home dashboard cards: Harvest Advisor, Spoilage Risk, etc.
- Bottom tabs: Home, Market, ARIA, Profile
- Crop input flow:
  - crop, district, soil type, sowing date
  - storage type
  - transit time slider (1-48 hours)
- Recommendation screen:
  - best harvest window
  - best mandi with earnings comparison
  - expandable "Why we recommend this"
  - quick navigation to Spoilage Risk checker
- Spoilage Risk screen:
  - auto-filled inputs when opened from Recommendation
  - crop/storage pickers + days-since-harvest slider + transit slider
  - weather temperature context display
  - animated circular risk meter (Low/Medium/High/Critical)
  - ranked preservation actions by cost
  - explanatory "Why" section
- API fallback behavior:
  - if weather/mandi API fails, app still returns calculated fallback recommendations

### Prerequisites
- Node.js 20.19.4 or newer (24.x recommended)
- npm
- Expo Go app on Android device
- Android Platform Tools (`adb`) for USB debugging workflow

### Install
```bash
npm install
```

### Run (Android)
```bash
npm run android
```

If using a physical Android phone:
1. Enable Developer Options and USB debugging.
2. Connect phone by USB and approve debugging prompt.
3. Verify:
```bash
adb devices
```

### Mobile Environment Variables
Create `.env` in `AgriChain/`:
```env
EXPO_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
EXPO_PUBLIC_DATA_GOV_API_KEY=your_data_gov_key
```

## Backend (Blockchain Trust Layer)

Backend location: `agrichain-backend/`

### Backend Features
- Node.js + Express API backend
- Smart contract escrow workflow (`Solidity + Hardhat`)
- Blockchain lifecycle endpoints:
  - trade creation
  - delivery confirmation
  - escrow lock/release
  - recommendation proof anchoring
- Supports 2 execution modes:
  - `simulation` mode (no wallet/RPC required)
  - `live` mode (writes to EVM chain with `ethers`)
- Local JSON persistence for trades, proofs, settlements
- CORS enabled for React Native app integration

### Backend Setup
```bash
cd agrichain-backend
npm install
cp .env.example .env
npm run dev
```

For live chain writes, set in `.env`:
```env
BLOCKCHAIN_MODE=live
BLOCKCHAIN_RPC_URL=...
BLOCKCHAIN_PRIVATE_KEY=...
BLOCKCHAIN_CONTRACT_ADDRESS=...
```

### Backend Endpoints
- `GET /health`
- `GET /blockchain/stats`
- `GET /blockchain/trade/list`
- `GET /blockchain/trade/status`
- `POST /blockchain/trade/create`
- `POST /blockchain/trade/confirm-delivery`
- `POST /blockchain/settlement/lock`
- `POST /blockchain/settlement/release`
- `GET /blockchain/proof/list`
- `POST /blockchain/proof/create`

## Project Structure

```text
AgriChain/
  App.js
  src/
    data/
    screens/
      HomeScreen.js
      CropInputScreen.js
      RecommendationScreen.js
      SpoilageScreen.js
      MarketScreen.js
      AriaScreen.js
      ProfileScreen.js
    services/
      recommendationService.js
    theme/
      colors.js

agrichain-backend/
  contracts/
    AgriEscrow.sol
  scripts/
    deploy-contract.js
  src/
    blockchain/
      client.js
      escrowAbi.js
    routes/
      blockchainRoutes.js
      healthRoutes.js
    services/
      blockchainService.js
    store/
      dataStore.js
    app.js
    server.js
  hardhat.config.js
  package.json
```

## App Scripts
- `npm start` - start Expo dev server
- `npm run android` - run on Android
- `npm run ios` - run on iOS (macOS required)
- `npm run web` - run web preview
- `npm run backend:install` - install backend dependencies
- `npm run backend:dev` - run backend in watch mode
- `npm run backend:start` - run backend in normal mode
