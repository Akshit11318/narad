# CMakeLists.txt for the common bigint wrapper library

cmake_minimum_required(VERSION 3.15)

project(bigint_lib C)

# Define the library target as a static library with PIC
add_library(bigint_lib STATIC bigint.c)

# Always enable PIC for this library
set_property(TARGET bigint_lib PROPERTY POSITION_INDEPENDENT_CODE ON)

# Make the header file available to other targets
target_include_directories(bigint_lib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
)

# Link against the libtommath library
target_link_libraries(bigint_lib PUBLIC libtommath)

message(STATUS "Configured bigint_lib")