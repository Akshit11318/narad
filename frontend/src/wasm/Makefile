# Makefile for compiling the voting system WebAssembly module

# Output file name
OUTPUT = voting_wasm.js

# Source files
SOURCES = main.c bigint_ops.c vote_encrypt.c

# Emscripten compiler
EMCC = emcc

# Compiler flags
CFLAGS = -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] \
         -s EXPORTED_FUNCTIONS="['_malloc', '_free', '_encrypt_vote', '_create_bigint_from_array', \
          '_free_bigint_ptr', '_pack_votes_wrapper', '_pack_and_encrypt_votes_wrapper', '_encrypt_and_store_wrapper', \
          '_get_encrypted_vote_wrapper', '_get_encrypted_vote_size_wrapper', '_clear_encrypted_vote_wrapper']" \
         -s ALLOW_MEMORY_GROWTH=1

# Build rule
all: $(OUTPUT)

$(OUTPUT): $(SOURCES)
	$(EMCC) $(CFLAGS) -o $(OUTPUT) $(SOURCES)

# Clean rule
clean:
	rm -f $(OUTPUT) $(OUTPUT).wasm

.PHONY: all clean