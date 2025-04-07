#include "aggregator.h"
#include "bigint_ops.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

/**
 * @brief Print a BigInt in hexadecimal format
 * @param label Label to print before the BigInt
 * @param big_int The BigInt to print
 */
void print_bigint(const char* label, const BigInt* big_int) {
    printf("%s: ", label);
    for (size_t i = 0; i < big_int->length; i++) {
        printf("%02x", big_int->data[big_int->length - 1 - i]);
    }
    printf("\n");
}

/**
 * @brief Create a sample ciphertext for testing
 * @param N The modulus N
 * @param N_squared N^2
 * @param H The hash function output
 * @param vote The vote value (0 or 1)
 * @return The created ciphertext
 */
BigInt create_sample_ciphertext(const BigInt* N, const BigInt* N_squared, const BigInt* H, int vote) {
    // Create (1 + vote*N)
    BigInt one_plus_vote_N;
    uint8_t* data = (uint8_t*)calloc(N_squared->length, 1);
    if (!data) {
        // Return an empty BigInt on failure
        BigInt empty = {NULL, 0};
        return empty;
    }
    
    // Set the first byte to 1
    data[0] = 1;
    
    // If vote is 1, add N
    if (vote == 1) {
        for (size_t i = 0; i < N->length; i++) {
            data[i] += N->data[i];
            if (data[i] < N->data[i] && i + 1 < N_squared->length) {
                // Handle carry
                data[i + 1]++;
            }
        }
    }
    
    one_plus_vote_N = create_bigint(data, N_squared->length);
    free(data);
    
    // Create a random sk_i
    BigInt sk_i;
    generate_random_coprime(&sk_i, N_squared);
    
    // Calculate H^sk_i mod N^2
    BigInt H_pow_sk_i;
    modular_exponentiation(H, &sk_i, N_squared, &H_pow_sk_i);
    
    // Calculate (1 + vote*N) * H^sk_i mod N^2
    BigInt ciphertext;
    modular_multiplication(&one_plus_vote_N, &H_pow_sk_i, N_squared, &ciphertext);
    
    // Clean up
    free_bigint(&one_plus_vote_N);
    free_bigint(&sk_i);
    free_bigint(&H_pow_sk_i);
    
    return ciphertext;
}

/**
 * @brief Create a sample auxiliary value for testing
 * @param H The hash function output
 * @param sk_A The aggregator's secret key
 * @param N_squared N^2
 * @param count Number of votes
 * @return The created auxiliary value
 */
BigInt create_sample_auxiliary(const BigInt* H, const BigInt* sk_A, const BigInt* N_squared, size_t count) {
    // Create a random sum of sk_i values scaled by count
    BigInt sum_sk_i;
    generate_random_coprime(&sum_sk_i, N_squared);
    
    // Scale sum_sk_i by count to simulate multiple votes
    for (size_t i = 1; i < count; i++) {
        BigInt temp;
        modular_addition(&sum_sk_i, &sum_sk_i, N_squared, &temp);
        free_bigint(&sum_sk_i);
        sum_sk_i = temp;
    }
    
    // Calculate H^(sk_A * sum_sk_i) mod N^2
    BigInt sk_A_times_sum_sk_i;
    modular_multiplication(sk_A, &sum_sk_i, N_squared, &sk_A_times_sum_sk_i);
    
    BigInt aux;
    modular_exponentiation(H, &sk_A_times_sum_sk_i, N_squared, &aux);
    
    // Clean up
    free_bigint(&sum_sk_i);
    free_bigint(&sk_A_times_sum_sk_i);
    
    return aux;
}

int main() {
    printf("Secure Aggregation Demo\n");
    printf("=======================\n\n");
    
    // Seed the random number generator
    srand((unsigned int)time(NULL));
    
    // Create sample parameters
    // In a real implementation, these would be generated securely
    uint8_t N_data[] = {0x97, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF};
    BigInt N = create_bigint(N_data, sizeof(N_data));
    
    uint8_t H_data[] = {0x13, 0x57, 0x9B, 0xDF, 0x24, 0x68, 0xAC, 0xE0};
    BigInt H = create_bigint(H_data, sizeof(H_data));
    
    uint8_t sk_A_data[] = {0x42, 0x86, 0xCA, 0x0E, 0x53, 0x97, 0xDB, 0x1F};
    BigInt sk_A = create_bigint(sk_A_data, sizeof(sk_A_data));
    
    // Initialize the aggregator
    AggregatorParams params;
    if (aggregator_init(&params, &N, &H, &sk_A) != 0) {
        printf("Failed to initialize aggregator\n");
        return 1;
    }
    
    printf("Aggregator initialized successfully\n");
    print_bigint("N", &params.N);
    print_bigint("N^2", &params.N_squared);
    print_bigint("H", &params.H);
    print_bigint("sk_A", &params.sk_A);
    print_bigint("sk_A mod N", &params.sk_A_mod_N);
    print_bigint("(sk_A mod N)^-1", &params.sk_A_inv);
    printf("\n");
    
    // Create sample votes (3 votes: 1, 0, 1)
    const size_t num_votes = 3;
    int votes[3] = {1, 0, 1};
    BigInt ciphertexts[3];
    
    printf("Creating %zu sample votes: ", num_votes);
    for (size_t i = 0; i < num_votes; i++) {
        printf("%d ", votes[i]);
        ciphertexts[i] = create_sample_ciphertext(&params.N, &params.N_squared, &params.H, votes[i]);
    }
    printf("\n\n");
    
    // Create a sample auxiliary value
    BigInt aux = create_sample_auxiliary(&params.H, &params.sk_A, &params.N_squared, num_votes);
    printf("Created sample auxiliary value\n");
    print_bigint("aux", &aux);
    printf("\n");
    
    // Aggregate the votes
    BigInt sum, average;
    if (aggregate_votes(ciphertexts, num_votes, &aux, &params, &sum, &average) != 0) {
        printf("Failed to aggregate votes\n");
        
        // Clean up before returning
        free_bigint(&params.N);
        free_bigint(&params.N_squared);
        free_bigint(&params.H);
        free_bigint(&params.sk_A);
        free_bigint(&params.sk_A_mod_N);
        free_bigint(&params.sk_A_inv);
        
        for (size_t i = 0; i < num_votes; i++) {
            free_bigint(&ciphertexts[i]);
        }
        
        free_bigint(&aux);
        
        return 1;
    }
    
    printf("Votes aggregated successfully\n");
    print_bigint("Sum", &sum);
    print_bigint("Average", &average);
    printf("\n");
    
    // Clean up
    free_bigint(&params.N);
    free_bigint(&params.N_squared);
    free_bigint(&params.H);
    free_bigint(&params.sk_A);
    free_bigint(&params.sk_A_mod_N);
    free_bigint(&params.sk_A_inv);
    
    for (size_t i = 0; i < num_votes; i++) {
        free_bigint(&ciphertexts[i]);
    }
    
    free_bigint(&aux);
    free_bigint(&sum);
    free_bigint(&average);
    
    return 0;
}