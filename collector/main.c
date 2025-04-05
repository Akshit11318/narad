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
    
    printf("\nSimulating real-time processing of auxiliary values...\n");
    
    // Simulate receiving auxiliary values from users in real-time
    // In a real system, these would come from network requests as voters vote
    const int num_users = 3;
    
    for (int i = 0; i < num_users; i++) {
        // In a real system, these would be computed as pk_A^sk_i mod N^2
        // where sk_i is the user's private key
        uint8_t aux_data[16];
        for (int j = 0; j < 16; j++) {
            aux_data[j] = (uint8_t)(i * 16 + j);
        }
        BigInt aux_i = create_bigint(aux_data, sizeof(aux_data));
        
        char label[32];
        sprintf(label, "Received auxiliary value from user %d", i + 1);
        print_bigint_hex(label, &aux_i);
        
        // Process this auxiliary value in real-time
        if (process_auxiliary_value_realtime(&aux_i) != 0) {
            printf("Failed to process auxiliary value from user %d\n", i + 1);
            free_bigint(&aux_i);
            collector_cleanup();
            return 1;
        }
        
        // Get the current running product after processing this aux_i
        BigInt current_product;
        if (get_current_auxiliary_product(&current_product) != 0) {
            printf("Failed to get current auxiliary product\n");
            free_bigint(&aux_i);
            collector_cleanup();
            return 1;
        }
        
        sprintf(label, "Current running product after user %d", i + 1);
        print_bigint_hex(label, &current_product);
        
        free_bigint(&aux_i);
        free_bigint(&current_product);
        
        printf("\n");
    }
    
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