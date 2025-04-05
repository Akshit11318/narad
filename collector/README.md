# Collector Module

This module implements the secure aggregation protocol for the voting system. It handles the collection and aggregation of auxiliary values from users, performing cryptographic operations to compute the final auxiliary value that will be sent to the aggregator.

## Overview

The collector module is responsible for:
- Collecting auxiliary values from individual voters in real-time
- Securely aggregating these values using modular multiplication
- Computing the final auxiliary value for the voting system
- Interfacing with the backend server to fetch election parameters and push results

## Key Components

- **Auxiliary Value Processing**: Computes the final auxiliary value from individual user contributions
- **Cryptographic Operations**: Implements modular exponentiation and multiplication for secure aggregation
- **HTTP Client**: Handles communication with the backend server for parameter fetching and result submission using libcurl

## Building and Running

### Prerequisites

- C compiler (GCC recommended)
- Make build system
- Standard C libraries
- libcurl development package (for HTTP requests)

### Compilation

1. Navigate to the collector directory:
   ```bash
   cd collector
   ```

2. Build the module using Make:
   ```bash
   make
   ```

   This will compile all source files, create the executable in the `build` directory, and automatically remove the intermediate `.o` files.

### Running the Demo

After successful compilation, run the demo program from the build directory:
```bash
./build/collector_demo
```

Alternatively, you can run it directly from the collector directory:
```bash
./build/collector_demo
```

The demo simulates:
- Fetching election parameters from the backend server via HTTP
- Collecting and processing auxiliary values from voters
- Computing the final auxiliary value
- Submitting the final auxiliary value to the server

### API Endpoints

The collector communicates with the backend server through the following endpoints:

- `GET /api/election/params` - Fetch election parameters
- `GET /api/auxiliary/values` - Fetch auxiliary values from voters
- `POST /api/auxiliary/final` - Submit final auxiliary value

The server is expected to run on `http://localhost:3000` by default.
- Processing auxiliary values from multiple users
- Computing and displaying the running product
- Pushing the final auxiliary value to the blockchain

## Security Considerations

- All cryptographic operations are implemented with careful memory management
- Sensitive data is securely wiped from memory when no longer needed
- The module is designed to potentially run within a secure enclave
- No sensitive information is logged or exposed

## Files

- `collector.h/c`: Core collector functionality and state management
- `bigint_ops.h/c`: Big integer operations for cryptographic calculations
- `json_utils.h/c`: Functions for parsing JSON data and converting between hex strings and BigInt
- `http_client.h/c`: Interface with the backend server
- `main.c`: Demo program showing usage of the collector module

## Error Handling

The module implements comprehensive error checking:
- All functions return 0 on success and non-zero on failure
- Memory allocation failures are properly handled
- Invalid parameters are detected and reported
- Blockchain communication errors are properly propagated