# CMakeLists.txt for the aggregator Node.js addon

cmake_minimum_required(VERSION 3.15)

project(aggregator_addon C CXX)

# Set C++11 standard explicitly - ADD THIS LINE
set(CMAKE_CXX_STANDARD 11)
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

# Define the shared library target (Node addon)
add_library(aggregator SHARED
    src/binding.cpp
    aggregator.c
    bigint_ops.c
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
target_link_libraries(aggregator PRIVATE bigint_lib ${NODE_LIBRARIES})

# Set the output filename to match Node's expectation (.node extension)
set_target_properties(aggregator PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/build/Release" # Match node-gyp output path
)

# Ensure bigint_lib is built before this target
add_dependencies(aggregator bigint_lib)

message(STATUS "Configuring aggregator Node addon...")
