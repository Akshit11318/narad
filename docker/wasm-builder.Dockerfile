# WASM Builder - Builds WebAssembly module in isolation
FROM emscripten/emsdk:4.0.6 AS wasm-builder

WORKDIR /app

# Install build tools
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy source files
COPY common ./common
COPY deps ./deps
COPY frontend/src/wasm ./frontend/src/wasm
COPY CMakeLists.txt ./

# Create build directory and build
WORKDIR /app/build-wasm

RUN emcmake cmake ../frontend/src/wasm \
    -DCMAKE_BUILD_TYPE=Release \
    && cmake --build . --config Release --parallel $(nproc)

# Validate outputs exist
RUN test -f encryption.js && test -f encryption.wasm

# Default command copies to /output
CMD ["sh", "-c", "mkdir -p /output && cp encryption.js encryption.wasm /output/"]
