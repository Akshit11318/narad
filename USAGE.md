# Building Individual Modules with CMake

This document provides instructions on how to build individual modules of the Voting System project using CMake.

## Prerequisites

- CMake (version 3.15 or higher)
- C/C++ compiler (supporting C11 and C++17 standards)
- Node.js and npm (for Aggregator and Collector modules)
- Emscripten SDK (for WASM module)
- libcurl development files (for Collector module)

## Project Structure

The project consists of the following main modules:

- **Aggregator**: Secure vote aggregation module
- **Collector**: Vote collection module
- **Frontend/WASM**: WebAssembly module for browser-based cryptographic operations
- **Common/bigint_lib**: Shared big integer library used by all modules

## Building the Entire Project

```bash
# Navigate to the project root directory
cd votingSys

# Create a build directory and navigate to it
mkdir -p build
cd build

# Configure the project with CMake
cmake ..

# Build the project
cmake --build .
```

## Building Individual Modules

### Building the Aggregator Module

```bash
# Navigate to the project root directory
cd votingSys

# Create a build directory and navigate to it
mkdir -p build
cd build

# Configure the project with CMake
cmake ..


# if u get any error of PIC
cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON
# Build only the aggregator module
cmake --build . --target aggregator
```

The compiled Node.js addon will be located at `build/aggregator/build/Release/aggregator.node`.

### Building the Collector Module

```bash
# Navigate to the project root directory
cd votingSys

# Create a build directory and navigate to it
mkdir -p build
cd build

# Configure the project with CMake
cmake ..

# Build only the collector module
cmake --build . --target collector
```

The compiled Node.js addon will be located at `build/collector/build/Release/collector.node`.

### Building the WASM Module

The WASM module requires the Emscripten SDK to be installed and activated in your environment.

```bash
# First, ensure Emscripten SDK is activated in your environment
# For example: source /path/to/emsdk/emsdk_env.sh

# Navigate to the project root directory
cd votingSys

# Create a build directory specifically for WASM and navigate to it
mkdir -p build_wasm
cd build_wasm

# Configure the project with CMake using Emscripten toolchain
cmake .. -DCMAKE_TOOLCHAIN_FILE=/home/akshit/emsdk/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake

# Build only the WASM module
cmake --build . --target encryption
```

#### Verifying Emscripten Configuration

The project includes tools to verify your Emscripten configuration:

```bash
# Navigate to the project root directory
cd votingSys

# Run the Emscripten test script
cmake -P cmake/modules/test_emscripten.cmake
```

You can also specify a custom Emscripten SDK path if it's not in the default location:

```bash
cmake .. -DEMSCRIPTEN_ROOT_PATH=/path/to/custom/emsdk -DCMAKE_TOOLCHAIN_FILE=/path/to/custom/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake
```

The compiled WASM files will be located at `build_wasm/bin/encryption.js` and `build_wasm/bin/encryption.wasm`.

## Building the Common bigint_lib

The `bigint_lib` is a dependency for all modules and is automatically built when building any of the above modules. However, you can build it separately if needed:

```bash
# Navigate to the project root directory
cd votingSys

# Create a build directory and navigate to it
mkdir -p build
cd build

# Configure the project with CMake
cmake ..

# Build only the bigint_lib
cmake --build . --target bigint_lib
```

## Troubleshooting

### Common Issues

1. **Missing Node.js headers**: Ensure Node.js development files are installed and findable by CMake.

2. **Missing libcurl**: Install libcurl development files:
   - On Ubuntu/Debian: `sudo apt-get install libcurl4-openssl-dev`
   - On Windows: Consider using vcpkg or pre-built binaries

3. **Emscripten not detected**: Ensure you've properly activated the Emscripten environment before running CMake for WASM builds.
   - Verify activation with: `emcc --version`
   - Check if EMSDK environment variable is set: `echo $EMSDK` (Linux/macOS) or `echo %EMSDK%` (Windows)
   - Run the included test script: `cmake -P cmake/modules/test_emscripten.cmake`

4. **Build errors related to libtommath**: The project uses libtommath for big integer operations. Ensure it's properly set up in the deps directory.

- If you encounter PIC-related linking errors like:
     ```
     relocation R_X86_64_PC32 against symbol 'MP_MUL_KARATSUBA_CUTOFF' can not be used when making a shared object; recompile with -fPIC
     ```
     Clean your build and reconfigure with:
     ```bash
     rm -rf build
     mkdir build && cd build
     cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON
     cmake --build .
     ```

   After building, you can use the deployment script to copy all built files to their proper locations:
   ```bash
   ./scripts/deploy_builds.sh
   ```

5. **WASM module build failures**: 
   - Ensure you're using a compatible version of Emscripten (2.0.0 or higher recommended)
   - Check that the Emscripten toolchain file path is correct
   - Verify that all Emscripten tools are available in your PATH
   - See detailed instructions in `frontend/src/wasm/README.md`

### Cleaning the Build

To clean the build and start fresh:

```bash
# Navigate to the build directory
cd build

# Clean all built targets
cmake --build . --target clean

# Or simply remove the build directory and recreate it
cd ..
rm -rf build
mkdir -p build
```

## Advanced Configuration

### Debug Builds

To create a debug build with symbols:

```bash
cmake .. -DCMAKE_BUILD_TYPE=Debug
```

### Position Independent Code

For building shared libraries (Node.js addons), ensure position independent code is enabled:

```bash
cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON
```

### Custom Installation Location

To install the built libraries to a custom location:

```bash
cmake .. -DCMAKE_INSTALL_PREFIX=/custom/install/path
cmake --build . --target install
```