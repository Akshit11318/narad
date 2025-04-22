# Collector Module

## Overview

The Collector module is a critical component of the secure voting system that implements the secure aggregation protocol. It handles the collection and aggregation of auxiliary values from users, performing cryptographic operations to compute the final auxiliary value that will be sent to the aggregator.

## Features

- Collection of auxiliary values from individual voters
- Secure aggregation using modular multiplication
- Real-time processing of auxiliary values
- Computation of the final auxiliary value for the voting system

## Mathematical Background

The collector module is part of a secure voting protocol that uses homomorphic encryption. It specifically handles the collection phase where auxiliary values from users are combined to create a final auxiliary value that will be used by the aggregator to decrypt the sum of votes without revealing individual votes.

Key operations include:

1. **Modular Multiplication**: Computes (a * b) mod modulus for combining auxiliary values
2. **Secure Aggregation**: Combines multiple auxiliary values while preserving privacy

## Building the Project

### Prerequisites

- CMake (version 3.15 or higher)
- C/C++ compiler (GCC, Clang, or MSVC)
- Node.js and npm (for the Node.js interface)
- libcurl development package (for HTTP requests)

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

# Alternatively, to build just the collector module
cmake --build . --target collector
```

### Running the Demo

```bash
# From the build directory
./bin/collector_demo
```

## Implementation Details

### Files

- `collector.h` - Header file defining the API and data structures for the collector module
- `collector.c` - Implementation of the collector functions and state management
- `bigint_ops.h` - Header file for big integer operations used in cryptographic calculations
- `bigint_ops.c` - Implementation of big integer operations for cryptographic functions
- `main.c` - Demo application showing usage of the collector module
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
} ElectionParams;
```

## Node.js Interface

The collector module includes a Node.js interface that allows it to be used from JavaScript/TypeScript applications.

### Setup

```bash
# Install Node.js dependencies
cd collector
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Usage

```bash
# Build TypeScript code
npm run build

# Run the collector
npm start

# Development mode
npm run dev
```

### Features

- Fetches election parameters from the backend server
- Collects and processes auxiliary values from voters
- Computes the final auxiliary value
- Submits the final auxiliary value to the aggregator

## Security Considerations

- All cryptographic operations are implemented with careful memory management
- Sensitive data is securely wiped from memory when no longer needed
- The module is designed to potentially run within a secure enclave
- No sensitive information is logged or exposed

## Error Handling

The module implements comprehensive error checking:
- All functions return 0 on success and non-zero on failure
- Memory allocation failures are properly handled
- Invalid parameters are detected and reported
- Communication errors are properly propagated

## License

This project is part of the VotingSys framework.