cmake_minimum_required(VERSION 3.15)

project(aggregator_addon C CXX)

# Set C/C++ standards
set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# Add the common/bigint_lib and deps if not already included
if(NOT TARGET bigint_lib)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../common/bigint_lib ${CMAKE_CURRENT_BINARY_DIR}/bigint_lib)
endif()

if(NOT TARGET libtommath AND NOT TARGET tommath)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../deps ${CMAKE_CURRENT_BINARY_DIR}/deps)
endif()

# Set up Node.js dependencies
if(DEFINED CMAKE_JS_VERSION)
    # Use cmake-js variables
    include_directories(
        ${CMAKE_CURRENT_SOURCE_DIR}
        ${CMAKE_JS_INC}
        "${CMAKE_CURRENT_SOURCE_DIR}/../node_modules/node-addon-api"
    )
    set(NODE_LIBRARIES ${CMAKE_JS_LIB})
else()
    message(FATAL_ERROR "This build requires cmake-js. Please run with 'cmake-js compile'")
endif()

# Define the shared library target
add_library(aggregator SHARED
    src/binding.cpp
    aggregator.c
    bigint_ops.c
)

# Add compile definitions
target_compile_definitions(aggregator PRIVATE
    NAPI_DISABLE_CPP_EXCEPTIONS
    NODE_ADDON_API_DISABLE_DEPRECATED
)

# Platform-specific compiler options
if(WIN32)
    target_compile_options(aggregator PRIVATE
        $<$<COMPILE_LANGUAGE:C>:/W3 /O2 /D_CRT_SECURE_NO_WARNINGS>
        $<$<COMPILE_LANGUAGE:CXX>:/W3 /O2 /D_CRT_SECURE_NO_WARNINGS>
    )
    
    # Add Windows-specific definitions
    target_compile_definitions(aggregator PRIVATE 
        WIN32
        _WINDOWS
    )
else()
    target_compile_options(aggregator PRIVATE
        $<$<COMPILE_LANGUAGE:C>:-Wall -Wextra -O2>
        $<$<COMPILE_LANGUAGE:CXX>:-Wall -Wextra -O2>
    )
endif()

# Link against libraries
target_link_libraries(aggregator PRIVATE bigint_lib ${NODE_LIBRARIES})

# Set output properties
set_target_properties(aggregator PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/build/Release"
)

message(STATUS "Configured aggregator Node addon")
