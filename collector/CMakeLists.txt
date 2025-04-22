# CMakeLists.txt for the collector Node.js addon

cmake_minimum_required(VERSION 3.15)

project(collector_addon C CXX)

# Make sure we can find our custom modules
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake/modules")

# Find NodeJS using our custom module
find_package(NodeJS REQUIRED)

# Check if NodeJS was found
if(NOT NodeJS_FOUND)
    message(FATAL_ERROR "Node.js development files not found. Please install Node.js and try again.")
endif()

# Add appropriate error handling for CURL dependency

# Find CURL using our custom module
find_package(CURL REQUIRED)

# Check if CURL was found
if(NOT CURL_FOUND)
    message(FATAL_ERROR 
        "CURL not found. Please install libcurl development package:\n"
        "  Ubuntu/Debian: sudo apt-get install libcurl4-openssl-dev\n"
        "  Windows: Install curl via vcpkg or use pre-built binaries\n"
        "  Or run CMake with: -DAUTO_INSTALL_CURL=ON to attempt automatic installation"
    )
endif()

# Debug output
message(STATUS "Found CURL include dir: ${CURL_INCLUDE_DIR}")
message(STATUS "Found CURL libraries: ${CURL_LIBRARIES}")

# Include node-addon-api headers
# Ensure node-addon-api is installed via npm install in this directory
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR} # Include collector.h, bigint_ops.h
    ${NodeJS_INCLUDE_DIRS}
    "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api" # Adjust if node_modules is elsewhere
)

# Define the shared library target (Node addon)
add_library(collector SHARED
    src/binding.cpp
    collector.c
    bigint_ops.c
    # Note: bigint.c is linked via bigint_lib, not included directly
    # http_client.c and json_utils.c are part of the demo executable, not the addon
)

# Add compile definitions (similar to aggregator, adjust if needed)
target_compile_definitions(collector PRIVATE
    NAPI_DISABLE_CPP_EXCEPTIONS
    NODE_ADDON_API_DISABLE_DEPRECATED
)

# Add compile options (adjust as needed, include security flags from Makefile)
target_compile_options(collector PRIVATE
    $<$<COMPILE_LANGUAGE:C>:-Wall;-Wextra;-O2;-g;-fstack-protector-all;-D_FORTIFY_SOURCE=2;-Wformat;-Wformat-security>
    $<$<COMPILE_LANGUAGE:CXX>:-Wall;-Wextra;-O2;-g>
)

# Add CURL include directories and link against CURL
target_include_directories(collector PRIVATE ${CURL_INCLUDE_DIR})
target_link_libraries(collector PRIVATE ${CURL_LIBRARIES})

# Link against the common bigint library, Node.js library, and cURL
target_link_libraries(collector PRIVATE bigint_lib ${NodeJS_LIBRARIES} CURL::libcurl)

# Set the output filename to match Node's expectation (.node extension)
set_target_properties(collector PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/build/Release" # Match node-gyp output path
)

# Ensure bigint_lib is built before this target
add_dependencies(collector bigint_lib)

message(STATUS "Configuring collector Node addon...")

# Optional: Add custom command to run npm install if node_modules doesn't exist
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api")
    message(WARNING "node-addon-api not found. Run 'npm install' in the collector directory.")
    # Consider adding a custom command similar to the aggregator's
endif()