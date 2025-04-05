#include "collector.h"
#include "bigint_ops.h"
#include <string.h>
#include <stdio.h>

// Static variables to hold the collector's state
static ElectionParams g_params;
static BigInt g_running_product;
static int g_initialized = 0;
static int g_product_initialized = 0;

int collector_init(const ElectionParams* params) {
    if (!params) {
        return -1; // Invalid parameters
    }
    
    // Copy the election parameters
    g_params.N = create_bigint(params->N.data, params->N.length);
    g_params.N_squared = create_bigint(params->N_squared.data, params->N_squared.length);
    g_params.H = create_bigint(params->H.data, params->H.length);
    
    // Initialize the running product to 1
    uint8_t one_val = 1;
    g_running_product = create_bigint(&one_val, 1);
    g_product_initialized = 1;
    
    g_initialized = 1;
    return 0;
}

int process_auxiliary_value_realtime(const BigInt* aux_i) {
    if (!aux_i || !g_initialized || !g_product_initialized) {
        return -1; // Invalid parameters or collector not initialized
    }
    
    // Multiply the running product by aux_i: g_running_product = g_running_product * aux_i mod N^2
    return modular_multiplication(&g_running_product, aux_i, &g_params.N_squared, &g_running_product);
}

int get_current_auxiliary_product(BigInt* result) {
    if (!result || !g_initialized || !g_product_initialized) {
        return -1; // Invalid parameters or collector not initialized
    }
    
    // Copy the current running product
    *result = create_bigint(g_running_product.data, g_running_product.length);
    
    return 0;
}

int reset_auxiliary_product(void) {
    if (!g_initialized) {
        return -1; // Collector not initialized
    }
    
    // Free the current running product
    if (g_product_initialized) {
        free_bigint(&g_running_product);
    }
    
    // Reset to 1
    uint8_t one = 1;
    g_running_product = create_bigint(&one, 1);
    g_product_initialized = 1;
    
    return 0;
}

int collector_cleanup(void) {
    if (!g_initialized) {
        return 0; // Nothing to clean up
    }
    
    // Free the global parameters
    free_bigint(&g_params.N);
    free_bigint(&g_params.N_squared);
    free_bigint(&g_params.H);
    
    // Free the running product
    if (g_product_initialized) {
        free_bigint(&g_running_product);
        g_product_initialized = 0;
    }
    
    g_initialized = 0;
    return 0;
}

BigInt create_bigint(const uint8_t* data, size_t length) {
    BigInt result;
    
    result.length = length;
    result.data = (uint8_t*)malloc(length);
    
    if (result.data) {
        memcpy(result.data, data, length);
    } else {
        // Handle allocation failure
        result.length = 0;
    }
    
    return result;
}

void free_bigint(BigInt* big_int) {
    if (big_int && big_int->data) {
        // Securely wipe the memory before freeing
        // This is important for sensitive cryptographic data
        memset(big_int->data, 0, big_int->length);
        free(big_int->data);
        big_int->data = NULL;
        big_int->length = 0;
    }
}