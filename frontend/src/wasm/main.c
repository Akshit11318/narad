#include <emscripten.h>
#include "bigint_ops.h"
#include "vote_encrypt.h"
#include "crypto_voting.h"
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
    
    // Calculate n_squared (n^2) using plain multiplication
    BigInt n_squared;
    multiply_bigint(&n, &n, &n_squared);
    
    // Perform the encryption: result 
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

// Wrapper for pack_votes function
EMSCRIPTEN_KEEPALIVE
BigInt* pack_votes_wrapper(const uint32_t* votes, size_t vote_count) {
    BigInt packed = pack_votes(votes, vote_count);
    BigInt* result = (BigInt*)malloc(sizeof(BigInt));
    *result = packed;
    return result;
}

// Wrapper for pack_and_encrypt_votes function
EMSCRIPTEN_KEEPALIVE
int pack_and_encrypt_votes_wrapper(const uint32_t* votes, size_t vote_count,
                                 const uint8_t* n_data, size_t n_length,
                                 const uint8_t* h_data, size_t h_length,
                                 const uint8_t* ska_data, size_t ska_length,
                                 uint8_t* result, size_t result_length) {
    return pack_and_encrypt_votes(votes, vote_count, n_data, n_length, h_data, h_length,
                                 ska_data, ska_length, result, result_length);
}

// Wrapper for encrypt_and_store function
EMSCRIPTEN_KEEPALIVE
int encrypt_and_store_wrapper(const uint32_t* votes, size_t vote_count,
                             const uint8_t* n_data, size_t n_length,
                             const uint8_t* h_data, size_t h_length,
                             const uint8_t* ska_data, size_t ska_length) {
    return encrypt_and_store(votes, vote_count, n_data, n_length, h_data, h_length,
                            ska_data, ska_length);
}

// Wrapper for get_encrypted_vote function
EMSCRIPTEN_KEEPALIVE
int get_encrypted_vote_wrapper(uint8_t* result, size_t result_length) {
    return get_encrypted_vote(result, result_length);
}

// Wrapper for get_encrypted_vote_size function
EMSCRIPTEN_KEEPALIVE
size_t get_encrypted_vote_size_wrapper() {
    return get_encrypted_vote_size();
}

// Wrapper for clear_encrypted_vote function
EMSCRIPTEN_KEEPALIVE
int clear_encrypted_vote_wrapper() {
    return clear_encrypted_vote();
}

// Wrapper for generate_secret_key function
EMSCRIPTEN_KEEPALIVE
int generate_secret_key_wrapper(const uint8_t* n_data, size_t n_length) {
    return generate_secret_key(n_data, n_length);
}

// Wrapper for compute_aggregator_public_key function
EMSCRIPTEN_KEEPALIVE
int compute_aggregator_public_key_wrapper(const uint8_t* h_data, size_t h_length,
                                        const uint8_t* sk_a_data, size_t sk_a_length,
                                        const uint8_t* n_data, size_t n_length) {
    return compute_aggregator_public_key(h_data, h_length, sk_a_data, sk_a_length, n_data, n_length);
}

// Wrapper for compute_auxiliary_key function
EMSCRIPTEN_KEEPALIVE
int compute_auxiliary_key_wrapper(const uint8_t* n_data, size_t n_length) {
    return compute_auxiliary_key(n_data, n_length);
}

// Wrapper for encrypt_vote_paillier function
EMSCRIPTEN_KEEPALIVE
int encrypt_vote_paillier_wrapper(const uint8_t* vote_data, size_t vote_length,
                                 const uint8_t* h_data, size_t h_length,
                                 const uint8_t* n_data, size_t n_length,
                                 uint8_t* result, size_t result_length) {
    return encrypt_vote_paillier(vote_data, vote_length, h_data, h_length, n_data, n_length, result, result_length);
}

// Wrapper for get_secret_key function
EMSCRIPTEN_KEEPALIVE
int get_secret_key_wrapper(uint8_t* result, size_t result_length) {
    return get_secret_key(result, result_length);
}

// Wrapper for get_aggregator_public_key function
EMSCRIPTEN_KEEPALIVE
int get_aggregator_public_key_wrapper(uint8_t* result, size_t result_length) {
    return get_aggregator_public_key(result, result_length);
}

// Wrapper for get_auxiliary_key function
EMSCRIPTEN_KEEPALIVE
int get_auxiliary_key_wrapper(uint8_t* result, size_t result_length) {
    return get_auxiliary_key(result, result_length);
}

// Wrapper for clear_crypto_params function
EMSCRIPTEN_KEEPALIVE
int clear_crypto_params_wrapper() {
    return clear_crypto_params();
}

// Add this main function
int main() {
    // Empty main function for WebAssembly compilation
    return 0;
}