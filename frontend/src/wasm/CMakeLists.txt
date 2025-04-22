# CMakeLists.txt for the frontend WASM module

cmake_minimum_required(VERSION 3.15)

# This file should only be processed if the Emscripten toolchain is active
if(NOT CMAKE_TOOLCHAIN_FILE MATCHES ".*Emscripten.cmake")
    message(STATUS "Skipping WASM build: Emscripten toolchain not active.")
    message(STATUS "To build WASM module, run: cmake .. -DCMAKE_TOOLCHAIN_FILE=/path/to/emsdk/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake")
    return()
endif()

# Find Emscripten using our custom module
find_package(Emscripten QUIET)

# Comment out the EmscriptenTest include since it's not available or needed here
# include(EmscriptenTest)

# Verify Emscripten is properly configured
if(NOT EMSCRIPTEN AND NOT DEFINED ENV{EMSCRIPTEN})
    # Try to detect Emscripten from environment
    if(EXISTS "${EMSCRIPTEN_TOOLCHAIN_FILE}")
        message(STATUS "Using toolchain file: ${EMSCRIPTEN_TOOLCHAIN_FILE}")
        set(EMSCRIPTEN 1)
    else()
        message(FATAL_ERROR "Emscripten is not properly configured. Please ensure emsdk is activated.\n"
                            "Run 'source /path/to/emsdk/emsdk_env.sh' before running CMake.\n"
                            "If emsdk is in a custom location, set EMSCRIPTEN_ROOT_PATH: -DEMSCRIPTEN_ROOT_PATH=/path/to/emsdk")
    endif()
endif()

# Display Emscripten version information
if(Emscripten_FOUND)
    message(STATUS "Using Emscripten version ${Emscripten_VERSION}")
    message(STATUS "Emscripten root path: ${Emscripten_ROOT_PATH}")
    
    # Comment out the environment verification since it's not defined
    # verify_emscripten_environment()
    # if(NOT EMSCRIPTEN_ENV_VALID)
    #     message(FATAL_ERROR "Emscripten environment verification failed. Please check your Emscripten installation.")
    # endif()
endif()

# Allow user to specify custom Emscripten paths
if(DEFINED EMSCRIPTEN_ROOT_DIR)
    message(STATUS "Using custom Emscripten root directory: ${EMSCRIPTEN_ROOT_DIR}")
endif()

project(frontend_wasm C)

# Tell CMake to use our custom FindCURL module
list(APPEND CMAKE_MODULE_PATH "${CMAKE_SOURCE_DIR}/cmake/modules")

# Define source files
set(WASM_SOURCES
    main.c
    bigint_ops.c
    vote_encrypt.c
    crypto_voting.c
)

# Define the executable target (Emscripten generates .js and .wasm)
add_executable(encryption ${WASM_SOURCES})

# Include directories
target_include_directories(encryption PRIVATE
    ${CMAKE_SOURCE_DIR}/common/bigint_lib # Access bigint.h
    # libtommath include is handled via bigint_lib dependency
)

# Link against the common bigint library
# This implicitly links against tommath as well
target_link_libraries(encryption PRIVATE bigint_lib)

# Define exported functions (from Makefile)
set(EXPORTED_FUNCTIONS
    "_malloc"
    "_free"
    "_pack_votes"
    "_pack_and_encrypt_votes"
    "_encrypt_and_store"
    "_get_encrypted_vote"
    "_get_encrypted_vote_size"
    "_clear_encrypted_vote"
    "_generate_secret_key"
    "_compute_aggregator_public_key"
    "_compute_auxiliary_key"
    "_encrypt_vote_paillier"
    "_get_secret_key"
    "_get_aggregator_public_key"
    "_get_auxiliary_key"
    "_clear_crypto_params"
    "_initialize_crypto_params"
)
string(REPLACE ";" "," EXPORTED_FUNCTIONS_STR "${EXPORTED_FUNCTIONS}")

# Set Emscripten-specific linker flags (from Makefile)
set(EMCC_LINK_FLAGS
    "-O3"
    "-s WASM=1"
    "-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
    "-s EXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS_STR}]"
    "-s ALLOW_MEMORY_GROWTH=1"
    "-s MODULARIZE=1"
    "-s EXPORT_ES6=0"
    "-s EXPORT_NAME='createEncryptionModule'"
    # Output path needs careful handling
    # "-o ${CMAKE_SOURCE_DIR}/frontend/public/assets/encryption.js" # Option 1: Hardcoded path
)

# Apply link flags
target_link_options(encryption PRIVATE ${EMCC_LINK_FLAGS})

# Set output name and properties for Emscripten target
set_target_properties(encryption PROPERTIES
    OUTPUT_NAME "encryption"
    SUFFIX ".js" # Tell CMake the primary output is JS
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}" # Ensure predictable output location
)

# Ensure bigint_lib is built first
add_dependencies(encryption bigint_lib)

# --- Post-build step to copy files --- 
# Define the destination directory relative to the root source directory
set(WASM_DESTINATION_DIR "${CMAKE_SOURCE_DIR}/frontend/public/assets")

# Ensure the destination directory exists
add_custom_command(
    TARGET encryption POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory ${WASM_DESTINATION_DIR}
    COMMENT "Creating destination directory ${WASM_DESTINATION_DIR}"
)

# Copy the JS file
add_custom_command(
    TARGET encryption POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy 
        "${CMAKE_CURRENT_BINARY_DIR}/encryption.js" 
        "${WASM_DESTINATION_DIR}/encryption.js"
    COMMENT "Copying JS output to ${WASM_DESTINATION_DIR}"
)

# Copy the WASM file
add_custom_command(
    TARGET encryption POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy 
        "${CMAKE_CURRENT_BINARY_DIR}/encryption.wasm" 
        "${WASM_DESTINATION_DIR}/encryption.wasm"
    COMMENT "Copying WASM output to ${WASM_DESTINATION_DIR}"
)

message(STATUS "Configuring frontend WASM module (Emscripten)...")