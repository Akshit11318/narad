# CMakeLists.txt for the frontend WASM module

cmake_minimum_required(VERSION 3.15)

project(encryption_wasm C)

# Add the common/bigint_lib and deps if not already included
if(NOT TARGET bigint_lib)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../../common/bigint_lib ${CMAKE_CURRENT_BINARY_DIR}/bigint_lib)
endif()

if(NOT TARGET libtommath AND NOT TARGET tommath)
    add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../../deps ${CMAKE_CURRENT_BINARY_DIR}/deps)
endif()

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
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/../../../common/bigint_lib
)

# Link against the common bigint library
target_link_libraries(encryption PRIVATE bigint_lib)

# Define exported functions
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
    "_main"
)

# Convert the list to comma-separated string for emcc flags
string(REPLACE ";" "," EXPORTED_FUNCTIONS_STR "${EXPORTED_FUNCTIONS}")

# Set Emscripten-specific link flags
set(EMCC_LINK_FLAGS
    "-O3"
    "-sWASM=1"
    "-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
    "-sEXPORTED_FUNCTIONS=[${EXPORTED_FUNCTIONS_STR}]"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sMODULARIZE=1"
    "-sEXPORT_ES6=0"
    "-sEXPORT_NAME=createEncryptionModule"
    "-sENVIRONMENT=web,worker"
)

target_link_options(encryption PRIVATE ${EMCC_LINK_FLAGS})

# Set output name and properties for Emscripten target
set_target_properties(encryption PROPERTIES
    OUTPUT_NAME "encryption"
    SUFFIX ".js"
)

# Define the destination directory
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

message(STATUS "Configured frontend WASM module")