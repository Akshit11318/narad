#include <emscripten.h>
#include "bigint_ops.h"
#include "vote_encrypt.h"
#include "crypto_voting.h"
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdio.h>

// Define the global election parameters variable
ElectionParams election_params = {NULL, NULL};

// Global storage for cryptographic parameters
static BigInt* g_sk_i = NULL;  // Client's secret key
static BigInt* g_pk_A = NULL;  // Aggregator's public key
static BigInt* g_aux_i = NULL; // Auxiliary key

/**
 * @brief Generate a random secret key sk_i in the range [1, N²]
 * @param n_data The modulus N component
 * @param n_length Length of n_data
 * @return 0 on success, negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int generate_secret_key(const uint8_t* n_data, size_t n_length) {
    // Clean up any existing secret key
    if (g_sk_i) {
        free_bigint_ptr(g_sk_i);
        g_sk_i = NULL;
    }
    
    // Create BigInt for N
    BigInt n = create_bigint(n_data, n_length);
    
    // Calculate N² using plain multiplication
    BigInt n_squared;
    multiply_bigint(&n, &n, &n_squared);
    
    // Allocate memory for random bytes (same size as n_squared)
    uint8_t* random_bytes = (uint8_t*)malloc(n_squared.length);
    if (!random_bytes) {
        free_bigint(&n);
        free_bigint(&n_squared);
        return -1; // Memory allocation failed
    }
    
    // Seed the random number generator
    srand((unsigned int)time(NULL));
    
    // Generate random bytes
    for (size_t i = 0; i < n_squared.length; i++) {
        random_bytes[i] = (uint8_t)(rand() & 0xFF);
    }
    
    // Ensure the value is in range [1, N²]
    // First, make sure it's less than N²
    if (random_bytes[n_squared.length - 1] >= n_squared.data[n_squared.length - 1]) {
        random_bytes[n_squared.length - 1] = n_squared.data[n_squared.length - 1] - 1;
    }
    
    // Ensure it's not zero (at least one bit is set)
    random_bytes[0] |= 0x01;
    
    // Create BigInt from random bytes
    BigInt random_bigint = create_bigint(random_bytes, n_squared.length);
    
    // Store the secret key
    g_sk_i = (BigInt*)malloc(sizeof(BigInt));
    if (!g_sk_i) {
        free(random_bytes);
        free_bigint(&n);
        free_bigint(&n_squared);
        free_bigint(&random_bigint);
        return -2; // Memory allocation failed
    }
    
    *g_sk_i = random_bigint;
    
    // Clean up
    free(random_bytes);
    free_bigint(&n);
    free_bigint(&n_squared);
    
    return 0;
}

/**
 * @brief Compute the aggregator's public key pk_A = H^sk_A
 * @param h_data The base element H
 * @param h_length Length of h_data
 * @param sk_a_data The aggregator's secret key
 * @param sk_a_length Length of sk_a_data
 * @param n_data The modulus N component
 * @param n_length Length of n_data
 * @return 0 on success, negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int compute_aggregator_public_key(const uint8_t* h_data, size_t h_length,
                                 const uint8_t* sk_a_data, size_t sk_a_length,
                                 const uint8_t* n_data, size_t n_length) {
    // Clean up any existing public key
    if (g_pk_A) {
        free_bigint_ptr(g_pk_A);
        g_pk_A = NULL;
    }
    
    // Create BigInt objects from the input data
    BigInt h = create_bigint(h_data, h_length);
    BigInt sk_a = create_bigint(sk_a_data, sk_a_length);
    BigInt n = create_bigint(n_data, n_length);
    
    // Calculate N² using plain multiplication
    BigInt n_squared;
    multiply_bigint(&n, &n, &n_squared);
    
    // Compute pk_A = H^sk_A mod N²
    BigInt pk_a;
    int result = modular_exponentiation(&h, &sk_a, &n_squared, &pk_a);
    
    if (result != 0) {
        free_bigint(&h);
        free_bigint(&sk_a);
        free_bigint(&n);
        free_bigint(&n_squared);
        return -1; // Computation failed
    }
    
    // Store the public key
    g_pk_A = (BigInt*)malloc(sizeof(BigInt));
    if (!g_pk_A) {
        free_bigint(&h);
        free_bigint(&sk_a);
        free_bigint(&n);
        free_bigint(&n_squared);
        free_bigint(&pk_a);
        return -2; // Memory allocation failed
    }
    
    *g_pk_A = pk_a;
    
    // Clean up
    free_bigint(&h);
    free_bigint(&sk_a);
    free_bigint(&n);
    free_bigint(&n_squared);
    
    return 0;
}

/**
 * @brief Compute the auxiliary key aux_i = pk_A^sk_i = H^(sk_A * sk_i)
 * @param n_data The modulus N component
 * @param n_length Length of n_data
 * @return 0 on success, negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int compute_auxiliary_key(const uint8_t* n_data, size_t n_length) {
    // Check if sk_i and pk_A are available
    if (!g_sk_i || !g_pk_A) {
        return -1; // Secret key or public key not available
    }
    
    // Clean up any existing auxiliary key
    if (g_aux_i) {
        free_bigint_ptr(g_aux_i);
        g_aux_i = NULL;
    }
    
    // Create BigInt for N
    BigInt n = create_bigint(n_data, n_length);
    
    // Calculate N² using plain multiplication
    BigInt n_squared;
    multiply_bigint(&n, &n, &n_squared);
    
    // Compute aux_i = pk_A^sk_i mod N²
    BigInt aux_i;
    int result = modular_exponentiation(g_pk_A, g_sk_i, &n_squared, &aux_i);
    
    if (result != 0) {
        free_bigint(&n);
        free_bigint(&n_squared);
        return -2; // Computation failed
    }
    
    // Store the auxiliary key
    g_aux_i = (BigInt*)malloc(sizeof(BigInt));
    if (!g_aux_i) {
        free_bigint(&n);
        free_bigint(&n_squared);
        free_bigint(&aux_i);
        return -3; // Memory allocation failed
    }
    
    *g_aux_i = aux_i;
    
    // Clean up
    free_bigint(&n);
    free_bigint(&n_squared);
    
    return 0;
}

/**
 * @brief Encrypt a vote using the formula c_i = (1 + x_i * N) * (H^sk_i) mod N²
 * @param vote_data The vote data x_i
 * @param vote_length Length of vote_data
 * @param h_data The base element H
 * @param h_length Length of h_data
 * @param n_data The modulus N component
 * @param n_length Length of n_data
 * @param result Buffer to store the encrypted result
 * @param result_length Length of the result buffer
 * @return 0 on success, negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int encrypt_vote_paillier(const uint8_t* vote_data, size_t vote_length,
                         const uint8_t* h_data, size_t h_length,
                         const uint8_t* n_data, size_t n_length,
                         uint8_t* result, size_t result_length) {
    // Check if sk_i is available
    if (!g_sk_i) {
        return -1; // Secret key not available
    }
    
    // Create BigInt objects from the input data
    BigInt vote = create_bigint(vote_data, vote_length);
    BigInt h = create_bigint(h_data, h_length);
    BigInt n = create_bigint(n_data, n_length);
    
    // Calculate N² using plain multiplication
    BigInt n_squared;
    multiply_bigint(&n, &n, &n_squared);
    
    // Calculate x_i * N
    BigInt vote_times_n;
    multiply_bigint(&vote, &n, &vote_times_n);
    
    // Create BigInt for 1
    uint8_t one_val = 1;
    BigInt one = create_bigint(&one_val, 1);
    
    // Calculate 1 + x_i * N
    BigInt one_plus_vote_times_n;
    modular_addition(&one, &vote_times_n, &n_squared, &one_plus_vote_times_n);
    
    // Calculate H^sk_i mod N²
    BigInt h_pow_sk_i;
    modular_exponentiation(&h, g_sk_i, &n_squared, &h_pow_sk_i);
    
    // Calculate c_i = (1 + x_i * N) * (H^sk_i) mod N²
    BigInt c_i;
    modular_multiplication(&one_plus_vote_times_n, &h_pow_sk_i, &n_squared, &c_i);
    
    // Copy the result to the output buffer
    if (c_i.length <= result_length) {
        memcpy(result, c_i.data, c_i.length);
    } else {
        // Result buffer is too small
        free_bigint(&vote);
        free_bigint(&h);
        free_bigint(&n);
        free_bigint(&n_squared);
        free_bigint(&vote_times_n);
        free_bigint(&one);
        free_bigint(&one_plus_vote_times_n);
        free_bigint(&h_pow_sk_i);
        free_bigint(&c_i);
        return -2;
    }
    
    // Clean up
    free_bigint(&vote);
    free_bigint(&h);
    free_bigint(&n);
    free_bigint(&n_squared);
    free_bigint(&vote_times_n);
    free_bigint(&one);
    free_bigint(&one_plus_vote_times_n);
    free_bigint(&h_pow_sk_i);
    free_bigint(&c_i);
    
    return 0;
}

/**
 * @brief Get the client's secret key
 * @param result Buffer to copy the secret key into
 * @param result_length Length of the result buffer
 * @return Size of the secret key in bytes, or negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int get_secret_key(uint8_t* result, size_t result_length) {
    if (!g_sk_i) {
        return -1; // No secret key available
    }
    
    if (result_length < g_sk_i->length) {
        return -2; // Buffer too small
    }
    
    // Copy the secret key to the result buffer
    memcpy(result, g_sk_i->data, g_sk_i->length);
    
    return (int)g_sk_i->length;
}

/**
 * @brief Get the aggregator's public key
 * @param result Buffer to copy the public key into
 * @param result_length Length of the result buffer
 * @return Size of the public key in bytes, or negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int get_aggregator_public_key(uint8_t* result, size_t result_length) {
    if (!g_pk_A) {
        return -1; // No public key available
    }
    
    if (result_length < g_pk_A->length) {
        return -2; // Buffer too small
    }
    
    // Copy the public key to the result buffer
    memcpy(result, g_pk_A->data, g_pk_A->length);
    
    return (int)g_pk_A->length;
}

/**
 * @brief Get the auxiliary key
 * @param result Buffer to copy the auxiliary key into
 * @param result_length Length of the result buffer
 * @return Size of the auxiliary key in bytes, or negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int get_auxiliary_key(uint8_t* result, size_t result_length) {
    if (!g_aux_i) {
        return -1; // No auxiliary key available
    }
    
    if (result_length < g_aux_i->length) {
        return -2; // Buffer too small
    }
    
    // Copy the auxiliary key to the result buffer
    memcpy(result, g_aux_i->data, g_aux_i->length);
    
    return (int)g_aux_i->length;
}

/**
 * @brief Clear all cryptographic parameters
 * @return 0 on success
 */
