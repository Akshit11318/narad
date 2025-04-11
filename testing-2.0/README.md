# Voting System Integration Testing Environment 2.0

This project provides an enhanced testing environment for the secure aggregation protocol in the voting system. It simulates the interaction between the frontend (users), collector, and aggregator components through a common backend API, with each component running in separate terminals.

## Overview

The secure aggregation protocol is implemented according to the following steps:

1. **Setup**: The Trusted Party (TP) selects two safe primes p,q and sets N = p*q. It also defines a hash function H and publishes the parameters P = (N, H).
2. **Encrypt**: Each user U_i with data x_i computes a ciphertext c_i = (1 + x_i*N)*(H()^sk_i) mod N^2 and sends it to the aggregator.
3. **Collect**: The collector computes auxiliary values and sends the product aux to the aggregator.
4. **Aggregate**: The aggregator uses the ciphertexts and aux to compute the sum of votes.

## Components

- **Backend API**: Express.js server with endpoints for all components
- **Database**: PostgreSQL with Prisma ORM
- **Collector**: Runs in a separate terminal, communicates with backend
- **Aggregator**: Runs in a separate terminal, communicates with backend
- **Frontend**: Sends votes in real-time to the backend

## Setup

1. Install dependencies for all components:

```bash
# In the testing-2.0 directory (backend)
npm install

# In the collector directory
cd ../collector
npm install

# In the aggregator directory
cd ../aggregator
npm install

# In the frontend directory
cd ../frontend
npm install
```

2. Set up the database:

```bash
# In the testing-2.0 directory
npx prisma migrate dev
```

3. Configure environment variables:
   
   The `.env` file in the testing-2.0 directory should have:
   
   ```
   # Server configuration
   PORT=3000
   NODE_ENV=development

   # PostgreSQL Database configuration
   DATABASE_URL="postgresql://admmin:akshit11@localhost:5432/votingsys"

   # Logging configuration
   LOG_LEVEL=info
   LOG_FORMAT=combined

   # Predefined cryptographic parameters in hexadecimal
   ELECTION_PARAM_N="a94337c30ddffe19568c42e4865e088c756e023111e305c8e7454e6ef12fd85e99c68e306cd6a6945e78915d1aba494ae575fa174a82abd4c2c7c66dd2982a6a"
   ELECTION_PARAM_H="d5fe5496895615b93b7bd501f94c390bdb942bf41ab18d1917dfd3aefc1e1952f23f4504700b5eeec7186bc6dec990db64b9ea1eadce566e21b6f8429565cc0"
   ```

## Running the System

### Terminal 1: Start the Backend Server

```bash
# In the testing-2.0 directory
npm run dev
```

### Terminal 2: Run the Collector

```bash
# In the collector directory
# Replace <election_id> with the actual election ID
node dist/service.js <election_id>
```

### Terminal 3: Run the Aggregator

```bash
# In the aggregator directory
# Replace <election_id> with the actual election ID
node dist/service.js <election_id>
```

### Terminal 4: Create an Election and Submit Votes

```bash
# In the testing-2.0 directory
npx ts-node src/scripts/createElection.ts
# Note the election ID from the output

# Submit test votes
npx ts-node src/scripts/testUser.ts <election_id>
```

## Testing Workflow

1. Start the backend server (Terminal 1)
2. Create a new election and note the election ID
3. Submit votes using the test script
4. Update the election status to TALLYING:
   ```bash
   curl -X PATCH http://localhost:3000/api/election/<election_id>/status -H "Content-Type: application/json" -d '{"status":"TALLYING"}'
   ```
5. Run the collector (Terminal 2) with the election ID
6. Run the aggregator (Terminal 3) with the election ID
7. Check the results:
   ```bash
   curl http://localhost:3000/api/user/result/<election_id>
   ```

## Verification

The system includes verification for:
- Database connection
- Environment variables
- API routes
- Data flow between components

All cryptographic parameters (N and H) are now stored in the database instead of environment variables, making the system more robust and easier to manage.

## Testing Workflow

1. Start the backend server (Terminal 1)
2. Create a new election and note the election ID
3. Submit votes using the test script
4. Update the election status to TALLYING:
   ```bash
   curl -X PATCH http://localhost:3000/api/election/<election_id>/status -H "Content-Type: application/json" -d '{"status":"TALLYING"}'
   ```
