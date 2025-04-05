#include <emscripten.h>
#include "bigint_ops.h"
#include <stdio.h>
#include <string.h>

// Restore EMSCRIPTEN_KEEPALIVE macros
EMSCRIPTEN_KEEPALIVE
int encrypt_vote(const uint8_t* vote_array, size_t vote_length,
                const uint8_t* n_data, size_t n_length,
                const uint8_t* h_data, size_t h_length,
                const uint8_t* ska_data, size_t ska_length,
                uint8_t* result, size_t result_length) {
    
    // Create BigInt objects from the input data
    BigInt vote = create_bigint(vote_array, vote_length);
    BigInt n = create_bigint(n_data, n_length);
    BigInt h = create_bigint(h_data, h_length);
    BigInt ska = create_bigint(ska_data, ska_length);
    
    // Calculate n_squared (n^2)
    BigInt n_squared;
    modular_multiplication(&n, &n, &n, &n_squared);
    
    // Perform the encryption: result = h^vote * ska^n mod n^2
    BigInt h_vote;
    modular_exponentiation(&h, &vote, &n_squared, &h_vote);
    
    BigInt ska_n;
    modular_exponentiation(&ska, &n, &n_squared, &ska_n);
    
    BigInt encrypted;
    modular_multiplication(&h_vote, &ska_n, &n_squared, &encrypted);
    
    // Copy the result to the output buffer
    if (encrypted.length <= result_length) {
        memcpy(result, encrypted.data, encrypted.length);
    } else {
        // Result buffer is too small
        free_bigint(&vote);
        free_bigint(&n);
        free_bigint(&h);
        free_bigint(&ska);
        free_bigint(&n_squared);
        free_bigint(&h_vote);
        free_bigint(&ska_n);
        free_bigint(&encrypted);
        return -1;
    }
    
    // Clean up
    free_bigint(&vote);
    free_bigint(&n);
    free_bigint(&h);
    free_bigint(&ska);
    free_bigint(&n_squared);
    free_bigint(&h_vote);
    free_bigint(&ska_n);
    free_bigint(&encrypted);
    
    return 0;
}

// Helper function to convert a JavaScript array to a BigInt
EMSCRIPTEN_KEEPALIVE
BigInt* create_bigint_from_array(const uint8_t* data, size_t length) {
    BigInt* result = (BigInt*)malloc(sizeof(BigInt));
    *result = create_bigint(data, length);
    return result;
}

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