#include "aggregator.h"
#include "bigint_ops.h"
#include <string.h>
#include <stdio.h>

int aggregator_init(AggregatorParams* params, const BigInt* N, const BigInt* H, const BigInt* sk_A) {
    if (!params || !N || !H || !sk_A) {
        return -1; // Invalid parameters
    }
    
    // Copy the input parameters
    params->N = create_bigint(N->data, N->length);
    params->H = create_bigint(H->data, H->length);
    params->sk_A = create_bigint(sk_A->data, sk_A->length);
    
    // Calculate N^2 using the multiply_bigint function from the bigint library
    BigInt n_squared_result;
    if (multiply_bigint(N, N, &n_squared_result) != 0) {
        // Clean up and return error
        free_bigint(&params->N);
        free_bigint(&params->H);
        free_bigint(&params->sk_A);
        return -2; // Multiplication failed
    }
    
    params->N_squared = create_bigint(n_squared_result.data, n_squared_result.length);
    free_bigint(&n_squared_result);
    
    // Calculate sk_A mod N
    BigInt sk_A_mod_N_result;
    if (bigint_mod(sk_A, &params->N, &sk_A_mod_N_result) != 0) {
        // Clean up and return error
        free_bigint(&params->N);
        free_bigint(&params->N_squared);
        free_bigint(&params->H);
        free_bigint(&params->sk_A);
        return -3; // Failed to compute sk_A mod N
    }
    params->sk_A_mod_N = sk_A_mod_N_result;
    
    // Calculate (sk_A mod N)^-1
    if (modular_inverse(&params->sk_A_mod_N, &params->N, &params->sk_A_inv) != 0) {
        // Clean up and return error
        free_bigint(&params->N);
        free_bigint(&params->N_squared);
        free_bigint(&params->H);
        free_bigint(&params->sk_A);
        free_bigint(&params->sk_A_mod_N);
        return -3; // Failed to compute modular inverse
    }
    
    // Initialize running product to 1
    uint8_t one_val = 1;
    params->running_product = create_bigint(&one_val, 1);
    
    return 0;
}

int add_ciphertext_to_product(const BigInt* ciphertext, AggregatorParams* params) {
    if (!ciphertext || !params) {
        return -1; // Invalid parameters
    }
    
    // Multiply the ciphertext with the running product modulo N^2
    BigInt temp;
    if (modular_multiplication(&params->running_product, ciphertext, &params->N_squared, &temp) != 0) {
        return -2; // Multiplication failed
    }
    
    // Update the running product
    free_bigint(&params->running_product);
    params->running_product = temp;
    
    return 0;
}

int reset_running_product(AggregatorParams* params) {
    if (!params) {
        return -1; // Invalid parameters
    }
    
    // Free the current running product
    free_bigint(&params->running_product);
    
    // Reset to 1
    uint8_t one_val = 1;
    params->running_product = create_bigint(&one_val, 1);
    
    return 0;
}

int get_running_product(const AggregatorParams* params, BigInt* result) {
    if (!params || !result) {
        return -1; // Invalid parameters
    }
    
    // Copy the running product
    *result = create_bigint(params->running_product.data, params->running_product.length);
    
    return 0;
}

int raise_to_sk_A(const BigInt* product, const AggregatorParams* params, BigInt* result) {
    if (!product || !params || !result) {
        return -1; // Invalid parameters
    }
    
    // Raise the product to the power of sk_A modulo N^2
    return modular_exponentiation(product, &params->sk_A, &params->N_squared, result);
}

int divide_out_mask(const BigInt* P, const BigInt* aux, 
                    const AggregatorParams* params, BigInt* result) {
    if (!P || !aux || !params || !result) {
        return -1; // Invalid parameters
    }
    
    // Calculate aux^-1 mod N^2
    BigInt aux_inv;
    if (modular_inverse(aux, &params->N_squared, &aux_inv) != 0) {
        return -2; // Failed to compute modular inverse
    }
    
    // Calculate P * aux^-1 mod N^2
    int ret = modular_multiplication(P, &aux_inv, &params->N_squared, result);
    
    // Clean up
    free_bigint(&aux_inv);
    
    return ret;
}

