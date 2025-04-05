#ifndef BIGINT_OPS_H
#define BIGINT_OPS_H

#include "collector.h"

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

/**
 * @brief Generate a random number that is coprime to the given modulus
 * @param result Pointer to store the generated random number
 * @param modulus The modulus value
 * @return 0 on success, non-zero on failure
 */
int generate_random_coprime(BigInt* result, const BigInt* modulus);

/**
 * @brief Calculate the greatest common divisor (GCD) of two BigInts
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the GCD
 * @return 0 on success, non-zero on failure
 */
int gcd(const BigInt* a, const BigInt* b, BigInt* result);

/**
 * @brief Compare two BigInts
 * @param a First operand
 * @param b Second operand
 * @return 0 if equal, negative if a < b, positive if a > b
 */
int compare_bigint(const BigInt* a, const BigInt* b);

#endif /* BIGINT_OPS_H */