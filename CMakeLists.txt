cmake_minimum_required(VERSION 3.15)

# Set custom module path before project()
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake/modules" ${CMAKE_MODULE_PATH})

project(VotingSystem LANGUAGES C CXX)

# --- Global Settings ---
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# Set build output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Detect cmake-js
if(DEFINED CMAKE_JS_VERSION)
    message(STATUS "Building with cmake-js version ${CMAKE_JS_VERSION}")
endif()

# Global include directories
include_directories(
  ${CMAKE_CURRENT_SOURCE_DIR}/common/include
)

# --- Subdirectories ---

# Add dependency management (libtommath)
add_subdirectory(deps)

# Add common bigint library
add_subdirectory(common/bigint_lib)

# Add aggregator (Node Addon) - skip for Emscripten
if(NOT EMSCRIPTEN)
    add_subdirectory(aggregator)
endif()

# Add collector (Node Addon) - skip for Emscripten
if(NOT EMSCRIPTEN)
    include(FindCURL)
    find_package(CURL QUIET)
    
    if(CURL_FOUND)
        add_subdirectory(collector)
    else()
        message(STATUS "CURL not found. Skipping collector module.")
        message(STATUS "Install libcurl dev package with: sudo apt-get install libcurl4-openssl-dev")
    endif()
endif()

# Add frontend WASM module
if(CMAKE_TOOLCHAIN_FILE AND CMAKE_TOOLCHAIN_FILE MATCHES ".*Emscripten.cmake")
    find_package(Emscripten QUIET)
    
    if(Emscripten_FOUND)
        message(STATUS "Emscripten toolchain detected (version ${Emscripten_VERSION}). Adding WASM target.")
        add_subdirectory(frontend/src/wasm)
    else()
        message(WARNING "Emscripten toolchain file specified but Emscripten SDK not properly configured. WASM target will be skipped.")
        message(STATUS "Hint: Make sure to activate emsdk before running CMake (source /path/to/emsdk/emsdk_env.sh)")
    endif()
else()
    message(STATUS "Emscripten toolchain not detected. Skipping WASM target.")
    message(STATUS "To build WASM module, run: cmake .. -DCMAKE_TOOLCHAIN_FILE=$EMSDK/upstream/emscripten/cmake/Toolchain.cmake")
endif()

message(STATUS "Root CMake configuration finished.")
