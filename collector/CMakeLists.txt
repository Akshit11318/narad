# CMakeLists.txt for the collector Node.js addon

cmake_minimum_required(VERSION 3.15)

project(collector_addon C CXX)

# Set C++17 standard explicitly (changed from C++11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Check if we're running under cmake-js
if(DEFINED CMAKE_JS_VERSION)
    message(STATUS "Building with cmake-js version ${CMAKE_JS_VERSION}")
    
    # When building with cmake-js directly in this directory,
    # we need to include the bigint_lib manually
    if(NOT TARGET bigint_lib)
        # Add the common/bigint_lib directory
        add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../common/bigint_lib ${CMAKE_CURRENT_BINARY_DIR}/bigint_lib)
        
        # Also need to add deps for libtommath
        if(NOT TARGET libtommath)
            add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../deps ${CMAKE_CURRENT_BINARY_DIR}/deps)
        endif()
    endif()
    
    # Use cmake-js provided include paths
    include_directories(
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_JS_INC}
        "${CMAKE_CURRENT_SOURCE_DIR}/../node_modules/node-addon-api"
    )
    
    # Use cmake-js provided libraries
    set(NODE_LIBRARIES ${CMAKE_JS_LIB})
else()
    # Use our FindNodeJS module when not using cmake-js
    find_package(NodeJS REQUIRED)
    
    include_directories(
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${NodeJS_INCLUDE_DIRS}
        "${CMAKE_CURRENT_SOURCE_DIR}/../node_modules/node-addon-api"
    )
    
    set(NODE_LIBRARIES ${NodeJS_LIBRARIES})
endif()

# Find the cURL library
find_package(CURL REQUIRED)

# Define the shared library target (Node addon)
add_library(collector SHARED
    src/binding.cpp
    collector.c
    bigint_ops.c
    # Note: bigint.c is linked via bigint_lib, not included directly
    # http_client.c and json_utils.c are part of the demo executable, not the addon
)

# Add compile definitions from binding.gyp
target_compile_definitions(collector PRIVATE
    NAPI_DISABLE_CPP_EXCEPTIONS
    NODE_ADDON_API_DISABLE_DEPRECATED
)

# Add compile options (adjust as needed, include security flags from Makefile)
target_compile_options(collector PRIVATE
    $<$<COMPILE_LANGUAGE:C>:-Wall;-Wextra;-O2;-g;-fstack-protector-all;-D_FORTIFY_SOURCE=2;-Wformat;-Wformat-security>
    $<$<COMPILE_LANGUAGE:CXX>:-Wall;-Wextra;-O2;-g>
)

# Add CURL include directories
target_include_directories(collector PRIVATE ${CURL_INCLUDE_DIR})

# Link against the common bigint library, Node.js library, and cURL
target_link_libraries(collector PRIVATE bigint_lib ${NODE_LIBRARIES} ${CURL_LIBRARIES})

# Set the output filename to match Node's expectation (.node extension)
set_target_properties(collector PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/build/Release" # Match node-gyp output path
)

# Ensure bigint_lib is built before this target
add_dependencies(collector bigint_lib)

message(STATUS "Configuring collector Node addon...")