#include "bigint.h"
#include <string.h>
#include <stdlib.h>
#include <time.h>
#include <stdio.h>
#include <string.h>

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
 * @brief Implementation of modular exponentiation using the square-and-multiply algorithm
 *
 * This function calculates (base^exponent) mod modulus efficiently using the
 * square-and-multiply algorithm, which processes the exponent bit by bit.
 * The time complexity is O(log n) where n is the number of bits in the exponent.
 *
 * @param base The base value to be raised to a power
 * @param exponent The power to which the base is raised
 * @param modulus The modulus for the operation
 * @param result Pointer to store the result of (base^exponent) mod modulus
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int modular_exponentiation(const BigInt* base, const BigInt* exponent, 
                          const BigInt* modulus, BigInt* result) {
    if (!base || !exponent || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    // Initialize result to 1
    uint8_t one_val = 1;
    BigInt one = create_bigint(&one_val, 1);
    
    // Create a copy of the base for calculations
    BigInt base_copy = create_bigint(base->data, base->length);
    
    // Create a temporary result
    BigInt temp_result = create_bigint(one.data, one.length);
    
    // For each bit in the exponent
    for (size_t i = 0; i < exponent->length * 8; i++) {
        size_t byte_idx = i / 8;
        size_t bit_idx = i % 8;
        
        // If the current bit is set
        if (byte_idx < exponent->length && 
            (exponent->data[exponent->length - 1 - byte_idx] & (1 << bit_idx))) {
            // result = (result * base) % modulus
            modular_multiplication(&temp_result, &base_copy, modulus, &temp_result);
        }
        
        // Square the base: base = (base * base) % modulus
        modular_multiplication(&base_copy, &base_copy, modulus, &base_copy);
    }
    
    // Copy the result
    *result = create_bigint(temp_result.data, temp_result.length);
    
    // Clean up
    free_bigint(&one);
    free_bigint(&base_copy);
    free_bigint(&temp_result);
    
    return 0;
}

/**
 * @brief Implementation of modular multiplication
 *
 * This function calculates (a * b) mod modulus. It first multiplies the two
 * numbers and then performs modular reduction.
 *
 * @param a First operand
 * @param b Second operand
 * @param modulus The modulus for the operation
 * @param result Pointer to store the result of (a * b) mod modulus
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int modular_multiplication(const BigInt* a, const BigInt* b, 
                           const BigInt* modulus, BigInt* result) {
    if (!a || !b || !modulus || !result) {
        fprintf(stderr, "[ERROR] Invalid parameters in modular_multiplication\n");
        return -1; // Invalid parameters
    }
    
    fprintf(stderr, "[DEBUG] Starting modular_multiplication: a(%zu bytes), b(%zu bytes), modulus(%zu bytes)\n", 
            a->length, b->length, modulus->length);
    
    // Allocate memory for the product (needs twice the size)
    // Ensure we allocate enough space - use max of (a+b length) or (2*modulus length)
    size_t product_len = a->length + b->length;
    if (modulus->length * 2 > product_len) {
        product_len = modulus->length * 2;
    }
    
    fprintf(stderr, "[DEBUG] Allocating %zu bytes for product\n", product_len);
    uint8_t* product = (uint8_t*)calloc(product_len, 1);
    
    if (!product) {
        fprintf(stderr, "[ERROR] Memory allocation failed in modular_multiplication\n");
        return -1; // Memory allocation failed
    }
    
    // Multiply the two numbers (simplified - not efficient for large numbers)
    fprintf(stderr, "[DEBUG] Starting multiplication loop\n");
    for (size_t i = 0; i < a->length; i++) {
        uint16_t carry = 0;
        for (size_t j = 0; j < b->length || carry; j++) {
            uint16_t current = 0;
            
            // Make sure we don't access out of bounds memory
            if (i + j < product_len) {
                current = product[i + j];
                
                if (j < b->length) {
                    current += (uint16_t)a->data[i] * b->data[j];
                }
                
                current += carry;
                product[i + j] = current & 0xFF;
                carry = current >> 8;
            } else {
                // If we would overflow, break
                break;
            }
        }
    }
    fprintf(stderr, "[DEBUG] Multiplication completed\n");
    
    // For now, we'll just create a BigInt from the product
    BigInt product_bigint;
    product_bigint.data = product;
    product_bigint.length = product_len;
    
    // Remove leading zeros
    while (product_bigint.length > 1 && product_bigint.data[product_bigint.length - 1] == 0) {
        product_bigint.length--;
    }
    
    fprintf(stderr, "[DEBUG] Starting modular reduction, product length: %zu bytes\n", product_bigint.length);
    
    // Use bigint_mod function for efficient modular reduction
    int reduction_count = 0;
    
    // Check if product is already smaller than modulus
    if (compare_bigint(&product_bigint, modulus) < 0) {
        fprintf(stderr, "[DEBUG] Product already smaller than modulus, skipping reduction\n");
    } else {
        // Use the bigint_mod function which implements a more efficient algorithm
        BigInt mod_result;
        int mod_status = bigint_mod(&product_bigint, modulus, &mod_result);
        
        if (mod_status != 0) {
            fprintf(stderr, "[ERROR] Failed to perform modular reduction: %d\n", mod_status);
            free(product_bigint.data);
            return -2; // Failed modular reduction
        }
        
        // Free the original product and replace with the modular result
        free(product_bigint.data);
        product_bigint = mod_result;
        
        fprintf(stderr, "[DEBUG] Modular reduction completed successfully\n");
    }
    
    fprintf(stderr, "[DEBUG] Modular reduction completed after %d iterations\n", reduction_count);
    
    // Copy the result
    *result = create_bigint(product_bigint.data, product_bigint.length);
    
    // Clean up
    free(product_bigint.data);
    
    fprintf(stderr, "[DEBUG] modular_multiplication completed successfully\n");
    return 0;
}

/**
 * @brief Perform modular addition: result = (a + b) mod modulus
 *
 * This function adds two BigInts and performs modular reduction.
 *
 * @param a First operand
 * @param b Second operand
 * @param modulus The modulus for the operation
 * @param result Pointer to store the result of (a + b) mod modulus
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int modular_addition(const BigInt* a, const BigInt* b,
                     const BigInt* modulus, BigInt* result) {
    if (!a || !b || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    // Determine the maximum length needed for the sum
    size_t max_length = (a->length > b->length) ? a->length : b->length;
    max_length++; // Add 1 for potential carry
    
    // Allocate memory for the sum
    uint8_t* sum = (uint8_t*)calloc(max_length, 1);
    if (!sum) {
        return -1; // Memory allocation failed
    }
    
    // Perform addition
    uint8_t carry = 0;
    for (size_t i = 0; i < max_length; i++) {
        uint16_t current = carry;
        
        if (i < a->length) {
            current += a->data[i];
        }
        
        if (i < b->length) {
            current += b->data[i];
        }
        
        sum[i] = current & 0xFF;
        carry = current >> 8;
    }
    
    // Determine the actual length of the sum (remove leading zeros)
    size_t actual_length = max_length;
    while (actual_length > 1 && sum[actual_length - 1] == 0) {
        actual_length--;
    }
    
    // Create a temporary BigInt for the sum
    BigInt temp_sum = create_bigint(sum, actual_length);
    free(sum); // Free the original sum array
    
    // Perform modular reduction
    while (compare_bigint(&temp_sum, modulus) >= 0) {
        // Subtract modulus from sum
        BigInt temp = create_bigint(NULL, temp_sum.length);
        if (!temp.data) {
            free_bigint(&temp_sum);
            return -1; // Memory allocation failed
        }
        
        // Perform subtraction: temp = temp_sum - modulus
        int borrow = 0;
        for (size_t i = 0; i < temp_sum.length; i++) {
            int diff = temp_sum.data[i] - (i < modulus->length ? modulus->data[i] : 0) - borrow;
            if (diff < 0) {
                diff += 256; // Add base (256 for bytes)
                borrow = 1;
            } else {
                borrow = 0;
            }
            temp.data[i] = (uint8_t)diff;
        }
        
        // Remove leading zeros
        while (temp.length > 1 && temp.data[temp.length - 1] == 0) {
            temp.length--;
        }
        
        free_bigint(&temp_sum);
        temp_sum = temp;
    }
    
    // Copy the result
    *result = create_bigint(temp_sum.data, temp_sum.length);
    
    // Clean up
    free_bigint(&temp_sum);
    
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
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int generate_random_coprime(BigInt* result, const BigInt* modulus) {
    if (!result || !modulus) {
        return -1; // Invalid parameters
    }
    
    // Seed the random number generator
    // In a secure implementation, this would use a cryptographically secure RNG
    srand((unsigned int)time(NULL));
    
    // Allocate memory for the random number
    result->length = modulus->length;
    result->data = (uint8_t*)malloc(result->length);
    
    if (!result->data) {
        return -1; // Memory allocation failed
    }
    
    BigInt gcd_result;
    int is_coprime = 0;
    
    // Keep generating random numbers until we find one that is coprime to the modulus
    while (!is_coprime) {
        // Generate a random number
        for (size_t i = 0; i < result->length; i++) {
            result->data[i] = (uint8_t)rand();
        }
        
        // Ensure the number is less than the modulus
        while (compare_bigint(result, modulus) >= 0) {
            // Divide by 2 (shift right)
            for (size_t i = 0; i < result->length; i++) {
                result->data[i] >>= 1;
            }
        }
        
        // Check if the number is coprime to the modulus
        if (gcd(result, modulus, &gcd_result) == 0) {
            // If GCD is 1, the numbers are coprime
            uint8_t one_val = 1;
            BigInt one = create_bigint(&one_val, 1);
            
            if (compare_bigint(&gcd_result, &one) == 0) {
                is_coprime = 1;
            }
            
            free_bigint(&one);
            free_bigint(&gcd_result);
        }
    }
    
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
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int gcd(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    // Create copies of a and b
    BigInt a_copy = create_bigint(a->data, a->length);
    BigInt b_copy = create_bigint(b->data, b->length);
    
    // Euclidean algorithm
    while (b_copy.length > 1 || (b_copy.length == 1 && b_copy.data[0] != 0)) {
        // Perform a % b using repeated subtraction (inefficient but functional)
        while (compare_bigint(&a_copy, &b_copy) >= 0) {
            // Subtract b from a
            BigInt temp = create_bigint(NULL, a_copy.length);
            if (!temp.data) {
                free_bigint(&a_copy);
                free_bigint(&b_copy);
                return -1; // Memory allocation failed
            }
            
            // Perform subtraction: temp = a_copy - b_copy
            int borrow = 0;
            for (size_t i = 0; i < a_copy.length; i++) {
                int diff = a_copy.data[i] - (i < b_copy.length ? b_copy.data[i] : 0) - borrow;
                if (diff < 0) {
                    diff += 256; // Add base (256 for bytes)
                    borrow = 1;
                } else {
                    borrow = 0;
                }
                temp.data[i] = (uint8_t)diff;
            }
            
            // Remove leading zeros
            while (temp.length > 1 && temp.data[temp.length - 1] == 0) {
                temp.length--;
            }
            
            free_bigint(&a_copy);
            a_copy = temp;
        }
        
        // Swap a and b
        BigInt temp = a_copy;
        a_copy = b_copy;
        b_copy = temp;
        
        // Reset temp to avoid double free
        temp.data = NULL;
        temp.length = 0;
    }
    
    // Copy the result (a is the GCD)
    *result = create_bigint(a_copy.data, a_copy.length);
    
    // Clean up
    free_bigint(&a_copy);
    free_bigint(&b_copy);
    
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
    
    // Compare lengths first
    if (a->length < b->length) {
        return -1;
    } else if (a->length > b->length) {
        return 1;
    }
    
    // Same length, compare byte by byte from most significant to least
    for (size_t i = 0; i < a->length; i++) {
        size_t idx = a->length - 1 - i; // Start from most significant byte
        if (a->data[idx] < b->data[idx]) {
            return -1;
        } else if (a->data[idx] > b->data[idx]) {
            return 1;
        }
    }
    
    // Equal
    return 0;
}

/**
 * @brief Calculate the modular inverse of a BigInt
 *
 * This function calculates the modular inverse of a BigInt using the extended Euclidean algorithm.
 *
 * @param a The BigInt to find the inverse of
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 if inverse does not exist
 */
int modular_inverse(const BigInt* a, const BigInt* modulus, BigInt* result) {
    if (!a || !modulus || !result) {
        fprintf(stderr, "[ERROR] Invalid parameters in modular_inverse\n");
        return -1;
    }

    fprintf(stderr, "[DEBUG] Starting modular inverse calculation\n");

    // Initialize variables for extended Euclidean algorithm
    BigInt old_r = create_bigint(modulus->data, modulus->length);
    BigInt r = create_bigint(a->data, a->length);
    
    uint8_t one_val = 1;
    uint8_t zero_val = 0;
    BigInt old_s = create_bigint(&zero_val, 1);
    BigInt s = create_bigint(&one_val, 1);
    
    fprintf(stderr, "[DEBUG] Initialized variables for extended Euclidean algorithm\n");

    // Extended Euclidean algorithm
    while (r.length > 1 || (r.length == 1 && r.data[0] != 0)) {
        // Calculate quotient and remainder
        BigInt quotient = {NULL, 0};
        BigInt temp_r = {NULL, 0};
        
        // Perform division to get quotient and remainder
        if (bigint_divide(&old_r, &r, &quotient, &temp_r) != 0) {
            fprintf(stderr, "[ERROR] Division failed in modular_inverse\n");
            free_bigint(&old_r);
            free_bigint(&r);
            free_bigint(&old_s);
            free_bigint(&s);
            return -2;
        }

        // Update r values: old_r = r, r = temp_r
        free_bigint(&old_r);
        old_r = r;
        r = temp_r;

        // Calculate new s: temp_s = old_s - quotient * s
        BigInt temp_product = {NULL, 0};
        if (multiply_bigint(&quotient, &s, &temp_product) != 0) {
            fprintf(stderr, "[ERROR] Multiplication failed in modular_inverse\n");
            free_bigint(&old_r);
            free_bigint(&r);
            free_bigint(&old_s);
            free_bigint(&s);
            free_bigint(&quotient);
            return -2;
        }

        BigInt temp_s = {NULL, 0};
        if (bigint_subtract(&old_s, &temp_product, &temp_s) != 0) {
            fprintf(stderr, "[ERROR] Subtraction failed in modular_inverse\n");
            free_bigint(&old_r);
            free_bigint(&r);
            free_bigint(&old_s);
            free_bigint(&s);
            free_bigint(&quotient);
            free_bigint(&temp_product);
            return -2;
        }

        // Update s values: old_s = s, s = temp_s
        free_bigint(&old_s);
        old_s = s;
        s = temp_s;

        free_bigint(&quotient);
        free_bigint(&temp_product);
    }

    // Check if inverse exists (gcd should be 1)
    BigInt one = create_bigint(&one_val, 1);
    if (compare_bigint(&old_r, &one) != 0) {
        fprintf(stderr, "[ERROR] Modular inverse does not exist\n");
        free_bigint(&old_r);
        free_bigint(&r);
        free_bigint(&old_s);
        free_bigint(&s);
        free_bigint(&one);
        return -3;
    }
    free_bigint(&one);

    // Make sure the result is positive
    while (old_s.length > 0 && old_s.data[old_s.length - 1] & 0x80) {
        BigInt temp = {NULL, 0};
        if (modular_addition(&old_s, modulus, modulus, &temp) != 0) {
            fprintf(stderr, "[ERROR] Failed to make result positive\n");
            free_bigint(&old_r);
            free_bigint(&r);
            free_bigint(&old_s);
            free_bigint(&s);
            return -2;
        }
        free_bigint(&old_s);
        old_s = temp;
    }

    // Copy the result
    *result = create_bigint(old_s.data, old_s.length);

    // Clean up
    free_bigint(&old_r);
    free_bigint(&r);
    free_bigint(&old_s);
    free_bigint(&s);

    fprintf(stderr, "[DEBUG] Modular inverse calculation completed successfully\n");
    return 0;
}


/**
 * @brief Subtract two BigInts: result = a - b
 *
 * This function subtracts two BigInts with proper borrow handling and leading zero removal.
 * It ensures that a >= b before performing the subtraction.
 *
 * @param a First operand (minuend)
 * @param b Second operand (subtrahend)
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int bigint_subtract(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        fprintf(stderr, "[ERROR] Invalid parameters in bigint_subtract\n");
        return -1;
    }

    // Check if a >= b
    if (compare_bigint(a, b) < 0) {
        fprintf(stderr, "[ERROR] First operand must be greater than or equal to second operand\n");
        return -1;
    }

    // Allocate memory for the result
    BigInt temp = create_bigint(NULL, a->length);
    if (!temp.data) {
        fprintf(stderr, "[ERROR] Memory allocation failed in bigint_subtract\n");
        return -2;
    }

    // Perform subtraction with borrow handling
    int borrow = 0;
    for (size_t i = 0; i < a->length; i++) {
        int diff = a->data[i] - (i < b->length ? b->data[i] : 0) - borrow;
        if (diff < 0) {
            diff += 256; // Add base (256 for bytes)
            borrow = 1;
        } else {
            borrow = 0;
        }
        temp.data[i] = (uint8_t)diff;
    }

    // Remove leading zeros
    while (temp.length > 1 && temp.data[temp.length - 1] == 0) {
        temp.length--;
    }

    // Copy the result
    *result = create_bigint(temp.data, temp.length);

    // Clean up
    free_bigint(&temp);

    return 0;
}

/**
 * @brief Divide two BigInts: quotient = a / b, remainder = a % b
 *
 * This function performs division of two BigInts using an optimized repeated subtraction
 * algorithm. It handles edge cases like division by zero and ensures proper memory management.
 *
 * @param a First operand (dividend)
 * @param b Second operand (divisor)
 * @param quotient Pointer to store the division result
 * @param remainder Pointer to store the remainder
 * @return 0 on success, -1 on invalid parameters, -2 on division by zero
 */
int bigint_divide(const BigInt* a, const BigInt* b, BigInt* quotient, BigInt* remainder) {
    if (!a || !b || !quotient || !remainder) {
        fprintf(stderr, "[ERROR] Invalid parameters in bigint_divide\n");
        return -1;
    }

    // Check for division by zero
    uint8_t zero = 0;
    BigInt zero_bigint = create_bigint(&zero, 1);
    if (compare_bigint(b, &zero_bigint) == 0) {
        fprintf(stderr, "[ERROR] Division by zero\n");
        free_bigint(&zero_bigint);
        return -2;
    }
    free_bigint(&zero_bigint);

    // Initialize quotient to 0 and remainder to a
    uint8_t zero_val = 0;
    *quotient = create_bigint(&zero_val, 1);
    *remainder = create_bigint(a->data, a->length);

    // If a < b, quotient is 0 and remainder is a
    if (compare_bigint(a, b) < 0) {
        return 0;
    }

    // Initialize temporary variables for the division process
    BigInt current_multiple = create_bigint(b->data, b->length);
    BigInt next_multiple = create_bigint(NULL, b->length + 1);
    BigInt quotient_part = create_bigint(&zero_val, 1);
    uint8_t one_val = 1;
    BigInt one = create_bigint(&one_val, 1);

    // Find the largest multiple of b that's <= a
    while (compare_bigint(&current_multiple, remainder) <= 0) {
        // Save current values
        BigInt temp_multiple = current_multiple;
        BigInt temp_quotient_part = quotient_part;

        // Double the values
        multiply_bigint(&current_multiple, &one, &next_multiple);
        multiply_bigint(&quotient_part, &one, &quotient_part);

        // If next multiple would be too large, use current values
        if (compare_bigint(&next_multiple, remainder) > 0) {
            // Subtract current multiple from remainder
            BigInt new_remainder;
            bigint_subtract(remainder, &temp_multiple, &new_remainder);
            free_bigint(remainder);
            *remainder = new_remainder;

            // Add current quotient part to result
            BigInt new_quotient;
            modular_addition(quotient, &temp_quotient_part, b, &new_quotient);
            free_bigint(quotient);
            *quotient = new_quotient;

            // Reset for next iteration
            current_multiple = create_bigint(b->data, b->length);
            quotient_part = create_bigint(&one_val, 1);
        } else {
            current_multiple = next_multiple;
            free_bigint(&temp_multiple);
            free_bigint(&temp_quotient_part);
        }
    }

    // Clean up
    free_bigint(&current_multiple);
    free_bigint(&next_multiple);
    free_bigint(&quotient_part);
    free_bigint(&one);

    return 0;
}

/**
 * @brief Multiply two BigInts: result = a * b
 *
 * This function multiplies two BigInts without modular reduction.
 *
 * @param a First operand
 * @param b Second operand
 * @param result Pointer to store the result of a * b
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int multiply_bigint(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    // Allocate memory for the product (needs a->length + b->length bytes)
    size_t product_len = a->length + b->length;
    uint8_t* product = (uint8_t*)calloc(product_len, 1);
    
    if (!product) {
        return -2; // Memory allocation failed
    }
    
    // Multiply the two numbers
    for (size_t i = 0; i < a->length; i++) {
        uint16_t carry = 0;
        for (size_t j = 0; j < b->length || carry; j++) {
            uint16_t current = product[i + j];
            
            if (j < b->length) {
                current += (uint16_t)a->data[i] * b->data[j];
            }
            
            current += carry;
            product[i + j] = current & 0xFF;
            carry = current >> 8;
        }
    }
    
    // Remove leading zeros
    size_t actual_length = product_len;
    while (actual_length > 1 && product[actual_length - 1] == 0) {
        actual_length--;
    }
    
    // Create the result BigInt
    *result = create_bigint(product, actual_length);
    
    // Clean up
    free(product);
    
    return 0;
}


/**
 * @brief Convert BigInt to hexadecimal string
 *
 * This function converts a BigInt to a hexadecimal string representation.
 *
 * @param bigint Pointer to the BigInt to convert
 * @param hex_str Buffer to store the hex string
 * @param str_size Size of the buffer
 * @return 0 on success, -1 on invalid parameters, -2 if buffer is too small
 */
int bigint_to_hex_string(const BigInt* bigint, char* hex_str, size_t str_size) {
    if (!bigint || !hex_str || str_size == 0) {
        return -1; // Invalid parameters
    }
    
    // Check if the buffer is large enough (2 chars per byte + null terminator)
    if (str_size < bigint->length * 2 + 1) {
        return -2; // Buffer too small
    }
    
    // Convert each byte to hex
    for (size_t i = 0; i < bigint->length; i++) {
        sprintf(hex_str + i * 2, "%02x", bigint->data[i]);
    }
    
    // Ensure null termination
    hex_str[bigint->length * 2] = '\0';
    
    return 0;
}

/**
 * @brief Convert hexadecimal string to BigInt
 *
 * This function converts a hexadecimal string to a BigInt representation.
 *
 * @param hex_str The hex string to convert
 * @param bigint Pointer to store the converted BigInt
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int hex_string_to_bigint(const char* hex_str, BigInt* bigint) {
    if (!hex_str || !bigint) {
        return -1; // Invalid parameters
    }
    
    // Calculate the length of the hex string
    size_t hex_len = strlen(hex_str);
    
    // Ensure the hex string has an even number of characters
    if (hex_len % 2 != 0) {
        return -1; // Invalid hex string length
    }
    
    // Calculate the number of bytes needed
    size_t byte_len = hex_len / 2;
    
    // Allocate memory for the BigInt data
    uint8_t* data = (uint8_t*)malloc(byte_len);
    if (!data) {
        return -2; // Memory allocation failed
    }
    
    // Convert hex string to bytes
    for (size_t i = 0; i < byte_len; i++) {
        char byte_str[3] = {hex_str[i * 2], hex_str[i * 2 + 1], '\0'};
        data[i] = (uint8_t)strtol(byte_str, NULL, 16);
    }
    
    // Create the BigInt
    bigint->data = data;
    bigint->length = byte_len;
    
    return 0;
}

/**
 * @brief Calculate the modulus of one BigInt by another: result = a mod modulus
 *
 * This function calculates the remainder when dividing a by modulus.
 * It efficiently handles the case where a is already less than modulus.
 *
 * @param a The BigInt to find the modulus of
 * @param modulus The modulus value
 * @param result Pointer to store the result
 * @return 0 on success, -1 on invalid parameters, -2 on memory allocation failure
 */
int bigint_mod(const BigInt* a, const BigInt* modulus, BigInt* result) {
    if (!a || !modulus || !result) {
        fprintf(stderr, "[ERROR] Invalid parameters in bigint_mod\n");
        return -1; // Invalid parameters
    }
    
    // Check if modulus is zero
    uint8_t zero_val = 0;
    BigInt zero = create_bigint(&zero_val, 1);
    if (compare_bigint(modulus, &zero) == 0) {
        fprintf(stderr, "[ERROR] Division by zero in bigint_mod\n");
        free_bigint(&zero);
        return -1; // Division by zero
    }
    free_bigint(&zero);
    
    // If a is already less than modulus, just copy a to result
    if (compare_bigint(a, modulus) < 0) {
        fprintf(stderr, "[DEBUG] Value already smaller than modulus, copying directly\n");
        *result = create_bigint(a->data, a->length);
        return 0;
    }
    
    fprintf(stderr, "[DEBUG] Starting improved modular reduction algorithm\n");
    
    // Create a copy of a for calculations
    BigInt a_copy = create_bigint(a->data, a->length);
    
    // Improved modular reduction algorithm with iteration limit
    int iteration_count = 0;
    const int MAX_ITERATIONS = 10000; // Set a reasonable limit
    
    // First, try direct subtraction for small values
    if (a->length <= modulus->length + 1) {
        fprintf(stderr, "[DEBUG] Using direct subtraction for small values\n");
        while (compare_bigint(&a_copy, modulus) >= 0) {
            // Simple subtraction for small values
            BigInt temp;
            temp.length = a_copy.length;
            temp.data = (uint8_t*)calloc(temp.length, 1);
            if (!temp.data) {
                fprintf(stderr, "[ERROR] Memory allocation failed in bigint_mod\n");
                free_bigint(&a_copy);
                return -2; // Memory allocation failure
            }
            
            int borrow = 0;
            for (size_t i = 0; i < a_copy.length; i++) {
                int diff = (int)a_copy.data[i] - borrow;
                if (i < modulus->length) {
                    diff -= modulus->data[i];
                }
                
                if (diff < 0) {
                    diff += 256;
                    borrow = 1;
                } else {
                    borrow = 0;
                }
                
                temp.data[i] = (uint8_t)diff;
            }
            
            // Remove leading zeros
            while (temp.length > 1 && temp.data[temp.length - 1] == 0) {
                temp.length--;
            }
            
            free_bigint(&a_copy);
            a_copy = temp;
            
            iteration_count++;
            if (iteration_count > MAX_ITERATIONS) {
                fprintf(stderr, "[ERROR] Exceeded maximum iterations (%d) in bigint_mod\n", MAX_ITERATIONS);
                free_bigint(&a_copy);
                return -2; // Exceeded iteration limit
            }
        }
    } else {
        fprintf(stderr, "[DEBUG] Using binary long division for large values\n");
        // For larger values, use binary long division approach
        while (compare_bigint(&a_copy, modulus) >= 0) {
            // Find the largest multiple of modulus that is less than or equal to a_copy
            // Calculate approximate bit difference to optimize the process
            int bit_diff = (a_copy.length - modulus->length) * 8;
            if (bit_diff < 0) bit_diff = 0;
            
            // Start with a copy of the modulus
            BigInt shifted_modulus = create_bigint(modulus->data, modulus->length);
            
            // Pre-shift to get closer to the target value faster
            if (bit_diff > 8) {
                // Shift by bytes first (much faster)
                size_t byte_shift = bit_diff / 8;
                BigInt byte_shifted = create_bigint(NULL, modulus->length + byte_shift);
                if (!byte_shifted.data) {
                    fprintf(stderr, "[ERROR] Memory allocation failed during byte shifting\n");
                    free_bigint(&a_copy);
                    free_bigint(&shifted_modulus);
                    return -2;
                }
                
                // Copy modulus data with byte shift
                memset(byte_shifted.data, 0, byte_shift);
                memcpy(byte_shifted.data + byte_shift, modulus->data, modulus->length);
                
                free_bigint(&shifted_modulus);
                shifted_modulus = byte_shifted;
            }
            
            // Now do bit-by-bit shifting until we find the right value
            size_t shift = 0;
            BigInt prev_modulus;
            
            while (compare_bigint(&shifted_modulus, &a_copy) <= 0) {
                // Save the previous value before shifting
                prev_modulus = shifted_modulus;
                
                // Double the value (shift left by 1 bit)
                shifted_modulus.data = (uint8_t*)calloc(shifted_modulus.length + 1, 1);
                if (!shifted_modulus.data) {
                    fprintf(stderr, "[ERROR] Memory allocation failed during bit shifting\n");
                    free_bigint(&a_copy);
                    free_bigint(&prev_modulus);
                    return -2; // Memory allocation failure
                }
                
                uint16_t carry = 0;
                for (size_t i = 0; i < prev_modulus.length; i++) {
                    uint16_t val = ((uint16_t)prev_modulus.data[i] << 1) + carry;
                    shifted_modulus.data[i] = val & 0xFF;
                    carry = val >> 8;
                }
                
                if (carry) {
                    shifted_modulus.data[prev_modulus.length] = carry;
                    shifted_modulus.length = prev_modulus.length + 1;
                } else {
                    shifted_modulus.length = prev_modulus.length;
                }
                
                // If we've gone too far, use the previous value
                if (compare_bigint(&shifted_modulus, &a_copy) > 0) {
                    free_bigint(&shifted_modulus);
                    shifted_modulus = prev_modulus;
                    break;
                }
                
                // Otherwise, free the previous value and continue
                free_bigint(&prev_modulus);
                shift++;
                
                // Prevent infinite loops
                if (shift > 1000) {
                    fprintf(stderr, "[ERROR] Too many shifts in bigint_mod\n");
                    free_bigint(&a_copy);
                    free_bigint(&shifted_modulus);
                    return -2; // Too many shifts
                }
            }
            
            // Subtract shifted_modulus from a_copy
            BigInt temp;
            temp.length = a_copy.length;
            temp.data = (uint8_t*)calloc(temp.length, 1);
            if (!temp.data) {
                fprintf(stderr, "[ERROR] Memory allocation failed during subtraction\n");
                free_bigint(&a_copy);
                free_bigint(&shifted_modulus);
                return -2; // Memory allocation failure
            }
            
            int borrow = 0;
            for (size_t i = 0; i < a_copy.length; i++) {
                int diff = (int)a_copy.data[i] - borrow;
                if (i < shifted_modulus.length) {
                    diff -= shifted_modulus.data[i];
                }
                
                if (diff < 0) {
                    diff += 256;
                    borrow = 1;
                } else {
                    borrow = 0;
                }
                
                temp.data[i] = (uint8_t)diff;
            }
            
            // Remove leading zeros
            while (temp.length > 1 && temp.data[temp.length - 1] == 0) {
                temp.length--;
            }
            
            free_bigint(&a_copy);
            free_bigint(&shifted_modulus);
            a_copy = temp;
            
            iteration_count++;
            if (iteration_count % 100 == 0) {
                fprintf(stderr, "[DEBUG] Modular reduction iteration %d\n", iteration_count);
            }
            
            if (iteration_count > MAX_ITERATIONS) {
                fprintf(stderr, "[ERROR] Exceeded maximum iterations (%d) in bigint_mod\n", MAX_ITERATIONS);
                free_bigint(&a_copy);
                return -2; // Exceeded iteration limit
            }
        }
    }
    
    fprintf(stderr, "[DEBUG] Modular reduction completed after %d iterations\n", iteration_count);
    
    
    // Copy the result
    *result = create_bigint(a_copy.data, a_copy.length);
    
    // Clean up
    free_bigint(&a_copy);
    
    return 0;
}