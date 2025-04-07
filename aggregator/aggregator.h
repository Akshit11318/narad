#ifndef AGGREGATOR_H
#define AGGREGATOR_H

#include <stdint.h>
#include <stdlib.h>

/**
 * @brief Structure to hold large integers for cryptographic operations
 */
typedef struct {
    uint8_t* data;  // Pointer to the big integer data
    size_t length;  // Length of the data in bytes
} BigInt;

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
 * @brief Multiply all ciphertexts together
 * @param ciphertexts Array of ciphertext BigInts
 * @param count Number of ciphertexts
 * @param params Aggregator parameters
 * @param result Pointer to store the product
 * @return 0 on success, non-zero on failure
 */
int multiply_ciphertexts(const BigInt* ciphertexts, size_t count, 
                         const AggregatorParams* params, BigInt* result);

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
 * @brief Compute the average of votes
 * @param sum The sum of votes
 * @param count Number of votes
 * @param result Pointer to store the average
 * @return 0 on success, non-zero on failure
 */
int compute_average(const BigInt* sum, size_t count, BigInt* result);

/**
 * @brief Aggregate votes in a single operation
 * @param ciphertexts Array of ciphertext BigInts
 * @param count Number of ciphertexts
 * @param aux The auxiliary value from the collector
 * @param params Aggregator parameters
 * @param sum Pointer to store the sum
 * @param average Pointer to store the average (can be NULL if not needed)
 * @return 0 on success, non-zero on failure
 */
int aggregate_votes(const BigInt* ciphertexts, size_t count, const BigInt* aux,
                    const AggregatorParams* params, BigInt* sum, BigInt* average);

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
BigInt create_bigint(const uint8_t* data, size_t length);

/**
 * @brief Free resources used by a BigInt
 * @param big_int Pointer to the BigInt to free
 */
void free_bigint(BigInt* big_int);

#endif /* AGGREGATOR_H */