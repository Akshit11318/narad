#include <curl/curl.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include "http_client.h"
#include "bigint_ops.h"

#define API_BASE_URL "http://localhost:3000/api"
#define ELECTION_PARAMS_ENDPOINT "/election/params"
#define FINAL_AUX_ENDPOINT "/auxiliary/final"
#define AUX_VALUES_ENDPOINT "/auxiliary/values"

// Structure to hold response data
struct ResponseData {
    char* data;
    size_t size;
};

// Callback function to handle response data
static size_t write_callback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t realsize = size * nmemb;
    struct ResponseData* resp = (struct ResponseData*)userp;

    char* ptr = realloc(resp->data, resp->size + realsize + 1);
    if (!ptr) {
        fprintf(stderr, "Failed to allocate memory\n");
        return 0;
    }

    resp->data = ptr;
    memcpy(&(resp->data[resp->size]), contents, realsize);
    resp->size += realsize;
    resp->data[resp->size] = 0;

    return realsize;
}

// Helper function to perform HTTP GET request
static char* http_get(const char* endpoint) {
    CURL* curl;
    CURLcode res;
    struct ResponseData resp = {0};

    curl = curl_easy_init();
    if (!curl) {
        return NULL;
    }

    char url[256];
    snprintf(url, sizeof(url), "%s%s", API_BASE_URL, endpoint);

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void*)&resp);

    res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) {
        free(resp.data);
        return NULL;
    }

    return resp.data;
}

// Helper function to perform HTTP POST request
static int http_post(const char* endpoint, const char* data) {
    CURL* curl;
    CURLcode res;
    struct curl_slist* headers = NULL;

    curl = curl_easy_init();
    if (!curl) {
        return -1;
    }

    char url[256];
    snprintf(url, sizeof(url), "%s%s", API_BASE_URL, endpoint);

    headers = curl_slist_append(headers, "Content-Type: application/json");

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);

    res = curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return (res == CURLE_OK) ? 0 : -1;
}

int fetch_election_params(ElectionParams* params) {
    char* response = http_get(ELECTION_PARAMS_ENDPOINT);
    if (!response) {
        return -1;
    }

    int result = parse_election_params_json(response, params);
    free(response);
    return result;
}

int push_final_aux_to_server(const BigInt* final_aux) {
    // Increase buffer size to handle larger hex strings (at least 2*128 + 1)
    char hex_str[2048];
    if (bigint_to_hex_string(final_aux, hex_str, sizeof(hex_str)) != 0) {
        return -1;
    }

    // Increase JSON buffer size proportionally
    char json_data[2200];
    snprintf(json_data, sizeof(json_data), "{\"final_aux\":\"%s\"}", hex_str);

    return http_post(FINAL_AUX_ENDPOINT, json_data);
}

/**
 * Parse JSON auxiliary values response and process each value
 */
static int parse_auxiliary_values(const char* json_str, int (*process_callback)(const BigInt* aux_i)) {
    // Simple JSON parsing (in a real implementation, use a proper JSON parser)
    const char* values_start = strstr(json_str, "\"values\"");
    if (!values_start) {
        fprintf(stderr, "Error: Could not find values in JSON response\n");
        return -1;
    }

    int processed_count = 0;
    const char* aux_start = values_start;
    
    while ((aux_start = strstr(aux_start, "\"aux_value\":")) != NULL) {
        aux_start += strlen("\"aux_value\":");
        // Skip whitespace and quotes
        while (*aux_start && (*aux_start == ' ' || *aux_start == '\"')) {
            aux_start++;
        }
        
        // Extract the aux_value hex string - increase buffer to handle larger values
        char aux_hex[2048] = {0};
        size_t i = 0; // Change from int to size_t to match comparison with sizeof
        while (*aux_start && *aux_start != '\"' && i < sizeof(aux_hex) - 1) {
            aux_hex[i++] = *aux_start++;
        }
        aux_hex[i] = '\0';
        
        // Convert hex string to BigInt
        BigInt aux_i;
        if (hex_string_to_bigint(aux_hex, &aux_i) != 0) {
            fprintf(stderr, "Error: Failed to convert hex string to BigInt\n");
            continue;
        }
        
        // Process this auxiliary value
        if (process_callback(&aux_i) == 0) {
            processed_count++;
        }
        
        // Free the BigInt
        free_bigint(&aux_i);
    }
    
    return processed_count;
}

int fetch_auxiliary_values(int count, int (*process_callback)(const BigInt* aux_i)) {
    if (!process_callback) {
        return -1;
    }

    char url[300];
    snprintf(url, sizeof(url), "%s?count=%d", AUX_VALUES_ENDPOINT, count);
    
    char* response = http_get(url);
    if (!response) {
        return -1;
    }

    int result = parse_auxiliary_values(response, process_callback);
    free(response);
    return result;
}