#ifndef COLLECTOR_H
#define COLLECTOR_H

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
} ElectionParams;

/**
 * @brief Initialize the collector module
 * @param params Election parameters
 * @return 0 on success, non-zero on failure
 */
int collector_init(const ElectionParams* params);

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


#endif /* COLLECTOR_H */