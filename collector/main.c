#include "collector.h"
#include "bigint_ops.h"
#include "http_client.h"
#include <stdio.h>
#include <string.h>

// Example function to print a BigInt in hexadecimal format
void print_bigint_hex(const char* label, const BigInt* big_int) {
    printf("%s: ", label);
    for (size_t i = 0; i < big_int->length; i++) {
        printf("%02x", big_int->data[i]);
    }
    printf("\n");
}

// Function to process an auxiliary value and print its status
int process_and_print_aux(const BigInt* aux_i) {
    static int user_count = 0;
    user_count++;
    
    // Increase the buffer size from 32 to 64 to accommodate longer strings
    char label[64];
    sprintf(label, "Received auxiliary value from user %d", user_count);
    print_bigint_hex(label, aux_i);
    
    // Process this auxiliary value in real-time
    if (process_auxiliary_value_realtime(aux_i) != 0) {
        printf("Failed to process auxiliary value from user %d\n", user_count);
        return -1;
    }
    
    // Get the current running product after processing this aux_i
    BigInt current_product;
    if (get_current_auxiliary_product(&current_product) != 0) {
        printf("Failed to get current auxiliary product\n");
        return -1;
    }
    
    sprintf(label, "Current running product after user %d", user_count);
    print_bigint_hex(label, &current_product);
    
    free_bigint(&current_product);
    printf("\n");
    
    return 0;
}

int main() {
    printf("Collector Module Demo (Real-time Processing)\n");
    printf("=========================================\n\n");
    
    // Fetch election parameters from the HTTP server
    ElectionParams params;
    if (fetch_election_params(&params) != 0) {
        printf("Failed to fetch election parameters\n");
        return 1;
    }
    
    // Initialize the collector with the fetched parameters
    if (collector_init(&params) != 0) {
        printf("Failed to initialize collector\n");
        return 1;
    }
    
    // Reset the auxiliary product to start fresh
    if (reset_auxiliary_product() != 0) {
        printf("Failed to reset auxiliary product\n");
        collector_cleanup();
        return 1;
    }
    
    printf("\nFetching and processing auxiliary values from server...\n");
    
    // Fetch auxiliary values from the server and process them
    const int num_users = 5;
    int processed = fetch_auxiliary_values(num_users, process_and_print_aux);
    
    if (processed < 0) {
        printf("Failed to fetch auxiliary values from server\n");
        collector_cleanup();
        return 1;
    }
    
    printf("Successfully processed %d auxiliary values\n\n", processed);
    
    // Get the final auxiliary value
    BigInt final_aux;
    if (get_current_auxiliary_product(&final_aux) != 0) {
        printf("Failed to get final auxiliary value\n");
        collector_cleanup();
        return 1;
    }
    
    print_bigint_hex("Final auxiliary value (aux)", &final_aux);
    
    // Push the final auxiliary value to the server
    if (push_final_aux_to_server(&final_aux) != 0) {
        printf("Failed to push final auxiliary value to server\n");
        free_bigint(&final_aux);
        collector_cleanup();
        return 1;
    }
    
    // Clean up
    free_bigint(&final_aux);
    collector_cleanup();
    
    return 0;
}