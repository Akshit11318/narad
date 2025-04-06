#ifndef CRYPTO_VOTING_H
#define CRYPTO_VOTING_H

#include "bigint_ops.h"
#include <stdint.h>
#include <stdlib.h>

/**
 * @brief Generate a random secret key sk_i in the range [1, N²]
 * @param n_data The modulus N component
 * @param n_length Length of n_data
 * @return 0 on success, negative value on error
 */
int generate_secret_key(const uint8_t* n_data, size_t n_length);

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
int compute_aggregator_public_key(const uint8_t* h_data, size_t h_length,
                                 const uint8_t* sk_a_data, size_t sk_a_length,
                                 const uint8_t* n_data, size_t n_length);

/**
 * @brief Compute the auxiliary key aux_i = pk_A^sk_i = H^(sk_A * sk_i)
 * @param n_data The modulus N component
 * @param n_length Length of n_data
 * @return 0 on success, negative value on error
 */
int compute_auxiliary_key(const uint8_t* n_data, size_t n_length);

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
int encrypt_vote_paillier(const uint8_t* vote_data, size_t vote_length,
                         const uint8_t* h_data, size_t h_length,
                         const uint8_t* n_data, size_t n_length,
                         uint8_t* result, size_t result_length);

/**
 * @brief Get the client's secret key
 * @param result Buffer to copy the secret key into
 * @param result_length Length of the result buffer
 * @return Size of the secret key in bytes, or negative value on error
 */
int get_secret_key(uint8_t* result, size_t result_length);

/**
 * @brief Get the aggregator's public key
 * @param result Buffer to copy the public key into
 * @param result_length Length of the result buffer
 * @return Size of the public key in bytes, or negative value on error
 */
int get_aggregator_public_key(uint8_t* result, size_t result_length);

/**
 * @brief Get the auxiliary key
 * @param result Buffer to copy the auxiliary key into
 * @param result_length Length of the result buffer
 * @return Size of the auxiliary key in bytes, or negative value on error
 */
int get_auxiliary_key(uint8_t* result, size_t result_length);

/**
 * @brief Clean up all cryptographic parameters
 * @return 0 on success
 */
int clear_crypto_params();

#endif // CRYPTO_VOTING_H