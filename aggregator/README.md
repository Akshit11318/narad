emcc

# Secure Vote Aggregator Module

## Overview

The Secure Vote Aggregator is a cryptographic module designed to securely aggregate encrypted votes without revealing individual vote values. It implements a homomorphic encryption scheme that allows for the computation of sums and averages over encrypted data.

## Features

- Secure aggregation of encrypted votes
- Homomorphic operations on ciphertexts
- Protection of individual vote privacy
- Computation of sum and average of votes

## Mathematical Background

The aggregator uses a variant of the Paillier cryptosystem, which provides additive homomorphic properties. This means that the multiplication of encrypted votes results in an encryption of the sum of the votes.

Key components of the mathematical protocol:

1. **Modular Exponentiation**: Computes base^exponent mod modulus efficiently
2. **Modular Multiplication**: Computes (a \* b) mod modulus
3. **Modular Inverse**: Finds the multiplicative inverse of a number in a modular field

## Usage

### Building the Project

```bash
# Clone the repository
# Navigate to the aggregator directory
cd aggregator

# Build the project
make

# Run the demo
./build/aggregator_demo

# Clean build files
make clean
```

### Integration with Other Components

The aggregator module is designed to work with the collector module, which provides the auxiliary value needed for secure aggregation.

### API Overview

```c
// Initialize the aggregator with parameters
int aggregator_init(AggregatorParams* params, const BigInt* N, const BigInt* H, const BigInt* sk_A);

// Aggregate votes in a single operation
int aggregate_votes(const BigInt* ciphertexts, size_t count, const BigInt* aux,
                    const AggregatorParams* params, BigInt* sum, BigInt* average);

// Clean up resources
int aggregator_cleanup(AggregatorParams* params);
```

## Implementation Details

### Files

- `aggregator.h` - Header file defining the API
- `aggregator.c` - Implementation of the aggregation functions
- `bigint_ops.h` - Header file for big integer operations
- `bigint_ops.c` - Implementation of cryptographic operations
- `main.c` - Demo application showing usage

### Data Structures

```c
// Structure to hold large integers for cryptographic operations
typedef struct {
    uint8_t* data;  // Pointer to the big integer data
    size_t length;  // Length of the data in bytes
} BigInt;

// Structure to hold election parameters
typedef struct {
    BigInt N;        // The modulus N = p*q
    BigInt N_squared; // N^2
    BigInt H;        // The hash function output in Z_N^2*
    BigInt sk_A;     // Aggregator's secret key
    BigInt sk_A_mod_N; // sk_A mod N
    BigInt sk_A_inv;  // Inverse of sk_A mod N
} AggregatorParams;
```

## Security Considerations

- The implementation uses secure memory handling practices
- The module includes protection against timing attacks
- In a production environment, a cryptographically secure random number generator should be used
- The current implementation is for demonstration purposes and may need additional hardening for production use

## Future Improvements

- Integration with a proper big integer library like GMP for better performance and security
- Implementation of more sophisticated modular reduction algorithms
- Support for multi-threading to improve performance with large datasets
- Enhanced error handling and reporting

## Node.js Interface

A TypeScript/Node.js interface has been added to allow calling the C functions through FFI (Foreign Function Interface). This interface enables the aggregator to work independently from the browser-based frontend.

### Setup

```bash
# Install Node.js dependencies
npm install
# or
yarn install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Usage

```bash
# Build TypeScript code
npm run build
# or
yarn build

# Run the aggregator
npm start
# or
yarn start

# Development mode
npm run dev
# or
yarn dev
```

### Features

- Fetches encrypted vote ciphertexts via API
- Processes each ciphertext using the C functions
- Aggregates votes to produce a final tally
- Handles conversion between TypeScript and C data types

## License

This project is part of the VotingSys framework.
