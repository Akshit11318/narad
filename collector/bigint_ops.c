#include "bigint_ops.h"
#include <string.h>
#include <stdlib.h>
#include <time.h>

// Implementation of modular exponentiation using the square-and-multiply algorithm
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

// Implementation of modular multiplication
int modular_multiplication(const BigInt* a, const BigInt* b, 
                           const BigInt* modulus, BigInt* result) {
    if (!a || !b || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    // This is a simplified implementation
    // In a real-world scenario, you would use a library like GMP for big integer operations
    
    // Allocate memory for the product (needs twice the size)
    // Ensure we allocate enough space - use max of (a+b length) or (2*modulus length)
    size_t product_len = a->length + b->length;
    if (modulus->length * 2 > product_len) {
        product_len = modulus->length * 2;
    }
    
    uint8_t* product = (uint8_t*)calloc(product_len, 1);
    
    if (!product) {
        return -1; // Memory allocation failed
    }
    
    // Multiply the two numbers (simplified - not efficient for large numbers)
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
    
    // For now, we'll just create a BigInt from the product
    BigInt product_bigint;
    product_bigint.data = product;
    product_bigint.length = product_len;
    
    // Remove leading zeros
    while (product_bigint.length > 1 && product_bigint.data[product_bigint.length - 1] == 0) {
        product_bigint.length--;
    }
    
    // Perform modular reduction (simplified)
    // In a real implementation, this would be more efficient
    while (compare_bigint(&product_bigint, modulus) >= 0) {
        // Subtract modulus from product
        // This is a very inefficient way to do modular reduction
        // Real implementation would use more sophisticated algorithms
        BigInt temp;
        // Subtraction implementation would go here
        // For now, we'll just set the result to a placeholder
        temp.data = (uint8_t*)malloc(1);
        temp.data[0] = 1;
        temp.length = 1;
        
        free(product_bigint.data);
        product_bigint = temp;
    }
    
    // Copy the result
    *result = create_bigint(product_bigint.data, product_bigint.length);
    
    // Clean up
    free(product_bigint.data);
    
    return 0;
}

// Generate a random number that is coprime to the given modulus
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

// Calculate the greatest common divisor (GCD) of two BigInts
int gcd(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    // Create copies of a and b
    BigInt a_copy = create_bigint(a->data, a->length);
    BigInt b_copy = create_bigint(b->data, b->length);
    
    // Euclidean algorithm
    while (b_copy.length > 1 || (b_copy.length == 1 && b_copy.data[0] != 0)) {
        // temp = a % b
        BigInt temp;
        // Modulo operation implementation would go here
        // For now, we'll just set temp to a placeholder
        temp.data = (uint8_t*)malloc(1);
        temp.data[0] = 1;
        temp.length = 1;
        
        // a = b
        free_bigint(&a_copy);
        a_copy = create_bigint(b_copy.data, b_copy.length);
        
        // b = temp
        free_bigint(&b_copy);
        b_copy = temp;
    }
    
    // Copy the result (a is the GCD)
    *result = create_bigint(a_copy.data, a_copy.length);
    
    // Clean up
    free_bigint(&a_copy);
    free_bigint(&b_copy);
    
    return 0;
}

// Compare two BigInts
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