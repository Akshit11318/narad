# Voting System

A secure and modular cross-platform voting system with cryptographic verification capabilities.

## 🌟 Features

- **Secure Vote Collection**: Cryptographically secured vote collection mechanism
- **Vote Aggregation**: Advanced aggregation with integrity verification
- **Browser-based Cryptography**: WebAssembly module for client-side encryption
- **Cross-Platform Support**: Full support for both Windows and Ubuntu environments
- **Multiple Vote Support**: Cast multiple votes using different voter IDs
- **Modular Architecture**: Well-defined components that can be built and used independently

## 🧩 Project Architecture

The project is structured as a collection of interconnected modules:

### Core Modules

1. **Aggregator**: 
   - Node.js module for secure vote aggregation
   - Handles cryptographic verification of voting data
   - Built as a native Node.js addon

2. **Collector**: 
   - Node.js module for secure vote collection 
   - Provides APIs for submitting and managing votes
   - Uses cURL for network communication
   - Built as a native Node.js addon
   
3. **Frontend WASM Module**:
   - WebAssembly module for browser-based cryptographic operations
   - Enables client-side vote encryption
   - Supports ES6 module imports
   - Optimized for both production and development builds
   
4. **BigInt Library**:
   - Shared common library used by all components
   - Provides large integer arithmetic operations
   - Optimized C implementation using libtommath

### Supporting Components

- **Backend Service**: Node.js/Express API server
- **Database Layer**: Prisma ORM with migrations
- **Test Suites**: Testing framework for verifying crypto operations
- **Build Scripts**: Cross-platform scripts for building all modules

## 🔄 Cross-Platform Dependency Management

The project uses Git submodules to manage dependencies (libtommath and cURL), ensuring consistent builds across Windows and Ubuntu platforms.

To clone the repository with all dependencies automatically:

```bash
# Quick setup - initialize all dependencies
git clone --recursive https://github.com/raj-gigt/votingSys.git
cd votingSys
```

WebAssembly/Emscripten builds are supported on both platforms (for WSL on Windows). See [DEPENDENCIES.md](DEPENDENCIES.md) for detailed information about the improved dependency management approach.

## Prerequisites

### Common Requirements (All Platforms)
- Node.js (v14+)
- npm (comes with Node.js)
- Git (for dependency management via submodules)
- CMake (v3.15+)
- Compatible C/C++ compiler

### Windows Requirements
- Visual Studio Build Tools or full Visual Studio (2019 or newer) with C++ development workload
- PowerShell 3.0 or newer
- Git Bash (optional, for running bash scripts)
- WSL (Windows Subsystem for Linux): Required for WebAssembly builds

### Ubuntu Requirements
- GCC/G++ (v9+) or Clang
- build-essential package
- ccache (optional): For faster repeated builds

### WebAssembly Build Requirements
- Emscripten SDK (emsdk) v2.0.0 or higher

## 🚀 Installation

### Clone the Repository

```bash
# Clone the repository with all submodules
git clone --recursive https://github.com/raj-gigt/votingSys.git

# Navigate to the project directory
cd votingSys
```

### Install Dependencies

First, initialize all Git submodules manually:

```bash
# Initialize and update all submodules
git submodule update --init --recursive

# Verify submodules were initialized correctly (optional)
git submodule status
```

Install Node.js dependencies for all modules:

```bash
# Install all dependencies using workspaces
npm install

# Or individually for each module
cd aggregator && npm install && cd ..
cd collector && npm install && cd ..
cd frontend && npm install && cd ..
```

### Installing Required Packages

#### Ubuntu
```bash
# Install build tools
sudo apt update
sudo apt install build-essential git ccache

# Install Node.js if needed (example using Node.js 16)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install cmake globally
npm install -g cmake-js
```

#### Windows
1. Install [Node.js](https://nodejs.org/)
2. Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) or Visual Studio with C++ development workload
3. Open PowerShell as Administrator and run:
```powershell
npm install -g cmake-js
```

### Installing Emscripten (for WebAssembly)

#### Ubuntu
```bash
# Clone emsdk repo
git clone https://github.com/emscripten-core/emsdk.git

# Enter directory
cd emsdk

# Download and install latest SDK tools
./emsdk install latest

# Make the "latest" SDK "active" for the current user
./emsdk activate latest

# Activate environment variables (needs to be run in each new terminal)
source ./emsdk_env.sh
```

#### Windows
```powershell
# Clone emsdk repo
git clone https://github.com/emscripten-core/emsdk.git

# Enter directory
cd emsdk

# Download and install latest SDK tools
.\emsdk install latest

# Make the "latest" SDK "active" for the current user
.\emsdk activate latest

# Activate environment variables (needs to be run in each new terminal)
.\emsdk_env.bat
```

## 🏗️ Building the Project

The project can be built manually by following the detailed steps below. These instructions cover building all components for both Windows and Ubuntu/Linux environments.

### Prerequisites Check

First, verify your environment has all required tools:

#### Windows
```powershell
# Check CMake version
cmake --version  # Should be 3.15+

# Check Node.js and npm version
node --version   # Should be 14.0.0+
npm --version

# Check if cmake-js is installed
cmake-js --version
```

#### Ubuntu/Linux/WSL
```bash
# Check CMake version
cmake --version  # Should be 3.15+

# Check Node.js and npm version
node --version   # Should be 14.0.0+
npm --version

# Check GCC/Clang version
gcc --version    # Should be 9.0.0+ 

# Check if cmake-js is installed
cmake-js --version
```

### Manual Build Process

If you prefer to build components individually:


#### 1. Build Aggregator Module
```bash
# Navigate to aggregator directory
cd aggregator

# Build with cmake-js
cmake-js compile
# For debug build:
# cmake-js compile --debug

# Return to project root
cd ..
```

