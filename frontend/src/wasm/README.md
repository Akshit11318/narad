# WASM Module for Voting System

This directory contains the WebAssembly (WASM) module for the Voting System project. The WASM module provides cryptographic operations that can be run directly in the browser.

## Prerequisites

- Emscripten SDK (emsdk) - version 2.0.0 or higher
- CMake - version 3.15 or higher

## Setting Up Emscripten

### Installing Emscripten SDK

```bash
# Clone the Emscripten SDK repository
git clone https://github.com/emscripten-core/emsdk.git

# Navigate to the emsdk directory
cd emsdk

# Download and install the latest SDK tools
./emsdk install latest

# Activate the latest SDK
./emsdk activate latest

# Set up the environment variables (needs to be done in each new terminal session)
source ./emsdk_env.sh  # On Linux/macOS
# OR
.\emsdk_env.bat  # On Windows
```

## Building the WASM Module

### Using CMake

```bash
# Navigate to the project root directory
cd votingSys

# Create a build directory specifically for WASM and navigate to it
mkdir -p build_wasm
cd build_wasm

# Configure the project with CMake using Emscripten toolchain
cmake .. -DCMAKE_TOOLCHAIN_FILE=/path/to/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake

# Build the WASM module
cmake --build . --target encryption
```

Replace `/path/to/emsdk` with the actual path to your Emscripten SDK installation.

### Using Make Directly

Alternatively, you can use the provided Makefile:

```bash
# Navigate to the WASM module directory
cd votingSys/frontend/src/wasm

# Build using make
make
```

## Troubleshooting Emscripten Issues

### Common Problems and Solutions

1. **Emscripten Not Found**
   - Ensure you've activated the Emscripten SDK in your current terminal session
   - Check that the `EMSDK` environment variable is set correctly
   - Try running `emcc --version` to verify Emscripten is in your PATH

2. **CMake Can't Find Emscripten Toolchain**
   - Provide the full path to the Emscripten toolchain file:
     ```
     -DCMAKE_TOOLCHAIN_FILE=/absolute/path/to/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake
     ```

3. **Build Errors**
   - Make sure you're using a compatible version of Emscripten
   - Check that all dependencies are properly installed
   - Look for specific error messages in the build output

4. **Custom Emscripten Location**
   - You can specify a custom Emscripten root path:
     ```
     cmake .. -DEMSCRIPTEN_ROOT_PATH=/path/to/custom/emsdk -DCMAKE_TOOLCHAIN_FILE=...
     ```

## Testing the WASM Module

After building, you can verify the WASM module works correctly:

```bash
# Navigate to the frontend directory
cd votingSys/frontend

# Install dependencies if needed
npm install

# Start the development server
npm run dev
```

The WASM module should be loaded by the frontend application. Check the browser console for any errors related to the WASM module loading.

## Manual Verification

You can manually verify the Emscripten environment with:

```bash
# Check emcc version
emcc --version

# Compile a simple test program
echo 'int main() { return 0; }' > test.c
emcc test.c -o test.js
```

If these commands succeed, your Emscripten environment is working correctly.