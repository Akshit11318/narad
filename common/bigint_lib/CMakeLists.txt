# CMakeLists.txt for the common bigint wrapper library

cmake_minimum_required(VERSION 3.5)

project(bigint_lib C)

# Define the library target as a shared library with PIC
add_library(bigint_lib SHARED bigint.c)

# Enable PIC for this library
set_property(TARGET bigint_lib PROPERTY POSITION_INDEPENDENT_CODE ON)

# Make the header file available to other targets
target_include_directories(bigint_lib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
    $<INSTALL_INTERFACE:include> # For potential installation
)

# Link against the libtommath library
# The 'tommath' target is defined in deps/libtommath/CMakeLists.txt
target_link_libraries(bigint_lib PRIVATE libtommath)

message(STATUS "Configuring common bigint_lib...")