EMSCRIPTEN_KEEPALIVE
int clear_crypto_params() {
    if (g_sk_i) {
        free_bigint_ptr(g_sk_i);
        g_sk_i = NULL;
    }
    
    if (g_pk_A) {
        free_bigint_ptr(g_pk_A);
        g_pk_A = NULL;
    }
    
    if (g_aux_i) {
        free_bigint_ptr(g_aux_i);
        g_aux_i = NULL;
    }
    
    // Clear election parameters
    if (election_params.n) {
        free_bigint_ptr(election_params.n);
        election_params.n = NULL;
    }
    
    if (election_params.h) {
        free_bigint_ptr(election_params.h);
        election_params.h = NULL;
    }
    
    return 0;
}

/**
 * Initialize the cryptographic parameters for election
 * @param n The modulus parameter (N)
 * @param n_len Length of N in bytes
 * @param h The base element parameter (H)
 * @param h_len Length of H in bytes
 * @return 0 on success, negative value on error
 */
EMSCRIPTEN_KEEPALIVE
int initialize_crypto_params(const uint8_t* n, size_t n_len, const uint8_t* h, size_t h_len) {
    // Clear any existing parameters
    clear_crypto_params();
    
    // Initialize parameters from inputs
    election_params.n = malloc(sizeof(BigInt));
    if (!election_params.n) {
        return -1;
    }
    *election_params.n = create_bigint(n, n_len);
    if (!election_params.n->data) {
        free(election_params.n);
        election_params.n = NULL;
        return -1;
    }

    election_params.h = malloc(sizeof(BigInt));
    if (!election_params.h) {
        free_bigint_ptr(election_params.n);
        election_params.n = NULL;
        return -2;
    }
    *election_params.h = create_bigint(h, h_len);
    if (!election_params.h->data) {
        free(election_params.h);
        election_params.h = NULL;
        free_bigint_ptr(election_params.n);
        election_params.n = NULL;
        return -2;
    }
    
    // Log parameter values for debugging
    printf("Initialized N parameter with %zu bytes\n", n_len);
    printf("Initialized H parameter with %zu bytes\n", h_len);
    
    return 0;
}