5. Run the collector (Terminal 2) with the election ID
6. Run the aggregator (Terminal 3) with the election ID
7. Check the results:
   ```bash
   curl http://localhost:3000/api/user/result/<election_id>
   ```

## Communication Flow

1. **Frontend → Backend**: Submits encrypted votes (ci, ski, auxi)
2. **Collector → Backend**: Fetches auxiliary values, computes product, submits aux
3. **Aggregator → Backend**: Fetches ciphertexts and aux, computes result, submits final tally
4. **Backend → Frontend**: Provides election results

## API Endpoints

### Election Management

- `POST /api/election` - Create a new election
- `GET /api/election/:id` - Get election details
- `GET /api/election/:id/params` - Get election parameters
- `PATCH /api/election/:id/status` - Update election status

### User Endpoints

- `GET /api/user/params/:electionId` - Get election parameters
- `POST /api/user/vote/:electionId` - Submit a vote
- `GET /api/user/result/:electionId` - Get election result

### Collector Endpoints

- `GET /api/collector/params/:electionId` - Get election parameters
- `GET /api/collector/auxiliary/:electionId` - Get auxiliary values
- `POST /api/collector/auxiliary/:electionId` - Submit auxiliary product

### Aggregator Endpoints

- `GET /api/aggregator/data/:electionId` - Get election data for aggregation
- `POST /api/aggregator/result/:electionId` - Submit aggregation result

## Database Schema

- **ElectionParams**: Stores N and H parameters
- **Election**: Stores election metadata
- **VoterData**: Stores voter data (ski, ci, auxi)
- **AggregatedResult**: Stores aggregated results

## Integration with Actual Modules

### Symlink Setup:
```bash
cd testing-2.0
mklink /J aggregator ..\aggregator
mklink /J collector ..\collector
```

### WASM Integration:
1. Build WASM modules from frontend/src/wasm:
```bash
cd frontend/src/wasm && make
```
2. Copy built artifacts to testing-2.0/src/scripts

### Testing Workflow:
1. Start backend server:
```bash
yarn backend:dev
```
2. Run integration tests:
```bash
yarn test --config ./tests/config.js
```

### Environment Variables:
```env
AGGREGATOR_MODULE_PATH=./aggregator/src
COLLECTOR_MODULE_PATH=./collector/src
WASM_MODULE_PATH=./src/scripts/wasm
```

### API Endpoints:
- Collector: POST /api/collector/process
- Aggregator: POST /api/aggregator/aggregate
- WASM Operations: POST /api/user/verify

## References

The secure aggregation protocol is based on the following algorithm:

```
Setup:
  TP selects two safe primes p,q, sets N = p*q,
  H: {0,1}* -> Z_{N^2}*,  P = (N, H)  (published),
  sk_A <-$ Z_{N^2}*,  sk_i <-$ [0, N^2]  ∀ i=1,...,n.

Encrypt:
  Each user U_i with data x_i computes
  c_i = (1 + x_i*N)*(H()^{sk_i}) mod N^2,
  and sends c_i to the aggregator.

Collect:
  pk_A = H()^{sk_A},
  aux_i = pk_A^{sk_i} = (H()^{sk_A})^{sk_i} = H()^{sk_A*sk_i},
  aux = ∏_{i=1}^n aux_i = H()^{sk_A*∑_{i=1}^n sk_i}.
  Collector sends aux to the aggregator.

Aggregate:
  1. Multiply ciphertexts:
     ∏_{i=1}^n c_i = ∏_{i=1}^n [(1 + x_i*N)*H()^{sk_i}]
                   = (1 + (∑_{i=1}^n x_i)N)*H()^{∑_{i=1}^n sk_i}
  2. Raise to sk_A:
     P = (∏_{i=1}^n c_i)^{sk_A}
       = [(1 + (∑_i x_i)N)*H()^{∑_i sk_i}]^{sk_A}
       = (1 + (∑_i x_i)N)^{sk_A}*H()^{sk_A*∑_i sk_i}
  3. Divide out the mask:
     P' = P * aux^{-1} = (1 + (∑_i x_i)N)^{sk_A}
  4. Reduce exponent mod N:
     P' = (1 + (∑_i x_i)N)^{sk_A} = 1 + sk'_A*(∑_i x_i)*N (mod N^2)
  5. Recover the sum:
     (P' - 1)/N = sk'_A*∑_i x_i
     R = (sk'_A)^{-1}*(P' - 1)/N = ∑_{i=1}^n x_i (mod N)
```
