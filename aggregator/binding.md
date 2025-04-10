# Node.js Native Binding Documentation

## Overview

The `binding.cpp` file creates a bridge between JavaScript/TypeScript and C++ code for the Secure Vote Aggregator module. This document explains how the code works in detail, especially for developers who are new to C++ and Node.js native bindings.

### What is Node-API (N-API)?

Node-API is a C API that ensures your native code will continue to work without recompilation across different versions of Node.js. Think of it as a translator that helps JavaScript and C++ code talk to each other.

## Core Concepts

### 1. Memory Management Basics

In C++, unlike JavaScript, you need to manage memory manually. However, our wrapper classes make this easier:

```cpp
// Bad way (manual memory management)
BigInt* number = new BigInt();
// ... use number ...
delete number;  // Easy to forget!

// Good way (automatic cleanup using RAII)
BigIntWrapper number;  // Automatically cleaned up when it goes out of scope
```

### 2. Data Flow Between JavaScript and C++

```plaintext
JavaScript → Node-API → C++ Wrapper Classes → Native C++ Code
     ↑                                              |
     |______________________________________________|
           Results flow back up through the chain
```

## Key Components Explained

### BigIntWrapper Class

This class safely manages large numbers between JavaScript and C++.

```cpp
class BigIntWrapper {
private:
    BigInt* data;  // Pointer to the actual big integer data

public:
    // Creates an empty BigInt
    BigIntWrapper() : data(new BigInt()) {}

    // Creates a BigInt from raw bytes
    BigIntWrapper(const uint8_t* bytes, size_t length) {
        data = new BigInt();
        // Convert bytes to internal representation
        convertBytesToBigInt(bytes, length, data);
    }

    // Cleanup when object is destroyed
    ~BigIntWrapper() {
        if (data) {
            delete data;
            data = nullptr;
        }
    }

    // Convert to JavaScript value
    Napi::Value ToValue(Napi::Env env) const {
        // Convert internal BigInt to Buffer that JavaScript can understand
        return Napi::Buffer<uint8_t>::Copy(env,
            reinterpret_cast<uint8_t*>(data->bytes),
            data->length);
    }

    // Create from JavaScript value
    static BigIntWrapper FromValue(const Napi::Value& value) {
        // Safety check
        if (!value.IsBuffer()) {
            throw Napi::Error::New(value.Env(),
                "Expected a Buffer");
        }

        // Get raw bytes from JavaScript Buffer
        auto buffer = value.As<Napi::Buffer<uint8_t>>();
        return BigIntWrapper(buffer.Data(), buffer.Length());
    }
};
```

### AggregatorParamsWrapper Class

Manages the cryptographic parameters needed for vote aggregation.

```cpp
class AggregatorParamsWrapper {
private:
    AggregatorParams* params;  // Native parameters
    bool initialized;          // Track if properly set up

public:
    AggregatorParamsWrapper() :
        params(new AggregatorParams()),
        initialized(false) {}

    // Set up the parameters
    bool Initialize(const BigIntWrapper& N,
                   const BigIntWrapper& H,
                   const BigIntWrapper& skA) {
        if (initialized) return false;  // Prevent double init

        // Copy parameters from wrappers to native structure
        params->N = *(N.GetNativeHandle());
        params->H = *(H.GetNativeHandle());
        params->skA = *(skA.GetNativeHandle());

        initialized = true;
        return true;
    }

    // Convert to JavaScript object
    Napi::Value ToValue(Napi::Env env) const {
        auto result = Napi::Object::New(env);

        // Convert each parameter to Buffer
        result.Set("N",
            Napi::Buffer<uint8_t>::Copy(env,
                params->N.bytes,
                params->N.length));
        // ... similar for H and skA ...

        return result;
    }
};
```

## JavaScript Interface

### How to Use from JavaScript/TypeScript

```typescript
// Import the native binding
import { initializeAggregator, aggregateVotes } from "./binding";

// Example: Initialize the aggregator
const params = initializeAggregator(
  Buffer.from("N_value_hex", "hex"), // Modulus
  Buffer.from("H_value_hex", "hex"), // Hash
  Buffer.from("skA_value_hex", "hex") // Secret key
);

// Example: Aggregate encrypted votes
const votes = [
  Buffer.from("vote1_hex", "hex"),
  Buffer.from("vote2_hex", "hex"),
];

const result = aggregateVotes(votes, auxValue, params);
console.log("Sum:", result.sum.toString("hex"));
console.log("Average:", result.average.toString("hex"));
```

## Common Pitfalls and Solutions

### 1. Memory Leaks

```cpp
// WRONG: Memory leak
void ProcessData(const Napi::CallbackInfo& info) {
    auto* data = new BigInt();  // Never deleted!
}

// RIGHT: Use wrapper class
void ProcessData(const Napi::CallbackInfo& info) {
    BigIntWrapper data;  // Automatically cleaned up
}
```

### 2. Buffer Safety

```cpp
// WRONG: Unsafe buffer access
void ProcessBuffer(const Napi::Value& value) {
    auto buffer = value.As<Napi::Buffer<uint8_t>>();  // Might crash!
}

// RIGHT: Safe buffer access
void ProcessBuffer(const Napi::Value& value) {
    if (!value.IsBuffer()) {
        throw Napi::Error::New(value.Env(), "Expected a Buffer");
    }
    auto buffer = value.As<Napi::Buffer<uint8_t>>();
}
```

## Build and Test

1. **Build Requirements**

   - Node.js (v14 or later)
   - node-gyp (`npm install -g node-gyp`)
   - C++11 compiler (gcc/clang/MSVC)

2. **Build Commands**

   ```bash
   # Install dependencies
   npm install

   # Build native module
   npm run build
   ```

3. **Testing**
   ```bash
   # Run tests
   npm test
   ```

## Debugging Tips

1. Use `console.log()` in JavaScript and `printf()` in C++ for basic debugging
2. For memory issues:
   - Run with Node.js `--inspect` flag
   - Use Valgrind for native code memory leaks
3. Common errors:
   - "Invalid argument": Check buffer types and sizes
   - Segmentation fault: Usually means accessing invalid memory

## Performance Optimization

1. **Minimize Copying**

   ```cpp
   // GOOD: Use references to avoid copies
   void ProcessWrapper(const BigIntWrapper& wrapper);

   // BAD: Creates unnecessary copy
   void ProcessWrapper(BigIntWrapper wrapper);
   ```

2. **Buffer Views**

   ```cpp
   // GOOD: Use buffer views when possible
   auto view = buffer.Data();
   // Process view directly...

   // BAD: Creating new buffer
   auto copy = new uint8_t[buffer.Length()];
   memcpy(copy, buffer.Data(), buffer.Length());
   ```

This documentation should help you understand how the native binding works and how to use it effectively in your code.
