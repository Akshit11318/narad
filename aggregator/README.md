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

## Building the Project

### Prerequisites

- CMake (version 3.15 or higher)
- C/C++ compiler (GCC, Clang, or MSVC)
- Node.js and npm (for the Node.js interface)

### Build Instructions

```bash
# Clone the repository
# Navigate to the project root directory
cd votingSys

# Create a build directory and navigate to it
mkdir -p build
cd build

# Configure the project with CMake
cmake ..

# Build the project
cmake --build .

# Alternatively, to build just the aggregator module
cmake --build . --target aggregator
```

### Running the Demo

```bash
# From the build directory
./bin/aggregator_demo
```

## Implementation Details

### Files

- `aggregator.h` - Header file defining the API and data structures for the aggregator module
- `aggregator.c` - Implementation of the aggregation functions and cryptographic operations
- `bigint_ops.h` - Header file for big integer operations used in cryptographic calculations
- `bigint_ops.c` - Implementation of big integer operations for cryptographic functions
- `main.c` - Demo application showing usage of the aggregator module
- `CMakeLists.txt` - CMake build configuration file
- `src/binding.cpp` - C++ bindings for Node.js integration
- `src/api.ts` - TypeScript API for interacting with the C++ bindings
- `src/index.ts` - Main entry point for the Node.js interface

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
    BigInt running_product; // Running product of ciphertexts
} AggregatorParams;
```

## Node.js Interface

The aggregator module includes a Node.js interface that allows it to be used from JavaScript/TypeScript applications.

### Setup

```bash
# Install Node.js dependencies
cd aggregator
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Usage

```bash
# Build TypeScript code
npm run build

# Run the aggregator
npm start

# Development mode
npm run dev
```

### Features

- Fetches encrypted vote ciphertexts via API
- Processes each ciphertext using the C functions
- Aggregates votes to produce a final tally
- Handles conversion between TypeScript and C data types

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

## License

This project is part of the VotingSys framework.
