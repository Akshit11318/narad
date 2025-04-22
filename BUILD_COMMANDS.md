# Build Commands for Voting System

This document provides essential commands for building the Voting System project.

## Quick Build (All Components)

Use our build scripts to compile all components including WASM in one step:

```bash
# On Linux/macOS/WSL
./build_all.sh

# On Windows
.\build_all.bat
```

## Manual Build Process

### Prerequisites

1. **Install dependencies:**
   ```bash
   # Install libcurl development package (for collector)
   sudo apt-get update && sudo apt-get install -y libcurl4-openssl-dev
   
   # Activate Emscripten (for WASM)
   source /path/to/emsdk/emsdk_env.sh
   ```

2. **Prepare libtommath:**
   ```bash
   # Clone libtommath repository
   git clone https://github.com/libtom/libtommath.git deps/libtommath
   
   # Build with PIC support
   cd deps/libtommath
   CFLAGS="-fPIC" make
   cd ../..
   ```

### Building Non-WASM Components

```bash
# Create and navigate to build directory
mkdir -p build
cd build

# Configure with PIC enabled
cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON

# Build all targets
cmake --build .

# Or build specific targets
cmake --build . --target aggregator
cmake --build . --target collector
cmake --build . --target bigint_lib
```

### Building WASM Component

```bash
# Make sure Emscripten is activated
source /path/to/emsdk/emsdk_env.sh

# Use the same build directory
cd build

# Configure with Emscripten toolchain
cmake .. -DCMAKE_TOOLCHAIN_FILE=/home/akshit/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake -DEMSCRIPTEN=1

# For WSL with custom emsdk location, use:
# cmake .. -DCMAKE_TOOLCHAIN_FILE=/path/to/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake -DEMSCRIPTEN=1

# Build the WASM module
cmake --build . --target encryption
```

## Troubleshooting

### Common Issues

1. **CURL not found:**
   ```bash
   sudo apt-get update && sudo apt-get install -y libcurl4-openssl-dev
   ```

2. **PIC-related linking errors:**
   ```bash
   # Clean build and reconfigure with PIC
   rm -rf build
   mkdir build && cd build
   cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON
   ```

3. **Emscripten toolchain not found:**
   ```bash
   # Activate Emscripten environment
   source /path/to/emsdk/emsdk_env.sh
   
   # Find toolchain file path
   find /path/to/emsdk -name "Emscripten.cmake"
   ```

## File Locations

### Build Outputs

- **Aggregator:** `build/aggregator/build/Release/aggregator.node`
- **Collector:** `build/collector/build/Release/collector.node`
- **WASM JS:** `build/frontend/src/wasm/encryption.js`
- **WASM Binary:** `build/frontend/src/wasm/encryption.wasm`
- **WASM Deployment:** `frontend/public/assets/encryption.js` and `frontend/public/assets/encryption.wasm`
