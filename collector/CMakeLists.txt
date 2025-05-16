cmake_minimum_required(VERSION 3.15)

project(collector_addon C CXX)

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

# Use the cURL from git submodule with minimal dependencies
message(STATUS "Configuring libcurl dependency")

if(TARGET libcurl)
    message(STATUS "Using libcurl from git submodule")
    set(CURL_LIBRARIES libcurl)
    
    # On Windows, we need to copy the DLL to the output directory if shared libs are enabled
    if(WIN32 AND BUILD_SHARED_LIBS)
        # This will be executed after the target is built
        add_custom_command(TARGET collector POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
            "$<TARGET_FILE:libcurl>"
            "$<TARGET_FILE_DIR:collector>/"
            COMMENT "Copying libcurl DLL to output directory"
        )
    endif()
    
    # Add Windows-specific networking libraries for cURL
    if(WIN32)
        list(APPEND CURL_LIBRARIES ws2_32 wldap32 crypt32 normaliz)
        add_compile_definitions(CURL_STATICLIB)
    endif()
    
elseif(TARGET CURL::libcurl)
    message(STATUS "Using CURL::libcurl target")
    set(CURL_LIBRARIES CURL::libcurl)
    
    # Add Windows-specific networking libraries for cURL
    if(WIN32)
        list(APPEND CURL_LIBRARIES ws2_32 wldap32 crypt32 normaliz)
        add_compile_definitions(CURL_STATICLIB)
    endif()
    
else()
    message(FATAL_ERROR "cURL not available. Please run: git submodule update --init --recursive")
endif()

# Ensure curl_interface target exists for include directories
if(NOT TARGET curl_interface)
    message(STATUS "Creating curl_interface target")
    add_library(curl_interface INTERFACE)
    target_include_directories(curl_interface INTERFACE 
      "${CMAKE_CURRENT_SOURCE_DIR}/../deps/curl/include"
    )
endif()

# Define the shared library target
add_library(collector SHARED
    src/binding.cpp
    collector.c
    bigint_ops.c
)

# Conditionally add lightweight HTTP implementation for Windows if needed
if(USE_BUNDLED_CURL AND NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/../deps/curl-win")
    target_sources(collector PRIVATE 
        ${CMAKE_CURRENT_SOURCE_DIR}/win_compat/win_http.c
    )
endif()

# Add compile definitions
target_compile_definitions(collector PRIVATE
    NAPI_DISABLE_CPP_EXCEPTIONS
    NODE_ADDON_API_DISABLE_DEPRECATED
)

# Platform-specific compiler options
if(WIN32)
    target_compile_options(collector PRIVATE
        $<$<COMPILE_LANGUAGE:C>:/W3 /O2 /D_CRT_SECURE_NO_WARNINGS>
        $<$<COMPILE_LANGUAGE:CXX>:/W3 /O2 /D_CRT_SECURE_NO_WARNINGS>
    )
    
    # Add Windows-specific definitions for cURL
    target_compile_definitions(collector PRIVATE 
        WIN32
        _WINDOWS
        CURL_STATICLIB
    )
else()
    target_compile_options(collector PRIVATE
        $<$<COMPILE_LANGUAGE:C>:-Wall -Wextra -O2 -fstack-protector-all>
        $<$<COMPILE_LANGUAGE:CXX>:-Wall -Wextra -O2>
    )
endif()

# Add include directories
target_link_libraries(collector PRIVATE curl_interface)

# Link against libraries
target_link_libraries(collector PRIVATE 
    bigint_lib 
    ${NODE_LIBRARIES} 
    ${CURL_LIBRARIES}
)

# Set output properties
set_target_properties(collector PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/build/Release"
)

message(STATUS "Configured collector Node addon")