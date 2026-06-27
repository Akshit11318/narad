#include "aggregator.h"
#include "bigint_ops.h"
#include <string.h>
#include <stdio.h>

int aggregator_init(AggregatorParams* params, const BigInt* N, const BigInt* H, const BigInt* sk_A) {
    if (!params || !N || !H || !sk_A) {
        fprintf(stderr, "[ERROR] aggregator_init: Invalid parameters\n");
        return -1; // Invalid parameters
    }
    
    fprintf(stderr, "[DEBUG] Starting aggregator initialization\n");
    
    // Validate parameters
    if (N->length == 0 || N->data == NULL) {
        fprintf(stderr, "[ERROR] N is invalid (empty)\n");
        return -10;
    }
    
    if (H->length == 0 || H->data == NULL) {
        fprintf(stderr, "[ERROR] H is invalid (empty)\n");
        return -11;
    }
    
    if (sk_A->length == 0 || sk_A->data == NULL) {
        fprintf(stderr, "[ERROR] sk_A is invalid (empty)\n");
        return -12;
    }
    
    // Copy the input parameters with explicit memory management
    fprintf(stderr, "[DEBUG] Copying N, length: %zu\n", N->length);
    params->N.length = N->length;
    params->N.data = (uint8_t*)malloc(N->length);
    if (!params->N.data) {
        fprintf(stderr, "[ERROR] Failed to allocate memory for N\n");
        return -2; // Memory allocation failed
    }
    memcpy(params->N.data, N->data, N->length);
    
    fprintf(stderr, "[DEBUG] Copying H, length: %zu\n", H->length);
    params->H.length = H->length;
    params->H.data = (uint8_t*)malloc(H->length);
    if (!params->H.data) {
        free(params->N.data);
        fprintf(stderr, "[ERROR] Failed to allocate memory for H\n");
        return -2; // Memory allocation failed
    }
    memcpy(params->H.data, H->data, H->length);
    
    fprintf(stderr, "[DEBUG] Copying sk_A, length: %zu\n", sk_A->length);
    params->sk_A.length = sk_A->length;
    params->sk_A.data = (uint8_t*)malloc(sk_A->length);
    if (!params->sk_A.data) {
        free(params->N.data);
        free(params->H.data);
        fprintf(stderr, "[ERROR] Failed to allocate memory for sk_A\n");
        return -2; // Memory allocation failed
    }
    memcpy(params->sk_A.data, sk_A->data, sk_A->length);
    
    // Calculate N^2 manually to ensure correct handling
    fprintf(stderr, "[DEBUG] Calculating N^2\n");
    size_t n_squared_len = N->length * 2;
    uint8_t* n_squared_data = (uint8_t*)calloc(n_squared_len, 1);
    if (!n_squared_data) {
        free(params->N.data);
        free(params->H.data);
        free(params->sk_A.data);
        fprintf(stderr, "[ERROR] Failed to allocate memory for N^2\n");
        return -2; // Memory allocation failed
    }
    
    // Perform simple schoolbook multiplication for N^2
    for (size_t i = 0; i < N->length; i++) {
        uint16_t carry = 0;
        for (size_t j = 0; j < N->length; j++) {
            uint32_t prod = (uint32_t)N->data[i] * (uint32_t)N->data[j] + n_squared_data[i + j] + carry;
            n_squared_data[i + j] = prod & 0xFF;
            carry = prod >> 8;
        }
        if (carry > 0 && i + N->length < n_squared_len) {
            n_squared_data[i + N->length] += carry;
        }
    }
    
    // Trim leading zeros in N^2
    while (n_squared_len > 1 && n_squared_data[n_squared_len - 1] == 0) {
        n_squared_len--;
    }
    
    // Set N^2 in params
    params->N_squared.length = n_squared_len;
    params->N_squared.data = (uint8_t*)malloc(n_squared_len);
    if (!params->N_squared.data) {
        free(params->N.data);
        free(params->H.data);
        free(params->sk_A.data);
        free(n_squared_data);
        fprintf(stderr, "[ERROR] Failed to allocate memory for N_squared in params\n");
        return -2; // Memory allocation failed
    }
    memcpy(params->N_squared.data, n_squared_data, n_squared_len);
    free(n_squared_data);
    
    fprintf(stderr, "[DEBUG] Calculating sk_A mod N\n");
    
    // Calculate sk_A mod N (simplified approach: if sk_A < N, just copy it)
    int compare_result = compare_bigint(sk_A, N);
    if (compare_result < 0) {
        fprintf(stderr, "[DEBUG] Value already smaller than modulus, copying directly\n");
        params->sk_A_mod_N.length = sk_A->length;
        params->sk_A_mod_N.data = (uint8_t*)malloc(sk_A->length);
        if (!params->sk_A_mod_N.data) {
            free(params->N.data);
            free(params->H.data);
            free(params->sk_A.data);
            free(params->N_squared.data);
            fprintf(stderr, "[ERROR] Failed to allocate memory for sk_A_mod_N\n");
            return -2; // Memory allocation failed
        }
        memcpy(params->sk_A_mod_N.data, sk_A->data, sk_A->length);
    } else {
        fprintf(stderr, "[DEBUG] Need to perform modular reduction\n");
        // We need to perform actual modulo operation - let's use alternative approach
        BigInt result = {NULL, 0};
        if (bigint_mod(sk_A, N, &result) != 0) {
            free(params->N.data);
            free(params->H.data);
            free(params->sk_A.data);
            free(params->N_squared.data);
            fprintf(stderr, "[ERROR] Failed to compute sk_A mod N\n");
            return -3; // Failed to compute modular reduction
        }
        params->sk_A_mod_N = result;
    }
    
    fprintf(stderr, "[DEBUG] Calculating modular inverse of sk_A mod N\n");
    
    // Directly compute modular inverse using libtommath's mp_invmod
    // Skip the GCD pre-check — if inverse doesn't exist, mp_invmod will fail
    params->sk_A_inv.data = NULL;
    params->sk_A_inv.length = 0;
    
    int inv_status = modular_inverse(&params->sk_A_mod_N, N, &params->sk_A_inv);
    if (inv_status != 0) {
        free(params->N.data);
        free(params->H.data);
        free(params->sk_A.data);
        free(params->N_squared.data);
        free(params->sk_A_mod_N.data);
        fprintf(stderr, "[ERROR] Failed to compute modular inverse of sk_A: %d\n", inv_status);
        return -3;
    }
    
    fprintf(stderr, "[DEBUG] Modular inverse of sk_A computed successfully\n");
    
    fprintf(stderr, "[DEBUG] Setting up running product\n");
    
    // Initialize running product to 1
    params->running_product.length = 1;
    params->running_product.data = (uint8_t*)malloc(1);
    if (!params->running_product.data) {
        free(params->N.data);
        free(params->H.data);
        free(params->sk_A.data);
        free(params->N_squared.data);
        free(params->sk_A_mod_N.data);
        free(params->sk_A_inv.data);
        fprintf(stderr, "[ERROR] Failed to allocate memory for running_product\n");
        return -2; // Memory allocation failed
    }
    params->running_product.data[0] = 1;
    
    fprintf(stderr, "[DEBUG] Aggregator initialization complete\n");
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
        fprintf(stderr, "[ERROR] divide_out_mask: Invalid parameters\n");
        return -1; // Invalid parameters
    }
    
    fprintf(stderr, "[DEBUG] Calculating modular inverse of auxiliary value\n");
    
    // Calculate aux^-1 mod N^2
    BigInt aux_inv;
    int inv_status = modular_inverse(aux, &params->N_squared, &aux_inv);
    
    if (inv_status != 0) {
        fprintf(stderr, "[ERROR] Failed to compute modular inverse: %d\n", inv_status);
        return -2; // Failed to compute modular inverse
    }
    
    fprintf(stderr, "[DEBUG] Performing modular multiplication\n");
    
    // Calculate P * aux^-1 mod N^2
    int mult_status = modular_multiplication(P, &aux_inv, &params->N_squared, result);
    
    // Clean up
    free_bigint(&aux_inv);
    
    if (mult_status != 0) {
        fprintf(stderr, "[ERROR] Modular multiplication failed: %d\n", mult_status);
    }
    
    return mult_status;
}

