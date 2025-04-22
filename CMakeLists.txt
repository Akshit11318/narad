# Root CMakeLists.txt for the Voting System

cmake_minimum_required(VERSION 3.15)

# Add cmake modules path for custom Find*.cmake modules
# Make sure this is set before the project() command
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake/modules" ${CMAKE_MODULE_PATH})

project(VotingSystem LANGUAGES C CXX)

# --- Global Settings ---
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# Set build output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)

# Add global include directories
include_directories(
  ${CMAKE_CURRENT_SOURCE_DIR}/common/include  # Common project includes
)

# When using Emscripten, add Emscripten system includes
if(EMSCRIPTEN)
  if(DEFINED ENV{EMSDK})
    include_directories(
      $ENV{EMSDK}/upstream/emscripten/cache/sysroot/include
      $ENV{EMSDK}/upstream/emscripten/system/include
    )
    message(STATUS "Added Emscripten include directories from EMSDK environment variable")
  endif()
  
  if(DEFINED EMSCRIPTEN_ROOT_PATH)
    include_directories(
      ${EMSCRIPTEN_ROOT_PATH}/upstream/emscripten/cache/sysroot/include
      ${EMSCRIPTEN_ROOT_PATH}/upstream/emscripten/system/include
    )
    message(STATUS "Added Emscripten include directories from EMSCRIPTEN_ROOT_PATH")
  endif()
  
  # Try to find emcc and use its location to determine includes
  find_program(EMCC_PATH emcc)
  if(EMCC_PATH)
    get_filename_component(EMCC_DIR "${EMCC_PATH}" DIRECTORY)
    include_directories(
      ${EMCC_DIR}/../include
      ${EMCC_DIR}/system/include
      ${EMCC_DIR}/cache/sysroot/include
    )
    message(STATUS "Added Emscripten include directories based on emcc location: ${EMCC_DIR}")
  endif()
endif()

# --- Subdirectories ---

# Add dependency management (libtommath)
add_subdirectory(deps)

# Add common bigint library
add_subdirectory(common/bigint_lib)

# Add aggregator (Node Addon)
add_subdirectory(aggregator)

# Add collector (Node Addon)
# Only include if not building with Emscripten
if(NOT EMSCRIPTEN)
    # Check if CURL is available
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
# Check if Emscripten toolchain is being used
if(CMAKE_TOOLCHAIN_FILE AND CMAKE_TOOLCHAIN_FILE MATCHES ".*Emscripten.cmake")
    # Try to find Emscripten using our custom module
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
    message(STATUS "To build WASM module, run: cmake .. -DCMAKE_TOOLCHAIN_FILE=/path/to/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake")
endif()

# --- Optional: Add testing subdirectory ---
# enable_testing()
# add_subdirectory(tests) # If you have CMake-based tests

message(STATUS "Root CMake configuration finished.")