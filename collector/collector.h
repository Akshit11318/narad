#ifndef COLLECTOR_H
#define COLLECTOR_H

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
 * @brief Structure to hold collector's public key
 */
typedef struct {
    BigInt public_key;   // Collector's public key (pk_A = H^sk_A)
} CollectorPublicKey;

/**
 * @brief Structure to hold election parameters
 */
typedef struct {
    BigInt N;        // The modulus N = p*q
    BigInt N_squared; // N^2
    BigInt H;        // The hash function output in Z_N^2*
} ElectionParams;

/**
 * @brief Initialize the collector module
 * @param params Election parameters
 * @return 0 on success, non-zero on failure
 */
int collector_init(const ElectionParams* params);

/**
 * @brief Initialize the collector with a public key
 * @param public_key The collector's public key
 * @return 0 on success, non-zero on failure
 */
int collector_set_public_key(const BigInt* public_key);

/**
 * @brief Process an auxiliary value from a user in real-time
 * @param aux_i The auxiliary value from user i
 * @return 0 on success, non-zero on failure
 */
int process_auxiliary_value_realtime(const BigInt* aux_i);

/**
 * @brief Get the current running product of auxiliary values
 * @param result Pointer to store the current running product
 * @return 0 on success, non-zero on failure
 */
int get_current_auxiliary_product(BigInt* result);

/**
 * @brief Reset the running product of auxiliary values to 1
 * @return 0 on success, non-zero on failure
 */
int reset_auxiliary_product(void);

/**
 * @brief Clean up resources used by the collector
 * @return 0 on success, non-zero on failure
 */
int collector_cleanup(void);

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

#endif /* COLLECTOR_H */