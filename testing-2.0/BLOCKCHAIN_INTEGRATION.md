# Blockchain Integration for Testing Environment

This document describes the Solana blockchain integration implemented in the testing-2.0 environment using Anchor framework.

## Overview

The testing environment now includes full blockchain integration with the following capabilities:

- Create elections on Solana blockchain
- Manage election stages (Application, Voting, Closed)
- Add/remove candidates from whitelist
- Submit votes with encrypted data
- Track voter status
- Manage cryptographic parameters (SKA, AUXT, Collector PKC)

## Architecture

### Components

1. **BlockchainService** (`src/services/blockchainService.ts`)

   - Handles all Solana/Anchor interactions
   - Manages wallet and connection setup
   - Provides methods for all blockchain operations

2. **BlockchainRoutes** (`src/routes/blockchainRoutes.ts`)

   - REST API endpoints for blockchain operations
   - Input validation and error handling
   - Consistent response format

3. **Smart Contract** (`programs/voting-sys/src/lib.rs`)
   - Anchor program defining election logic
   - Account structures for election and voter data
   - Instruction implementations

## API Endpoints

### Election Management

#### Create Election

```http
POST /api/blockchain/create-election
Content-Type: application/json

{
  "totalVotes": 100,
  "totalCandidates": 4
}
```

#### Get All Elections

```http
GET /api/blockchain/elections
```

#### Get Specific Election

```http
GET /api/blockchain/elections/{electionId}
```

#### Change Election Stage

```http
POST /api/blockchain/elections/{electionId}/change-stage
Content-Type: application/json

{
  "stage": "voting" // "application", "voting", "closed"
}
```

### Candidate Management

#### Add Candidate

```http
POST /api/blockchain/elections/{electionId}/candidates
Content-Type: application/json

{
  "candidateName": "Alice"
}
```

#### Remove Candidate

```http
DELETE /api/blockchain/elections/{electionId}/candidates/{candidateName}
```

### Cryptographic Parameters

#### Add SKA

```http
POST /api/blockchain/elections/{electionId}/ska
Content-Type: application/json

{
  "ska": "your-ska-value"
}
```

#### Add AUXT

```http
POST /api/blockchain/elections/{electionId}/auxt
Content-Type: application/json

{
  "auxt": "your-auxt-value"
}
```

#### Add Collector PKC

```http
POST /api/blockchain/elections/{electionId}/collector-pkc
Content-Type: application/json

{
  "collectorPkc": "your-collector-pkc"
}
```

#### Sync Collector PKC

```http
POST /api/blockchain/elections/{electionId}/sync-collector-pkc
Content-Type: application/json

{
  "collectorPkc": "updated-collector-pkc"
}
```

### Voting

#### Submit Vote

```http
POST /api/blockchain/elections/{electionId}/vote
Content-Type: application/json

{
  "voterId": "voter123",
  "voterCi": "encrypted-vote-data"
}
```

#### Get Voter Status

```http
GET /api/blockchain/elections/{electionId}/voter-status/{voterId}
```

## Setup Requirements

### Prerequisites

1. **Solana CLI** installed and configured
2. **Anchor CLI** installed
3. **Node.js** and npm/yarn
4. **Solana wallet** with SOL for transactions

### Environment Variables

Add these to your `.env` file:

```env
SOLANA_RPC_URL=http://localhost:8899
# or for devnet: https://api.devnet.solana.com
# or for mainnet: https://api.mainnet-beta.solana.com
```

### Wallet Setup

The system will automatically try to load the wallet from:

- `~/.config/solana/id.json` (default Solana CLI wallet)

If not found, it will generate a new keypair for testing.

## Testing

### Run the Test Suite

```bash
# Install dependencies
npm install

# Start the server
npm run dev

# In another terminal, run the blockchain test
node test-blockchain.js
```

### Manual Testing

You can test individual endpoints using curl or any HTTP client:

```bash
# Create an election
curl -X POST http://localhost:3000/api/blockchain/create-election \
  -H "Content-Type: application/json" \
  -d '{"totalVotes": 100, "totalCandidates": 4}'

# Get all elections
curl http://localhost:3000/api/blockchain/elections
```

## Smart Contract Integration

The blockchain integration uses the Anchor program defined in `programs/voting-sys/src/lib.rs` with the following key features:

### Election Data Structure

- Stage management (Application, Voting, Closed)
- Candidate whitelist
- Cryptographic parameters (N, H, SKA, AUXT, Collector PKC)
- Vote tracking

### Key Instructions

- `createElection`: Initialize new election
- `changeStage`: Update election stage
- `addToCandidateWhitelist`/`removeFromCandidateWhitelist`: Manage candidates
- `vote`: Submit encrypted vote
- `addska`/`addauxt`/`addcollectorpkc`: Set cryptographic parameters

## Error Handling

The API provides consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common error scenarios:

- Missing required fields
- Invalid election stage
- Blockchain transaction failures
- Network connectivity issues

## Security Considerations

1. **Wallet Management**: Ensure proper wallet security
2. **Network Selection**: Use appropriate Solana network (local/devnet/mainnet)
3. **Transaction Signing**: All transactions require proper signing
4. **Input Validation**: All inputs are validated before blockchain submission

## Troubleshooting

### Common Issues

1. **Connection Errors**

   - Verify Solana RPC URL is correct
   - Check network connectivity
   - Ensure Solana cluster is running

2. **Wallet Errors**

   - Verify wallet file exists and is readable
   - Check wallet has sufficient SOL for transactions
   - Ensure wallet is properly configured

3. **Transaction Failures**
   - Check transaction logs for specific errors
   - Verify account permissions and constraints
   - Ensure all required accounts are provided

### Debug Mode

Enable detailed logging by setting:

```env
NODE_ENV=development
```

This will provide more detailed error messages and transaction information.

## Integration with Existing Systems

The blockchain integration works alongside the existing testing environment:

- **Database**: Prisma database for local state management
- **ZK Proofs**: Zero-knowledge proof generation and verification
- **Collector/Aggregator**: Secure aggregation protocol components
- **User Management**: Authentication and authorization

The blockchain provides the immutable, decentralized layer while the database handles local state and caching.
