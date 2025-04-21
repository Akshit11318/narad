# CMakeLists.txt for the frontend WASM module

cmake_minimum_required(VERSION 3.15)

# This file should only be processed if the Emscripten toolchain is active
if(NOT CMAKE_TOOLCHAIN_FILE MATCHES ".*Emscripten.cmake")
    message(STATUS "Skipping WASM build: Emscripten toolchain not active.")
    return()
endif()

project(frontend_wasm C)

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

# Set output name (Emscripten uses target name by default)
# The output location is tricky with Emscripten and CMake.
# By default, it goes to CMAKE_RUNTIME_OUTPUT_DIRECTORY.
# We might need a custom command to copy it to frontend/public/assets.
set_target_properties(encryption PROPERTIES
    OUTPUT_NAME "encryption"
    SUFFIX ".js" # Tell CMake the primary output is JS
)

# Ensure bigint_lib is built first
add_dependencies(encryption bigint_lib)

# --- Post-build step to copy files --- 
# Define the destination directory relative to the root source directory
set(WASM_DESTINATION_DIR "${CMAKE_SOURCE_DIR}/frontend/public/assets")

add_custom_command(
    TARGET encryption POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory ${WASM_DESTINATION_DIR}
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:encryption> ${WASM_DESTINATION_DIR}/encryption.js
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE_BASE_NAME:encryption>.wasm ${WASM_DESTINATION_DIR}/encryption.wasm
    COMMENT "Copying WASM outputs to ${WASM_DESTINATION_DIR}"
)

message(STATUS "Configuring frontend WASM module (Emscripten)...")