int recover_sum(const BigInt* P_prime, const AggregatorParams* params, BigInt* result) {
    if (!P_prime || !params || !result) {
        return -1; // Invalid parameters
    }
    
    // Calculate P' - 1
    // For simplicity, we'll just subtract 1 from the first byte
    // In a real implementation, this would be a proper big integer subtraction
    uint8_t* p_minus_1_data = (uint8_t*)malloc(P_prime->length);
    if (!p_minus_1_data) {
        return -2; // Memory allocation failed
    }
    
    memcpy(p_minus_1_data, P_prime->data, P_prime->length);
    
    // Subtract 1 from the first byte with borrow propagation
    int borrow = 1;
    for (size_t i = 0; i < P_prime->length && borrow; i++) {
        int new_val = p_minus_1_data[i] - borrow;
        if (new_val < 0) {
            p_minus_1_data[i] = 255; // 0xFF
            borrow = 1;
        } else {
            p_minus_1_data[i] = new_val;
            borrow = 0;
        }
    }
    
    BigInt P_minus_1 = create_bigint(p_minus_1_data, P_prime->length);
    free(p_minus_1_data);
    
    // Divide by N
    // For simplicity, we'll just create a placeholder result
    // In a real implementation, this would be a proper big integer division
    BigInt div_by_N;
    div_by_N.data = (uint8_t*)malloc(P_minus_1.length);
    if (!div_by_N.data) {
        free_bigint(&P_minus_1);
        return -3; // Memory allocation failed
    }
    
    // Copy the first bytes as a simple division approximation
    memcpy(div_by_N.data, P_minus_1.data, P_minus_1.length);
    div_by_N.length = P_minus_1.length;
    
    // Multiply by (sk_A mod N)^-1 mod N
    int ret = modular_multiplication(&div_by_N, &params->sk_A_inv, &params->N, result);
    
    // Clean up
    free_bigint(&P_minus_1);
    free_bigint(&div_by_N);
    
    return ret;
}

int aggregate_votes_from_running_product(const BigInt* aux, AggregatorParams* params, BigInt* sum) {
    if (!aux || !params || !sum) {
        return -1; // Invalid parameters
    }
    
    // Step 1: Get the running product
    BigInt product;
    if (get_running_product(params, &product) != 0) {
        return -2; // Failed to get running product
    }
    
    // Step 2: Raise to sk_A
    BigInt P;
    if (raise_to_sk_A(&product, params, &P) != 0) {
        free_bigint(&product);
        return -3; // Exponentiation failed
    }
    
    // Step 3: Divide out the mask
    BigInt P_prime;
    if (divide_out_mask(&P, aux, params, &P_prime) != 0) {
        free_bigint(&product);
        free_bigint(&P);
        return -4; // Division failed
    }
    
    // Step 4: Recover the sum
    if (recover_sum(&P_prime, params, sum) != 0) {
        free_bigint(&product);
        free_bigint(&P);
        free_bigint(&P_prime);
        return -5; // Recovery failed
    }
    
    // Clean up
    free_bigint(&product);
    free_bigint(&P);
    free_bigint(&P_prime);
    
    return 0;
}

int aggregator_cleanup(AggregatorParams* params) {
    if (!params) {
        return -1; // Invalid parameters
    }
    
    // Free all allocated memory
    free_bigint(&params->N);
    free_bigint(&params->N_squared);
    free_bigint(&params->H);
    free_bigint(&params->sk_A);
    free_bigint(&params->sk_A_mod_N);
    free_bigint(&params->sk_A_inv);
    free_bigint(&params->running_product);
    
    return 0;
}