#### 2. Build Collector Module
```bash
# Navigate to collector directory
cd collector

# Build with cmake-js
cmake-js compile
# For debug build:
# cmake-js compile --debug

# Return to project root
cd ..
```

#### 3. Build WebAssembly Module

First, activate Emscripten in your current terminal:

**Ubuntu/Linux/WSL**:
```bash
# Replace with your actual path to emsdk
source ~/emsdk/emsdk_env.sh

# Verify Emscripten is active
emcc --version
```

Then build the WASM module:

```bash
# Navigate to the project root directory
cd /path/to/votingSys

# Create build directory for WASM
mkdir -p build-wasm
cd build-wasm

# Configure with Emscripten
emcmake cmake ../frontend/src/wasm

# For debug build with faster compilation (recommended for development):
emcmake cmake ../frontend/src/wasm -DCMAKE_BUILD_TYPE=Debug

# For release build with full optimization:
# emcmake cmake ../frontend/src/wasm -DCMAKE_BUILD_TYPE=Release

# Build (replace $(nproc) with number of CPU cores on Windows)
cmake --build . --config Debug --parallel 14

# Copy output files to frontend assets directory
cp encryption.js ../frontend/public/assets/
cp encryption.wasm ../frontend/public/assets/

# Return to project root
cd ..
```

## Output Files

After building, you'll find the compiled files in these locations:

- **Aggregator**: `aggregator/build/Release/aggregator.node`
- **Collector**: `collector/build/Release/collector.node`
- **WASM Files**: 
  - `build-wasm/encryption.js`
  - `build-wasm/encryption.wasm`
  - Also copied to `../frontend/public/assets/`

## 🌐 Running the Application

### Start the Backend Server

```bash
# Navigate to project root
cd /path/to/votingSys

# Install backend dependencies if not already done
cd testing-2.0
npm install

# Start the backend service in production mode
npm start

# For development with hot reload:
npm run dev

# Return to project root
cd ..
```

### Start the Frontend Development Server

```bash
# Navigate to frontend directory
cd /path/to/votingSys/frontend

# Install frontend dependencies if not already done
npm install

# Start the development server
npm run dev

```

### Running the Collector Module

```bash
# Navigate to collector directory
cd collector

# Run the compiled module
node dist/index.js
```

## 📖 Module Details

### Aggregator Module

The Aggregator securely processes and verifies voting data:

- **Location**: `/aggregator`
- **Main Files**:
  - `aggregator.c`: Core aggregation logic
  - `binding.cpp`: Node.js binding code
  - `src/index.ts`: TypeScript wrapper
- **Output**: `aggregator/build/Release/aggregator.node`

### Collector Module

The Collector handles vote submission and initial validation:

- **Location**: `/collector`
- **Main Files**:
  - `collector.c`: Core collection logic 
  - `binding.cpp`: Node.js binding code
  - `src/index.ts`: TypeScript wrapper
- **Output**: `collector/build/Release/collector.node`
- **Usage**: Used to submit votes to the backend server

### WebAssembly Module

The WASM module provides cryptographic functions for the browser:

- **Location**: `/frontend/src/wasm`
- **Main Files**:
  - `main.c`: Entry point for WASM module
  - `crypto_voting.c`: Cryptographic voting functions
  - `wasmModule.ts`: TypeScript wrapper
- **Output**: 
  - `build-wasm/encryption.js`
  - `build-wasm/encryption.wasm`
  - Copied to `frontend/public/assets/`
- **Features**:
  - Fast development builds with `-O1` optimization
  - Production builds with `-O3` optimization
  - Custom voter ID support for multiple voting
  - Secure client-side vote encryption

### BigInt Library

The shared library for large integer arithmetic:

- **Location**: `/common/bigint_lib`
- **Dependencies**: Uses `libtommath` for core operations
- **Output**: Static library linked into other modules

## ⚡ Faster WebAssembly Development

For faster iteration during development, you can optimize the build process:


## 📚 Submodule Management

This project uses Git submodules to manage external dependencies:

- **libtommath**: Optimized multiple-precision integer library located at `deps/libtommath`
- **curl**: Library for HTTP requests located at `deps/curl`

### Managing Submodules Manually

```bash
# Check status of submodules
git submodule status

# Initialize submodules (if not done during clone)
git submodule init

# Update submodules to their latest committed versions
git submodule update

# Initialize and update in one command
git submodule update --init --recursive

# Reset submodules to discard local changes
git submodule foreach git reset --hard

# Update submodules to their latest remote versions
git submodule foreach git pull origin master
```

## 🔍 Troubleshooting

### Common Issues

#### CMake-js Not Found
Make sure you've installed cmake-js globally:
```bash
npm install -g cmake-js
```

#### PIC (Position Independent Code) Errors
If you encounter linking errors related to PIC, make sure the `-fPIC` flag is enabled for all components:
```bash
cmake .. -DCMAKE_POSITION_INDEPENDENT_CODE=ON
```

#### cURL Not Found
- Windows: The build system will automatically download and configure cURL if not found
- Ubuntu: `sudo apt install libcurl4-openssl-dev`

#### Emscripten Errors
If building the WASM module fails, ensure you've properly activated Emscripten in your current terminal:
- Ubuntu: `source path/to/emsdk/emsdk_env.sh`
- Windows: `path\to\emsdk\emsdk_env.bat`

#### Node.js Integration Issues
Make sure node-addon-api is installed:
```bash
cd aggregator  # or collector
npm install
```

#### WebAssembly Files Not Found
Check that the WASM files were correctly copied to the frontend assets:
```bash
ls -la frontend/public/assets/encryption.*
```

#### Collector Error When Running with `node run dist/index.js`
The correct command is `node dist/index.js` (without "run").

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.