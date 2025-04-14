#ifndef BIGINT_H
#define BIGINT_H

#include <stdint.h>
#include <stdlib.h>

// this is a header fie which makes the functions available for 
// use in C++ code and compiled as C code
#ifdef __cplusplus
extern "C" {
#endif

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
 * @return -1 if a < b, 0 if a == b, 1 if a > b
 */
int compare_bigint(const BigInt* a, const BigInt* b);

/**
 * @brief Calculate the modular inverse of a BigInt
 * @param a The BigInt to find the inverse of
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int modular_inverse(const BigInt* a, const BigInt* modulus, BigInt* result);

/**
 * @brief Perform modular addition: result = (a + b) mod modulus
 * @param a First operand
 * @param b Second operand
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int modular_addition(const BigInt* a, const BigInt* b,
                     const BigInt* modulus, BigInt* result);

/**
 * @brief Multiply two BigInts: result = a * b
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int multiply_bigint(const BigInt* a, const BigInt* b, BigInt* result);

/**
 * @brief Calculate the modulus of one BigInt by another: result = a mod modulus
 * @param a The BigInt to find the modulus of
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, non-zero on failure
 */
int bigint_mod(const BigInt* a, const BigInt* modulus, BigInt* result);

/**
 * @brief Convert BigInt to hexadecimal string
 * @param bigint Pointer to the BigInt to convert
 * @param hex_str Buffer to store the hex string
 * @param str_size Size of the buffer
 * @return 0 on success, non-zero on failure
 */
int bigint_to_hex_string(const BigInt* bigint, char* hex_str, size_t str_size);

/**
 * @brief Convert hexadecimal string to BigInt
 * @param hex_str The hex string to convert
 * @param bigint Pointer to store the converted BigInt
 * @return 0 on success, non-zero on failure
 */
int hex_string_to_bigint(const char* hex_str, BigInt* bigint);

/**
 * @brief Subtract two BigInts: result = a - b
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int bigint_subtract(const BigInt* a, const BigInt* b, BigInt* result);

/**
 * @brief Divide two BigInts: quotient = a / b, remainder = a % b
 * @param a First operand (dividend)
 * @param b Second operand (divisor)
 * @param quotient Pointer to store the division result
 * @param remainder Pointer to store the remainder
 * @return 0 on success, -1 on invalid parameters, -2 on division by zero
 */
int bigint_divide(const BigInt* a, const BigInt* b, BigInt* quotient, BigInt* remainder);


/**
 * @brief Check if a BigInt is zero
 *
 * @param num Pointer to the BigInt to check
 * @return 1 if the BigInt is zero, 0 otherwise
 */
 int is_zero(const BigInt* num);

 /**
  * @brief Check if a BigInt is negative
  *
  * @param num Pointer to the BigInt to check
  * @return 1 if the BigInt is negative, 0 otherwise
  */
 int is_negative(const BigInt* num);

/**
 * @brief Add two BigInts: result = a + b
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int bigint_add(const BigInt* a, const BigInt* b, BigInt* result);

#ifdef __cplusplus
}
#endif

#endif /* BIGINT_H */