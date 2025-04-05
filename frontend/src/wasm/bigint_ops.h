#ifndef BIGINT_OPS_H
#define BIGINT_OPS_H

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
 * @brief Create a new BigInt from data
 * @param data Pointer to the data
 * @param length Length of the data in bytes
 * @return The created BigInt
 */
BigInt create_bigint(const uint8_t* data, size_t length);

/**
 * @brief Free the memory allocated for a BigInt
 * @param big_int Pointer to the BigInt to free
 */
void free_bigint(BigInt* big_int);

/**
 * @brief Perform modular exponentiation: result = base^exponent mod modulus
 * @param base The base value
 * @param exponent The exponent value
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int modular_exponentiation(const BigInt* base, const BigInt* exponent, 
                          const BigInt* modulus, BigInt* result);

/**
 * @brief Perform modular multiplication: result = (a * b) mod modulus
 * @param a First operand
 * @param b Second operand
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int modular_multiplication(const BigInt* a, const BigInt* b, 
                           const BigInt* modulus, BigInt* result);

#endif // BIGINT_OPS_H