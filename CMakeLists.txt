# Root CMakeLists.txt for the Voting System

cmake_minimum_required(VERSION 3.15)

project(VotingSystem LANGUAGES C CXX)

# --- Global Settings ---
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# Set build output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# --- Subdirectories ---

# Add dependency management (libtommath)
add_subdirectory(deps)

# Add common bigint library
add_subdirectory(common/bigint_lib)

# Add aggregator (Node Addon)
add_subdirectory(aggregator)

# Add collector (Node Addon)
add_subdirectory(collector)

# Add frontend WASM module
# Check if Emscripten toolchain is being used
if(CMAKE_TOOLCHAIN_FILE AND CMAKE_TOOLCHAIN_FILE MATCHES ".*Emscripten.cmake")
    message(STATUS "Emscripten toolchain detected. Adding WASM target.")
    add_subdirectory(frontend/src/wasm)
else()
    message(STATUS "Emscripten toolchain not detected. Skipping WASM target.")
endif()

# --- Optional: Add testing subdirectory ---
# enable_testing()
# add_subdirectory(tests) # If you have CMake-based tests

message(STATUS "Root CMake configuration finished.")