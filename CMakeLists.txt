cmake_minimum_required(VERSION 3.15)

# Set custom module path before project()
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake/modules" ${CMAKE_MODULE_PATH})

# Check if git submodules are initialized
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/deps/curl/CMakeLists.txt" OR 
   NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/deps/libtommath/CMakeLists.txt")
  message(WARNING "Git submodules not found. Please run: git submodule update --init --recursive")
endif()

project(VotingSystem LANGUAGES C CXX)

# --- Global Settings ---
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Set build output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# --- Subdirectories ---

# Add dependency management (libtommath)
add_subdirectory(deps)

# Add common bigint library
add_subdirectory(common/bigint_lib)

# Check if we're building with Emscripten
if(NOT EMSCRIPTEN)    # Add aggregator and collector (Node Addon)
    add_subdirectory(aggregator)
    
    # Always add the collector module since we now handle cURL automatically
    # For Windows, the collector CMakeLists.txt will use the bundled cURL from deps
    # For Linux, it will use the system's cURL (requiring libcurl4-openssl-dev)
    add_subdirectory(collector)
else()
    # Add frontend WASM module if using Emscripten
    add_subdirectory(frontend/src/wasm)
endif()

message(STATUS "Root CMake configuration finished.")
