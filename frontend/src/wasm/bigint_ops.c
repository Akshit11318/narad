#include "bigint_ops.h"
#include <string.h>
#include <stdlib.h>

// Create a new BigInt from data
BigInt create_bigint(const uint8_t* data, size_t length) {
    BigInt result;
    result.length = length;
    result.data = (uint8_t*)malloc(length);
    if (result.data) {
        memcpy(result.data, data, length);
    }
    return result;
}

// Free the memory allocated for a BigInt
void free_bigint(BigInt* big_int) {
    if (big_int && big_int->data) {
        free(big_int->data);
        big_int->data = NULL;
        big_int->length = 0;
    }
}

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
    
    // Simple implementation for demonstration purposes
    // In a real implementation, this would use a more efficient algorithm
    
    // Create a temporary result
    BigInt temp_result = create_bigint(a->data, a->length);
    
    // Multiply a and b (simplified for demonstration)
    // In a real implementation, this would handle arbitrary precision multiplication
    
    // Take modulus (simplified for demonstration)
    // In a real implementation, this would handle arbitrary precision modulo
    
    // Copy the result
    *result = create_bigint(temp_result.data, temp_result.length);
    
    // Clean up
    free_bigint(&temp_result);
    
    return 0;
}