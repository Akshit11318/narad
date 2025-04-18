#include "bigint.h"
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <stdio.h>
#include "tommath.h"

// Internal structure to hold libtommath mp_int data
typedef struct {
    mp_int mp;      // libtommath mp_int structure
} TomMath_BigInt;

// Initialize a new mp_int
static mp_int* init_mp_int() {
    mp_int* mp = (mp_int*)malloc(sizeof(mp_int));
    if (mp) {
        mp_init(mp);
    }
    return mp;
}

// Convert BigInt to libtommath mp_int
static mp_int* bigint_to_mp(const BigInt* big_int) {
    mp_int* mp = init_mp_int();
    if (!mp) {
        return NULL;
    }
    
    if (!big_int || !big_int->data || big_int->length == 0) {
        return mp; // Return a new zero mp_int
    }
    
    // BigInt data is stored in little-endian, need to reverse for mp_read_unsigned_bin
    uint8_t* reversed = (uint8_t*)malloc(big_int->length);
    if (!reversed) {
        mp_clear(mp);
        free(mp);
        return NULL;
    }
    
    for (size_t i = 0; i < big_int->length; i++) {
        reversed[i] = big_int->data[big_int->length - 1 - i];
    }
    
    if (mp_from_ubin(mp, reversed, big_int->length) != MP_OKAY) {
        free(reversed);
        mp_clear(mp);
        free(mp);
        return NULL;
    }
    
    free(reversed);
    return mp;
}

// Convert libtommath mp_int to BigInt
static BigInt mp_to_bigint(const mp_int* mp) {
    BigInt result;
    
    if (!mp) {
        result.data = NULL;
        result.length = 0;
        return result;
    }
    
    int mp_size = (int)mp_ubin_size((mp_int*)mp);
    if (mp_size <= 0) {
        // Handle zero or error case
        uint8_t zero = 0;
        return create_bigint(&zero, 1);
    }
    
    uint8_t* temp = (uint8_t*)malloc(mp_size);
    if (!temp) {
        result.data = NULL;
        result.length = 0;
        return result;
    }
    
    size_t written = 0;
    if (mp_to_ubin((mp_int*)mp, temp, mp_size, &written) != MP_OKAY) {
        free(temp);
        result.data = NULL;
        result.length = 0;
        return result;
    }
    
    // Reverse byte order (big-endian to little-endian)
    result.length = mp_size;
    result.data = (uint8_t*)malloc(mp_size);
    
    if (!result.data) {
        free(temp);
        result.length = 0;
        return result;
    }
    
    for (int i = 0; i < mp_size; i++) {
        result.data[i] = temp[mp_size - 1 - i];
    }
    
    free(temp);
    return result;
}

/*
 * @brief Create a new BigInt from data
 *
 * This function allocates memory for a new BigInt and copies the provided data.
 * The caller is responsible for freeing the memory using free_bigint when done.
 *
 * @param data Pointer to the byte array containing the big integer data
 * @param length Length of the data in bytes
 * @return A new BigInt structure containing a copy of the provided data
 */
BigInt create_bigint(const uint8_t* data, size_t length) {
    BigInt result;
    result.length = length;
    result.data = (uint8_t*)malloc(length);
    
    if (result.data) {
        if (data) {
            memcpy(result.data, data, length);
        } else {
            // Initialize to zero if data is NULL
            memset(result.data, 0, length);
        }
    } else {
        // Handle allocation failure
        result.length = 0;
        result.data = NULL;
    }
    
    return result;
}

/**
 * @brief Free the memory allocated for a BigInt
 *
 * This function releases the memory allocated for a BigInt's data and
 * resets its length to zero. It safely handles NULL pointers.
 *
 * @param big_int Pointer to the BigInt to free
 */
void free_bigint(BigInt* big_int) {
    if (big_int && big_int->data) {
        free(big_int->data);
        big_int->data = NULL;
        big_int->length = 0;
    }
}

