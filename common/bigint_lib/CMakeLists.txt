# CMakeLists.txt for the common bigint wrapper library

cmake_minimum_required(VERSION 3.1)

project(bigint_lib C)

# Define the library target (static by default, can be changed)
add_library(bigint_lib bigint.c)

# Make the header file available to other targets
target_include_directories(bigint_lib PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}>
    $<INSTALL_INTERFACE:include> # For potential installation
)

# Link against the libtommath library
# The 'tommath' target is defined in deps/libtommath/CMakeLists.txt
target_link_libraries(bigint_lib PRIVATE libtommath)

message(STATUS "Configuring common bigint_lib...")