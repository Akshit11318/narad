#include <emscripten.h>
#include "bigint_ops.h"
#include "vote_encrypt.h"
#include "crypto_voting.h"
#include <stdio.h>
#include <string.h>

// Restore EMSCRIPTEN_KEEPALIVE macros



// Helper function to free a BigInt
EMSCRIPTEN_KEEPALIVE
void free_bigint_ptr(BigInt* big_int) {
    if (big_int) {
        free_bigint(big_int);
        free(big_int);
    }
}

// Add this main function
int main() {
    // Empty main function for WebAssembly compilation
    return 0;
}