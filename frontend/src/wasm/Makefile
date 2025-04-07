# Output file name and path
OUTPUT_DIR = ../../public/assets
OUTPUT_NAME = encryption
OUTPUT = $(OUTPUT_DIR)/$(OUTPUT_NAME).js

# Source files
SOURCES = main.c bigint_ops.c vote_encrypt.c crypto_voting.c

# Common library path
COMMON_LIB_PATH = ../../../common/bigint_lib

# Emscripten compiler
EMCC = emcc

# Compiler flags
CFLAGS = -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] \
         -s EXPORTED_FUNCTIONS="['_malloc', '_free', \
          '_free_bigint_ptr', '_pack_votes', '_pack_and_encrypt_votes', '_encrypt_and_store', \
          '_get_encrypted_vote', '_get_encrypted_vote_size', '_clear_encrypted_vote', \
          '_generate_secret_key', '_compute_aggregator_public_key', '_compute_auxiliary_key', \
          '_encrypt_vote_paillier', '_get_secret_key', '_get_aggregator_public_key', \
          '_get_auxiliary_key', '_clear_crypto_params', '_initialize_crypto_params']" \
         -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_ES6=0 \
         -s EXPORT_NAME="createEncryptionModule" \
         -I$(COMMON_LIB_PATH)

# Build rule
all: $(OUTPUT_DIR) $(OUTPUT)

$(OUTPUT_DIR):
	mkdir -p $(OUTPUT_DIR)

$(OUTPUT): $(SOURCES)
	$(EMCC) $(CFLAGS) -o $(OUTPUT) $(SOURCES) $(COMMON_LIB_PATH)/bigint.c
	@echo "WebAssembly module compiled to $(OUTPUT) and $(OUTPUT).wasm"

# Clean rule
clean:
	rm -f $(OUTPUT) $(OUTPUT).wasm

.PHONY: all clean