#ifndef AGGREGATOR_H
#define AGGREGATOR_H

#include <stdint.h>
#include <stdlib.h>
#include "bigint_ops.h"

/**
 * @brief Structure to hold election parameters
 */
typedef struct {
    BigInt N;        // The modulus N = p*q
    BigInt N_squared; // N^2
    BigInt H;        // The hash function output in Z_N^2*
    BigInt sk_A;     // Aggregator's secret key
    BigInt sk_A_mod_N; // sk_A mod N
    BigInt sk_A_inv;  // Inverse of sk_A mod N
    BigInt running_product; // Running product of ciphertexts
} AggregatorParams;

/**
 * @brief Initialize the aggregator module
 * @param params Pointer to store the initialized parameters
 * @param N The modulus N
 * @param H The hash function output
 * @param sk_A The aggregator's secret key
 * @return 0 on success, non-zero on failure
 */
int aggregator_init(AggregatorParams* params, const BigInt* N, const BigInt* H, const BigInt* sk_A);

/**
 * @brief Add a single ciphertext to the running product
 * @param ciphertext The ciphertext to add to the running product
 * @param params Aggregator parameters
 * @return 0 on success, non-zero on failure
 */
int add_ciphertext_to_product(const BigInt* ciphertext, AggregatorParams* params);

/**
 * @brief Reset the running product to 1
 * @param params Aggregator parameters
 * @return 0 on success, non-zero on failure
 */
int reset_running_product(AggregatorParams* params);

/**
 * @brief Get the current running product
 * @param params Aggregator parameters
 * @param result Pointer to store the running product
 * @return 0 on success, non-zero on failure
 */
int get_running_product(const AggregatorParams* params, BigInt* result);

/**
 * @brief Raise the product of ciphertexts to the power of sk_A
 * @param product The product of ciphertexts
 * @param params Aggregator parameters
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int raise_to_sk_A(const BigInt* product, const AggregatorParams* params, BigInt* result);

/**
 * @brief Divide out the mask using the auxiliary value
 * @param P The result from raise_to_sk_A
 * @param aux The auxiliary value from the collector
 * @param params Aggregator parameters
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int divide_out_mask(const BigInt* P, const BigInt* aux, 
                    const AggregatorParams* params, BigInt* result);

/**
 * @brief Recover the sum of votes
 * @param P_prime The result from divide_out_mask
 * @param params Aggregator parameters
 * @param result Pointer to store the sum
 * @return 0 on success, non-zero on failure
 */
int recover_sum(const BigInt* P_prime, const AggregatorParams* params, BigInt* result);

/**
 * @brief Aggregate votes using the running product
 * @param aux The auxiliary value from the collector
 * @param params Aggregator parameters
 * @param sum Pointer to store the sum
 * @return 0 on success, non-zero on failure
 */
int aggregate_votes_from_running_product(const BigInt* aux, AggregatorParams* params, BigInt* sum);

/**
 * @brief Unpack votes from a BigInt result
 * @param packed_votes The BigInt containing packed votes
 * @param votes Array to store the unpacked votes
 * @param max_votes Maximum number of votes to unpack
 * @return Number of votes unpacked, or negative value on error
 */
int unpack_votes(const BigInt* packed_votes, uint32_t* votes, size_t max_votes);

/**
 * @brief Clean up resources used by the aggregator
 * @param params Aggregator parameters to clean up
 * @return 0 on success, non-zero on failure
 */
int aggregator_cleanup(AggregatorParams* params);

/**
 * @brief Utility function to create a BigInt from a byte array
 * @param data Pointer to the byte array
 * @param length Length of the byte array
 * @return Initialized BigInt structure
 */

#endif /* AGGREGATOR_H */