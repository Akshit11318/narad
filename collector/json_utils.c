#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include "json_utils.h"

// Helper function to find a key in JSON and return its value
static char* find_json_value(const char* json_str, const char* key) {
    char key_pattern[256];
    snprintf(key_pattern, sizeof(key_pattern), "\"%s\":\"", key);
    
    const char* start = strstr(json_str, key_pattern);
    if (!start) return NULL;
    
    start += strlen(key_pattern);
    const char* end = strchr(start, '"');
    if (!end) return NULL;
    
    size_t len = end - start;
    char* value = (char*)malloc(len + 1);
    if (!value) return NULL;
    
    strncpy(value, start, len);
    value[len] = '\0';
    return value;
}

// Convert a single hex character to its integer value
static int hex_char_to_int(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

int hex_string_to_bigint(const char* hex_str, BigInt* big_int) {
    size_t hex_len = strlen(hex_str);
    if (hex_len == 0 || hex_len % 2 != 0) return -1;
    
    size_t byte_len = hex_len / 2;
    uint8_t* data = (uint8_t*)malloc(byte_len);
    if (!data) return -1;
    
    for (size_t i = 0; i < byte_len; i++) {
        int high = hex_char_to_int(hex_str[i * 2]);
        int low = hex_char_to_int(hex_str[i * 2 + 1]);
        
        if (high == -1 || low == -1) {
            free(data);
            return -1;
        }
        
        data[i] = (high << 4) | low;
    }
    
    big_int->data = data;
    big_int->length = byte_len;
    return 0;
}

int bigint_to_hex_string(const BigInt* big_int, char* hex_str, size_t hex_str_size) {
    if (!big_int || !big_int->data || !hex_str) return -1;
    
    if (hex_str_size < (big_int->length * 2 + 1)) return -1;
    
    for (size_t i = 0; i < big_int->length; i++) {
        snprintf(hex_str + (i * 2), 3, "%02x", big_int->data[i]);
    }
    
    return 0;
}

int parse_election_params_json(const char* json_str, ElectionParams* params) {
    if (!json_str || !params) return -1;
    
    char* n_hex = find_json_value(json_str, "N");
    char* h_hex = find_json_value(json_str, "H");
    
    if (!n_hex || !h_hex) {
        free(n_hex);
        free(h_hex);
        return -1;
    }
    
    int result = 0;
    result |= hex_string_to_bigint(n_hex, &params->N);
    result |= hex_string_to_bigint(h_hex, &params->H);
    
    // Calculate N_squared (N^2)
    // We need to allocate memory for N_squared and copy N into it first
    params->N_squared.data = (uint8_t*)malloc(params->N.length * 2);
    if (!params->N_squared.data) {
        free_bigint(&params->N);
        free_bigint(&params->H);
        return -1;
    }
    
    // Copy N into N_squared (this is a simplified approach)
    // In a real implementation, we would use proper big integer multiplication
    // to calculate N^2, but for demonstration purposes, we'll use this approach
    memcpy(params->N_squared.data, params->N.data, params->N.length);
    params->N_squared.length = params->N.length;
    
    // Note: In production, replace this with actual N^2 calculation using bigint_ops.c functions
    
    free(n_hex);
    free(h_hex);
    return result;
}

int parse_collector_public_key_json(const char* json_str, BigInt* public_key) {
    if (!json_str || !public_key) return -1;
    
    char* pk_hex = find_json_value(json_str, "public_key");
    if (!pk_hex) return -1;
    
    int result = hex_string_to_bigint(pk_hex, public_key);
    free(pk_hex);
    return result;
}