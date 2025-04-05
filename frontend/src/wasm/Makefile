# Makefile for compiling C code to WebAssembly

# Emscripten compiler and flags
EMCC = emcc
EMCFLAGS = -O2 -s WASM=1 -s EXPORTED_FUNCTIONS="['_malloc', '_free', '_encrypt_vote', '_create_bigint_from_array', '_free_bigint_ptr']" -s EXPORTED_RUNTIME_METHODS="['ccall', 'cwrap']" -s ALLOW_MEMORY_GROWTH=1

# Source files
SRCS = main.c bigint_ops.c

# Output file
OUTPUT = encryption.wasm

# Default target
all: $(OUTPUT)

# Compile C code to WebAssembly
$(OUTPUT): $(SRCS)
	$(EMCC) $(EMCFLAGS) $(SRCS) -o $(OUTPUT)

# Clean target
clean:
	rm -f $(OUTPUT)

.PHONY: all clean