/**
 * @brief Implementation of modular exponentiation using libtommath
 *
 * This function calculates (base^exponent) mod modulus efficiently using
 * libtommath's mp_exptmod function.
 *
 * @param base The base value to be raised to a power
 * @param exponent The power to which the base is raised
 * @param modulus The modulus for the operation
 * @param result Pointer to store the result of (base^exponent) mod modulus
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int modular_exponentiation(const BigInt* base, const BigInt* exponent, 
                          const BigInt* modulus, BigInt* result) {
    if (!base || !exponent || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_base = bigint_to_mp(base);
    mp_int *mp_exp = bigint_to_mp(exponent);
    mp_int *mp_mod = bigint_to_mp(modulus);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_base || !mp_exp || !mp_mod || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_base) { mp_clear(mp_base); free(mp_base); }
        if (mp_exp) { mp_clear(mp_exp); free(mp_exp); }
        if (mp_mod) { mp_clear(mp_mod); free(mp_mod); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    int status = mp_exptmod(mp_base, mp_exp, mp_mod, mp_result);
    
    if (status != MP_OKAY) {
        // Operation failed
        mp_clear(mp_base); free(mp_base);
        mp_clear(mp_exp); free(mp_exp);
        mp_clear(mp_mod); free(mp_mod);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_base); free(mp_base);
    mp_clear(mp_exp); free(mp_exp);
    mp_clear(mp_mod); free(mp_mod);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Implementation of modular multiplication using libtommath
 *
 * This function calculates (a * b) mod modulus using libtommath's mp_mulmod function.
 *
 * @param a First operand
 * @param b Second operand
 * @param modulus The modulus for the operation
 * @param result Pointer to store the result of (a * b) mod modulus
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int modular_multiplication(const BigInt* a, const BigInt* b, 
                           const BigInt* modulus, BigInt* result) {
    if (!a || !b || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_mod = bigint_to_mp(modulus);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_mod || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_mod) { mp_clear(mp_mod); free(mp_mod); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    int status = mp_mulmod(mp_a, mp_b, mp_mod, mp_result);
    
    if (status != MP_OKAY) {
        // Operation failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_mod); free(mp_mod);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_mod); free(mp_mod);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Perform modular addition: result = (a + b) mod modulus
 *
 * This function adds two BigInts and performs modular reduction using libtommath.
 *
 * @param a First operand
 * @param b Second operand
 * @param modulus The modulus for the operation
 * @param result Pointer to store the result of (a + b) mod modulus
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int modular_addition(const BigInt* a, const BigInt* b,
                     const BigInt* modulus, BigInt* result) {
    if (!a || !b || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_modulus = bigint_to_mp(modulus);
    mp_int *mp_result = init_mp_int();
    mp_int *mp_temp = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_modulus || !mp_result || !mp_temp) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_modulus) { mp_clear(mp_modulus); free(mp_modulus); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        if (mp_temp) { mp_clear(mp_temp); free(mp_temp); }
        return -2; // Memory allocation failure
    }
    
    // Perform addition: temp = a + b
    if (mp_add(mp_a, mp_b, mp_temp) != MP_OKAY) {
        // Addition failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_modulus); free(mp_modulus);
        mp_clear(mp_result); free(mp_result);
        mp_clear(mp_temp); free(mp_temp);
        return -2;
    }
    
    // Perform modular reduction: result = temp mod modulus
    if (mp_mod(mp_temp, mp_modulus, mp_result) != MP_OKAY) {
        // Modular reduction failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_modulus); free(mp_modulus);
        mp_clear(mp_result); free(mp_result);
        mp_clear(mp_temp); free(mp_temp);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_modulus); free(mp_modulus);
    mp_clear(mp_result); free(mp_result);
    mp_clear(mp_temp); free(mp_temp);
    
    return 0;
}

/**
 * @brief Generate a random number that is coprime to the given modulus
 *
 * This function generates a random number and ensures it is coprime to the modulus
 * by checking that their greatest common divisor (GCD) is 1.
 *
 * @param result Pointer to store the generated random number
 * @param modulus The modulus value
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int generate_random_coprime(BigInt* result, const BigInt* modulus) {
    if (!result || !modulus) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_modulus = bigint_to_mp(modulus);
    mp_int *mp_result = init_mp_int();
    mp_int *mp_gcdiv = init_mp_int();
    mp_int *mp_one = init_mp_int();
    
    if (!mp_modulus || !mp_result || !mp_gcdiv || !mp_one) {
        // Clean up allocated mp_ints
        if (mp_modulus) { mp_clear(mp_modulus); free(mp_modulus); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        if (mp_gcdiv) { mp_clear(mp_gcdiv); free(mp_gcdiv); }
        if (mp_one) { mp_clear(mp_one); free(mp_one); }
        return -2; // Memory allocation failure
    }
    
    // Set mp_one to 1
    mp_set(mp_one, 1);
    
    // Initialize random seed
    srand(time(NULL));
    
    int is_coprime = 0;
    int max_attempts = 100; // Prevent infinite loop
    int attempts = 0;
    
    while (!is_coprime && attempts < max_attempts) {
        attempts++;
        
        // Generate a random number less than modulus
        if (mp_rand(mp_result, mp_count_bits(mp_modulus)) != MP_OKAY) {
            // Random generation failed
            mp_clear(mp_modulus); free(mp_modulus);
            mp_clear(mp_result); free(mp_result);
            mp_clear(mp_gcdiv); free(mp_gcdiv);
            mp_clear(mp_one); free(mp_one);
            return -2;
        }
        
        // Ensure the number is less than modulus
        if (mp_cmp(mp_result, mp_modulus) != MP_LT) {
            if (mp_mod(mp_result, mp_modulus, mp_result) != MP_OKAY) {
                continue;
            }
        }
        
        // Ensure the number is not zero
        if (mp_cmp_d(mp_result, 0) == MP_EQ) {
            continue;
        }
        
        // Calculate GCD
        if (mp_gcd(mp_result, mp_modulus, mp_gcdiv) != MP_OKAY) {
            // GCD calculation failed
            mp_clear(mp_modulus); free(mp_modulus);
            mp_clear(mp_result); free(mp_result);
            mp_clear(mp_gcdiv); free(mp_gcdiv);
            mp_clear(mp_one); free(mp_one);
            return -2;
        }
        
        // Check if GCD is 1 (numbers are coprime)
        if (mp_cmp(mp_gcdiv, mp_one) == MP_EQ) {
            is_coprime = 1;
        }
    }
    
    if (!is_coprime) {
        // Failed to find a coprime after max attempts
        mp_clear(mp_modulus); free(mp_modulus);
        mp_clear(mp_result); free(mp_result);
        mp_clear(mp_gcdiv); free(mp_gcdiv);
        mp_clear(mp_one); free(mp_one);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_modulus); free(mp_modulus);
    mp_clear(mp_result); free(mp_result);
    mp_clear(mp_gcdiv); free(mp_gcdiv);
    mp_clear(mp_one); free(mp_one);
    
    return 0;
}

/**
 * @brief Calculate the greatest common divisor (GCD) of two BigInts
 *
 * This function implements the Euclidean algorithm to find the GCD of two BigInts.
 *
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the GCD
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int gcd(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    // Calculate GCD
    if (mp_gcd(mp_a, mp_b, mp_result) != MP_OKAY) {
        // GCD calculation failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Compare two BigInts
 *
 * This function compares two BigInts and returns -1 if a < b, 0 if a == b, and 1 if a > b.
 *
 * @param a First operand
 * @param b Second operand
 * @return -1 if a < b, 0 if a == b, 1 if a > b
 */
