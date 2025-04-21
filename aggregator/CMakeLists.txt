# CMakeLists.txt for the aggregator Node.js addon

cmake_minimum_required(VERSION 3.15)

project(aggregator_addon C CXX)

# Find Node.js development files (headers and libraries)
find_package(NodeJS REQUIRED)

# Include node-addon-api headers
# Ensure node-addon-api is installed via npm install in this directory
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR} # Include aggregator.h, bigint_ops.h
    ${NodeJS_INCLUDE_DIRS}
    "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api" # Adjust if node_modules is elsewhere
)

# Define the shared library target (Node addon)
add_library(aggregator SHARED
    src/binding.cpp
    aggregator.c
    bigint_ops.c
    # Note: bigint.c is linked via bigint_lib, not included directly
)

# Add compile definitions from binding.gyp
target_compile_definitions(aggregator PRIVATE
    NAPI_DISABLE_CPP_EXCEPTIONS
    NODE_ADDON_API_DISABLE_DEPRECATED
)

# Add compile options (adjust as needed)
target_compile_options(aggregator PRIVATE
    $<$<COMPILE_LANGUAGE:C>:-Wall;-Wextra;-O3>
    $<$<COMPILE_LANGUAGE:CXX>:-Wall;-Wextra;-O3>
)

# Link against the common bigint library and Node.js library
target_link_libraries(aggregator PRIVATE bigint_lib ${NodeJS_LIBRARIES})

# Set the output filename to match Node's expectation (.node extension)
set_target_properties(aggregator PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/build/Release" # Match node-gyp output path
)

# Ensure bigint_lib is built before this target
add_dependencies(aggregator bigint_lib)

message(STATUS "Configuring aggregator Node addon...")

# Optional: Add custom command to run npm install if node_modules doesn't exist
if(NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/node-addon-api")
    message(WARNING "node-addon-api not found. Run 'npm install' in the aggregator directory.")
    # Consider adding a custom command to run npm install automatically
    # add_custom_command(
    #     OUTPUT "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/.install_stamp"
    #     COMMAND npm install
    #     WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    #     COMMENT "Running npm install for aggregator"
    #     VERBATIM
    # )
    # add_custom_target(npm_install_aggregator ALL DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/node_modules/.install_stamp")
    # add_dependencies(aggregator npm_install_aggregator)
endif()