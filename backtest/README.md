# Backend Test Server for Collector Module

This is a simple test server that simulates the backend API endpoints required for the collector module. It provides mock responses for election parameters and accepts the final auxiliary value.

## Prerequisites

- Node.js (v14 or later recommended)
- npm (Node Package Manager)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

The server will run on http://localhost:3000 by default.

## API Endpoints

### Get Election Parameters
- **URL**: `/api/election/params`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "N": "FFFFFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437",
    "N_squared": "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFD9C143FA33D77F9238BDFABFD21413EC0E79EFB508283B53C87EDC7F49C719537E3F53C612394A28EAEC36DB4F71398D8D4E6C8DBA39B722D5942F44A6EA49283F945580992952BC16CFA51F35659B76C800D43A34381A06D42C3FC2BA95C688EFD8882D2531E64593538CFAA8700F97B9843FE52D471E921A32C1B2C02D00C25955650D4CB57EB265342C3151A1E7CFE5EC48B559E168F9D50AC4BE0211DBFD26CC2D68AA2F1F8964ECBE80D53F38A0FE717E4621",
    "H": "0B54C42D86126E723D9BF283AE62F05E88451EA2BC6648373AD68A0F1A8A06C1"
  }
  ```

### Submit Final Auxiliary Value
- **URL**: `/api/auxiliary/final`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "final_aux": "1234567890ABCDEF1234567890ABCDEF"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Final auxiliary value received successfully",
    "timestamp": "2023-08-15T12:34:56.789Z"
  }
  ```

## Testing with Collector Module

1. Start this test server
2. Build and run the collector module
3. The collector module will fetch election parameters from this server
4. After processing auxiliary values, the collector will send the final auxiliary value to this server
5. Check the server logs to see the received data

## Implementation Details

### Cryptographic Parameters

The server uses the following cryptographic parameters:

- **N**: A 64-byte prime (used in the Paillier cryptosystem): 
  `FFFFFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F1437`

- **N²**: The square of N (calculated at runtime using JavaScript's BigInt)

- **H**: A 32-byte generator value in Z_N^2*: 
  `0B54C42D86126E723D9BF283AE62F05E88451EA2BC6648373AD68A0F1A8A06C1`

In a real system, these values would be generated through a secure key generation process.

### Logging

The server includes enhanced logging:
- All API requests are logged to the console
- For the final auxiliary value, the full value is printed for verification
- Response statuses are logged for debugging purposes

## Debugging

If the collector module fails to connect, ensure:
- The server is running on port 3000
- There are no firewall rules blocking connections
- The collector's HTTP client is correctly configured to connect to http://localhost:3000