int compare_bigint(const BigInt* a, const BigInt* b) {
    if (!a || !b) {
        return 0; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    
    if (!mp_a || !mp_b) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        return 0; // Memory allocation failure
    }
    
    int result = mp_cmp(mp_a, mp_b);
    
    // Convert libtommath comparison result to our expected format
    // MP_LT = -1, MP_EQ = 0, MP_GT = 1
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    
    return result;
}

/**
 * @brief Calculate the modular inverse of a BigInt
 *
 * This function calculates the modular inverse of a BigInt using libtommath's mp_invmod.
 *
 * @param a The BigInt to find the inverse of
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 if inverse does not exist
 */
int modular_inverse(const BigInt* a, const BigInt* modulus, BigInt* result) {
    if (!a || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_mod = bigint_to_mp(modulus);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_mod || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_mod) { mp_clear(mp_mod); free(mp_mod); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    // Calculate modular inverse
    int status = mp_invmod(mp_a, mp_mod, mp_result);
    
    if (status != MP_OKAY) {
        // Inverse does not exist or calculation failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_mod); free(mp_mod);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_mod); free(mp_mod);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Multiply two BigInts: result = a * b
 *
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int multiply_bigint(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    // Perform multiplication
    if (mp_mul(mp_a, mp_b, mp_result) != MP_OKAY) {
        // Multiplication failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Calculate the modulus of one BigInt by another: result = a mod modulus
 *
 * @param a The BigInt to find the modulus of
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int bigint_mod(const BigInt* a, const BigInt* modulus, BigInt* result) {
    if (!a || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_modulus = bigint_to_mp(modulus);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_modulus || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_modulus) { mp_clear(mp_modulus); free(mp_modulus); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    // Perform modular reduction
    if (mp_mod(mp_a, mp_modulus, mp_result) != MP_OKAY) {
        // Modular reduction failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_modulus); free(mp_modulus);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_modulus); free(mp_modulus);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Convert BigInt to hexadecimal string
 *
 * @param bigint Pointer to the BigInt to convert
 * @param hex_str Buffer to store the hex string
 * @param str_size Size of the buffer
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int bigint_to_hex_string(const BigInt* bigint, char* hex_str, size_t str_size) {
    if (!bigint || !hex_str || str_size == 0) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp = bigint_to_mp(bigint);
    if (!mp) {
        return -2; // Conversion failed
    }
    
    // Get the required size for the hex string
    int required_size_int;
    if (mp_radix_size(mp, 16, (size_t*)&required_size_int) != MP_OKAY) {
        mp_clear(mp);
        free(mp);
        return -2; // Failed to get radix size
    }
    size_t required_size = (size_t)required_size_int;

    if (required_size == 0 || required_size > str_size) {
        mp_clear(mp);
        free(mp);
        return -2; // Buffer too small or conversion failed
    }
    
    // Convert to hex string
    size_t written = 0;
    if (mp_to_radix(mp, hex_str, str_size, &written, 16) != MP_OKAY) {
        mp_clear(mp);
        free(mp);
        return -2; // Conversion failed
    }
    
    // Clean up
    mp_clear(mp);
    free(mp);
    
    return 0;
}

/**
 * @brief Convert hexadecimal string to BigInt
 *
 * @param hex_str The hex string to convert
 * @param bigint Pointer to store the converted BigInt
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int hex_string_to_bigint(const char* hex_str, BigInt* bigint) {
    if (!hex_str || !bigint) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp = init_mp_int();
    if (!mp) {
        return -2; // Memory allocation failed
    }
    
    // Convert hex string to mp_int
    if (mp_read_radix(mp, hex_str, 16) != MP_OKAY) {
        mp_clear(mp);
        free(mp);
        return -2; // Conversion failed
    }
    
    // Convert mp_int to BigInt
    *bigint = mp_to_bigint(mp);
    
    // Clean up
    mp_clear(mp);
    free(mp);
    
    return 0;
}

/**
 * @brief Subtract two BigInts: result = a - b
 *
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int bigint_subtract(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    // Perform subtraction
    if (mp_sub(mp_a, mp_b, mp_result) != MP_OKAY) {
        // Subtraction failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}

/**
 * @brief Divide two BigInts: quotient = a / b, remainder = a % b
 *
 * @param a First operand (dividend)
 * @param b Second operand (divisor)
 * @param quotient Pointer to store the division result
 * @param remainder Pointer to store the remainder
 * @return 0 on success, -1 on invalid parameters, -2 on division by zero
 */
int bigint_divide(const BigInt* a, const BigInt* b, BigInt* quotient, BigInt* remainder) {
    if (!a || !b || !quotient || !remainder) {
        return -1; // Invalid parameters
    }
    
    // Check for division by zero
    if (is_zero(b)) {
        return -2; // Division by zero
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_quotient = init_mp_int();
    mp_int *mp_remainder = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_quotient || !mp_remainder) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_quotient) { mp_clear(mp_quotient); free(mp_quotient); }
        if (mp_remainder) { mp_clear(mp_remainder); free(mp_remainder); }
        return -2; // Memory allocation failure
    }
    
    // Perform division
    if (mp_div(mp_a, mp_b, mp_quotient, mp_remainder) != MP_OKAY) {
        // Division failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_quotient); free(mp_quotient);
        mp_clear(mp_remainder); free(mp_remainder);
        return -2;
    }
    
    // Convert results back to BigInt
    *quotient = mp_to_bigint(mp_quotient);
    *remainder = mp_to_bigint(mp_remainder);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_quotient); free(mp_quotient);
    mp_clear(mp_remainder); free(mp_remainder);
    
    return 0;
}

/**
 * @brief Check if a BigInt is zero
 *
 * @param num Pointer to the BigInt to check
 * @return 1 if the BigInt is zero, 0 otherwise
 */
int is_zero(const BigInt* num) {
    if (!num || !num->data || num->length == 0) {
        return 1; // Treat NULL or empty as zero
    }
    
    mp_int *mp = bigint_to_mp(num);
    if (!mp) {
        return 1; // Conversion failed, treat as zero
    }
    
    int result = (mp_cmp_d(mp, 0) == MP_EQ) ? 1 : 0;
    
    // Clean up
    mp_clear(mp);
    free(mp);
    
    return result;
}

/**
 * @brief Check if a BigInt is negative
 *
 * @param num Pointer to the BigInt to check
 * @return 1 if the BigInt is negative, 0 otherwise
 */
int is_negative(const BigInt* num) {
    if (!num || !num->data || num->length == 0) {
        return 0; // Treat NULL or empty as non-negative
    }
    
    // In our implementation, BigInt is stored in little-endian format
    // Check if the most significant bit is set (indicating negative in two's complement)
    return (num->data[num->length - 1] & 0x80) != 0;
}

/**
 * @brief Add two BigInts: result = a + b
 *
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on operation failure
 */
int bigint_add(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    mp_int *mp_a = bigint_to_mp(a);
    mp_int *mp_b = bigint_to_mp(b);
    mp_int *mp_result = init_mp_int();
    
    if (!mp_a || !mp_b || !mp_result) {
        // Clean up allocated mp_ints
        if (mp_a) { mp_clear(mp_a); free(mp_a); }
        if (mp_b) { mp_clear(mp_b); free(mp_b); }
        if (mp_result) { mp_clear(mp_result); free(mp_result); }
        return -2; // Memory allocation failure
    }
    
    // Perform addition
    if (mp_add(mp_a, mp_b, mp_result) != MP_OKAY) {
        // Addition failed
        mp_clear(mp_a); free(mp_a);
        mp_clear(mp_b); free(mp_b);
        mp_clear(mp_result); free(mp_result);
        return -2;
    }
    
    // Convert result back to BigInt
    *result = mp_to_bigint(mp_result);
    
    // Clean up
    mp_clear(mp_a); free(mp_a);
    mp_clear(mp_b); free(mp_b);
    mp_clear(mp_result); free(mp_result);
    
    return 0;
}