int recover_sum(const BigInt* P_prime, const AggregatorParams* params, BigInt* result) {
    if (!P_prime || !params || !result) {
        fprintf(stderr, "[ERROR] recover_sum: Invalid parameters\n");
        return -1; // Invalid parameters
    }
    
    fprintf(stderr, "[DEBUG] Calculating P' - 1\n");
    
    // Step 1: Calculate P' - 1
    // Proper big integer subtraction with borrow propagation
    uint8_t* p_minus_1_data = (uint8_t*)malloc(P_prime->length);
    if (!p_minus_1_data) {
        fprintf(stderr, "[ERROR] Failed to allocate memory for P' - 1\n");
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
    
    fprintf(stderr, "[DEBUG] Dividing by N\n");
    
    // Step 2: Divide by N
    // In the Paillier cryptosystem, division by N in Z_N^2 is equivalent to
    // right-shifting the representation by the bit length of N
    BigInt div_result;
    BigInt remainder; // Required by bigint_divide function
    int div_status = bigint_divide(&P_minus_1, &params->N, &div_result, &remainder);
    
    if (div_status != 0) {
        fprintf(stderr, "[ERROR] Failed to divide by N: %d\n", div_status);
        free_bigint(&P_minus_1);
        return -3;
    }
    
    // Clean up the remainder as we don't need it
    free_bigint(&remainder);
    
    fprintf(stderr, "[DEBUG] Multiplying by modular inverse of sk_A\n");
    
    // Step 3: Multiply by (sk_A mod N)^-1 mod N
    // This gives us the sum of all votes
    int mult_status = modular_multiplication(&div_result, &params->sk_A_inv, &params->N, result);
    
    // Clean up
    free_bigint(&P_minus_1);
    free_bigint(&div_result);
    
    if (mult_status != 0) {
        fprintf(stderr, "[ERROR] Failed to multiply by modular inverse: %d\n", mult_status);
        return -4;
    }
    
    fprintf(stderr, "[DEBUG] Sum recovery completed successfully\n");
    return 0;
}

int aggregate_votes_from_running_product(const BigInt* aux, AggregatorParams* params, BigInt* sum) {
    if (!aux || !params || !sum) {
        fprintf(stderr, "[ERROR] aggregate_votes_from_running_product: Invalid parameters\n");
        return -1;
    }
    
    fprintf(stderr, "[DEBUG] Starting vote aggregation process\n");
    
    // Step 1: Get the running product (product of all ciphertexts)
    BigInt product;
    int status = get_running_product(params, &product);
    if (status != 0) {
        fprintf(stderr, "[ERROR] Failed to get running product: %d\n", status);
        return -2;
    }
    
    // Step 2: Raise the product to sk_A
    fprintf(stderr, "[DEBUG] Raising product to sk_A\n");
    BigInt P;
    status = raise_to_sk_A(&product, params, &P);
    free_bigint(&product); // Free the intermediate result
    
    if (status != 0) {
        fprintf(stderr, "[ERROR] Failed to raise product to sk_A: %d\n", status);
        return -3;
    }
    
    // Step 3: Divide out the mask using the auxiliary value
    fprintf(stderr, "[DEBUG] Dividing out the mask\n");
    BigInt P_prime;
    status = divide_out_mask(&P, aux, params, &P_prime);
    free_bigint(&P); // Free the intermediate result
    
    if (status != 0) {
        fprintf(stderr, "[ERROR] Failed to divide out mask: %d\n", status);
        return -4;
    }
    
    // Step 4 & 5: Recover the sum
    fprintf(stderr, "[DEBUG] Recovering the sum\n");
    status = recover_sum(&P_prime, params, sum);
    free_bigint(&P_prime); // Free the intermediate result
    
    if (status != 0) {
        fprintf(stderr, "[ERROR] Failed to recover sum: %d\n", status);
        return -5;
    }
    
    fprintf(stderr, "[DEBUG] Vote aggregation completed successfully\n");
    return 0;
}

/**
 * @brief Unpack votes from a BigInt result
 * @param packed_votes The BigInt containing packed votes (the sum of all votes)
 * @param votes Array to store the unpacked votes
 * @param num_candidates Number of candidates (vote slots) to unpack
 * @return Number of votes unpacked, or negative value on error
 */
int unpack_votes(const BigInt* packed_votes, uint32_t* votes, size_t num_candidates) {
    if (!packed_votes || !votes || num_candidates == 0) {
        fprintf(stderr, "[ERROR] unpack_votes: Invalid parameters\n");
        return -1; // Invalid parameters
    }
    
    // Each vote occupies 25 bits
    const size_t BITS_PER_VOTE = 25;
    const uint32_t VOTE_MASK = (1 << BITS_PER_VOTE) - 1; // Mask for 25 bits
    
    // Convert BigInt to a byte array for processing
    const uint8_t* data = packed_votes->data;
    size_t data_length = packed_votes->length;
    
    // Calculate how many votes we can extract (limited by data size and max_votes)
    size_t total_bits = data_length * 8;
    size_t possible_votes = total_bits / BITS_PER_VOTE;
    size_t votes_to_extract = num_candidates;
    
    // Extract each vote from the packed data
    for (size_t i = 0; i < votes_to_extract; i++) {
        // Calculate bit position for this vote (reverse order from packing)
        size_t vote_bit_position = (votes_to_extract - 1 - i) * BITS_PER_VOTE;
        
        // Extract the vote value
        uint32_t vote_value = 0;
        
        for (size_t bit = 0; bit < BITS_PER_VOTE; bit++) {
            size_t global_bit_pos = vote_bit_position + bit;
            size_t byte_idx = global_bit_pos / 8;
            size_t bit_idx = global_bit_pos % 8;
            
            if (byte_idx < data_length) {
                if ((data[byte_idx] >> bit_idx) & 1) {
                    vote_value |= (1 << bit);
                }
            }
        }
        
        votes[i] = vote_value;
    }
    
    return (int)votes_to_extract;
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
