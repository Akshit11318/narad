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

// Implementation of plain multiplication without modular reduction
int multiply_bigint(const BigInt* a, const BigInt* b, BigInt* result) {
    if (!a || !b || !result) {
        return -1; // Invalid parameters
    }
    
    // Calculate the resulting size
    size_t result_length = a->length + b->length;
    
    // Allocate memory for the result
    uint8_t* product = (uint8_t*)calloc(result_length, 1);
    if (!product) {
        return -2; // Memory allocation failure
    }
    
    // Perform long multiplication
    for (size_t i = 0; i < a->length; i++) {
        uint16_t carry = 0;
        for (size_t j = 0; j < b->length; j++) {
            uint16_t temp = product[i + j] + (uint16_t)a->data[i] * b->data[j] + carry;
            product[i + j] = temp & 0xFF;
            carry = temp >> 8;
        }
        if (carry > 0 && i + b->length < result_length) {
            product[i + b->length] += carry;
        }
    }
    
    // Remove leading zeros
    size_t actual_length = result_length;
    while (actual_length > 1 && product[actual_length - 1] == 0) {
        actual_length--;
    }
    
    // Set up the result
    if (result->data) {
        free_bigint(result);
    }
    result->data = (uint8_t*)malloc(actual_length);
    if (!result->data) {
        free(product);
        return -2; // Memory allocation failure
    }
    
    result->length = actual_length;
    memcpy(result->data, product, actual_length);
    
    free(product);
    return 0;
}

// Implementation of modular addition
int modular_addition(const BigInt* a, const BigInt* b, 
                      const BigInt* modulus, BigInt* result) {
    if (!a || !b || !modulus || !result) {
        return -1; // Invalid parameters
    }
    
    // Calculate the maximum possible length for the sum
    size_t max_length = (a->length > b->length ? a->length : b->length) + 1;
    
    // Allocate memory for the temporary sum
    uint8_t* sum = (uint8_t*)calloc(max_length, 1);
    if (!sum) {
        return -2; // Memory allocation failure
    }
    
    // Perform addition with carry
    uint16_t carry = 0;
    size_t i;
    for (i = 0; i < max_length - 1; i++) {
        uint16_t a_val = (i < a->length) ? a->data[i] : 0;
        uint16_t b_val = (i < b->length) ? b->data[i] : 0;
        uint16_t temp = a_val + b_val + carry;
        sum[i] = temp & 0xFF;
        carry = temp >> 8;
    }
    sum[i] = carry;
    
    // Remove leading zeros
    size_t actual_length = max_length;
    while (actual_length > 1 && sum[actual_length - 1] == 0) {
        actual_length--;
    }
    
    // Create a temporary BigInt for the sum
    BigInt temp_sum = create_bigint(sum, actual_length);
    free(sum);
    
    // Perform modulo operation
    // For now, we'll use a simple subtraction-based approach
    while (temp_sum.length > modulus->length || 
           (temp_sum.length == modulus->length && 
            memcmp(temp_sum.data, modulus->data, modulus->length) >= 0)) {
        uint16_t borrow = 0;
        for (i = 0; i < temp_sum.length; i++) {
            uint16_t mod_val = (i < modulus->length) ? modulus->data[i] : 0;
            int16_t diff = temp_sum.data[i] - mod_val - borrow;
            if (diff < 0) {
                diff += 256;
                borrow = 1;
            } else {
                borrow = 0;
            }
            temp_sum.data[i] = diff;
        }
        
        // Remove leading zeros after subtraction
        while (temp_sum.length > 1 && temp_sum.data[temp_sum.length - 1] == 0) {
            temp_sum.length--;
        }
    }
    
    // Copy the result
    *result = create_bigint(temp_sum.data, temp_sum.length);
    
    // Clean up
    free_bigint(&temp_sum);
    
    return 0;
}